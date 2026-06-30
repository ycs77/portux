import type { OccupancyMap } from '../types.ts'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import netstat from 'node-netstat'
import psList from 'ps-list'

const execFileAsync = promisify(execFile)

interface RawListening {
  port: number
  pid: number
}

/**
 * Parse the output of `ss -tlnp` into listening { port, pid } pairs.
 *
 * Each LISTEN line looks like:
 *   LISTEN 0 511 127.0.0.1:5173 0.0.0.0:* users:(("node",pid=37400,fd=24))
 * The process column is absent for sockets owned by other users (no privilege to
 * inspect them); such lines carry no pid and are skipped, matching the netstat path.
 */
export function parseSsOutput(text: string): RawListening[] {
  const items: RawListening[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('LISTEN')) continue

    const pidMatch = line.match(/pid=(\d+)/)
    if (!pidMatch) continue
    const pid = Number(pidMatch[1])

    // Local Address:Port is the 4th whitespace-separated column; the port is the
    // segment after the final ':' to stay correct for IPv6 addresses.
    const localAddr = line.split(/\s+/)[3]
    const port = Number(localAddr?.slice(localAddr.lastIndexOf(':') + 1))
    if (!port) continue

    items.push({ port, pid })
  }
  return items
}

/**
 * Linux source: read listening sockets via `ss -tlnp`.
 *
 * Modern Linux (incl. WSL) ships `ss` from iproute2 but often lacks `netstat`
 * (net-tools), so `ss` is the reliable primary on Linux. Rejects if `ss` is missing
 * or exits non-zero, letting the caller fall back to node-netstat.
 */
async function getListeningViaSs(): Promise<RawListening[]> {
  const { stdout } = await execFileAsync('ss', ['-tlnp'])
  return parseSsOutput(stdout)
}

/**
 * Parse the output of `lsof -iTCP -sTCP:LISTEN -P -n` into listening { port, pid } pairs.
 *
 * Every row is already filtered to LISTEN by `-sTCP:LISTEN`. Columns are:
 *   COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
 * Only PID (2nd column) and the port in NAME (last column) are read; COMMAND may contain
 * spaces (e.g. 'Google Chrome'), so the port is taken from the line's final ':' segment,
 * which also keeps IPv6 (e.g. [::1]:3000) correct.
 */
export function parseLsofOutput(text: string): RawListening[] {
  const items: RawListening[] = []
  for (const line of text.split('\n')) {
    // PID is the first all-digit column. Reading it as "column 2" would break when
    // COMMAND contains spaces (e.g. 'Google Chrome'), since COMMAND is never numeric.
    const pidMatch = line.match(/^\S.*?\s(\d+)\s/)
    if (!pidMatch) continue
    const pid = Number(pidMatch[1])

    // The port sits between the final ':' of the address and the '(LISTEN)' marker;
    // matching it this way avoids fixed column indexes and stays correct for IPv6
    // (e.g. [::1]:3000 (LISTEN)).
    const portMatch = line.match(/:(\d+)\s+\(LISTEN\)/)
    if (!portMatch) continue

    items.push({ port: Number(portMatch[1]), pid })
  }
  return items
}

/**
 * macOS source: read listening sockets via `lsof`.
 *
 * macOS ships neither `ss` nor a netstat that reports pids, but `lsof` is always present.
 * Rejects if `lsof` is missing or exits non-zero, letting the caller fall back to node-netstat.
 */
async function getListeningViaLsof(): Promise<RawListening[]> {
  const { stdout } = await execFileAsync('lsof', ['-iTCP', '-sTCP:LISTEN', '-P', '-n'])
  return parseLsofOutput(stdout)
}

/**
 * Call node-netstat once up front to get every TCP LISTENING entry (port + pid).
 *
 * Note: win32 reports 'LISTENING' at runtime while Linux usually reports 'LISTEN',
 * yet @types/node-netstat only defines 'LISTEN'. Use startsWith('LISTEN') to cover both.
 */
function getListeningViaNetstat(): Promise<RawListening[]> {
  return new Promise((resolve, reject) => {
    const items: RawListening[] = []
    netstat(
      {
        filter: { protocol: 'tcp' },
        sync: false,
        done: err => (err ? reject(new Error(err)) : resolve(items)),
      },
      item => {
        const port = item.local?.port
        if (item.state?.startsWith('LISTEN') && item.pid && port) {
          items.push({ port, pid: item.pid })
        }
      },
    )
  })
}

/**
 * Get the listening port/pid pairs from the best available source per platform.
 *
 * - Windows: node-netstat (no `ss`/`lsof`).
 * - Linux: `ss` first, node-netstat as fallback (WSL/minimal images often lack net-tools).
 * - macOS: `lsof` first, node-netstat as fallback (macOS has no `ss`).
 *
 * The platform-native tool is tried first and node-netstat catches any failure
 * (e.g. the tool is missing and spawn throws ENOENT).
 */
function getListening(): Promise<RawListening[]> {
  if (process.platform === 'win32') return getListeningViaNetstat()
  if (process.platform === 'darwin')
    return getListeningViaLsof().catch(() => getListeningViaNetstat())
  return getListeningViaSs().catch(() => getListeningViaNetstat())
}

/**
 * Take a full occupancy snapshot as `Map<port, { pid, name }>`.
 *
 * Data-layer flow (see CONTEXT.md): the listening source yields port + pid, then ps-list
 * is fetched once to build a `Map<pid, name>`, and an O(1) join fills in the process name.
 * Roughly 130ms total, so occupied rows already carry their process name at startup.
 */
export async function getOccupancy(): Promise<OccupancyMap> {
  const [listening, procs] = await Promise.all([getListening(), psList()])

  const nameByPid = new Map(procs.map(p => [p.pid, p.name]))
  const occupancy: OccupancyMap = new Map()

  for (const { port, pid } of listening) {
    // A single port may appear twice (IPv4 / IPv6); keep the first one seen.
    if (occupancy.has(port)) continue
    occupancy.set(port, { pid, name: nameByPid.get(pid) ?? '' })
  }

  return occupancy
}
