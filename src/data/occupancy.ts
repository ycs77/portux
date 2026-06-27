import type { OccupancyMap } from '../types.ts'
import netstat from 'node-netstat'
import psList from 'ps-list'

interface RawListening {
  port: number
  pid: number
}

/**
 * Call node-netstat once up front to get every TCP LISTENING entry (port + pid).
 *
 * Note: win32 reports 'LISTENING' at runtime while Linux usually reports 'LISTEN',
 * yet @types/node-netstat only defines 'LISTEN'. Use startsWith('LISTEN') to cover both.
 */
function getListening(): Promise<RawListening[]> {
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
 * Take a full occupancy snapshot as `Map<port, { pid, name }>`.
 *
 * Data-layer flow (see CONTEXT.md): node-netstat yields port + pid, then ps-list is
 * fetched once to build a `Map<pid, name>`, and an O(1) join fills in the process name.
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
