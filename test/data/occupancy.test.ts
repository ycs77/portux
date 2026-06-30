import { describe, it, expect, vi, beforeEach } from 'vitest'

interface NetstatItem {
  state: string
  pid: number
  local: { port: number }
}

interface NetstatOptions {
  done: (err?: string | null) => void
}

const { netstatMock, psListMock, execFileMock } = vi.hoisted(() => ({
  netstatMock: vi.fn(),
  psListMock: vi.fn(),
  execFileMock: vi.fn(),
}))

vi.mock('node-netstat', () => ({ default: netstatMock }))
vi.mock('ps-list', () => ({ default: psListMock }))
vi.mock('node:child_process', () => ({ execFile: execFileMock }))

import { getOccupancy, parseLsofOutput, parseSsOutput } from '../../src/data/occupancy.ts'

// promisify(execFile) expects the node-style callback signature.
function ssReturns(stdout: string) {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, out: { stdout: string }) => void) => {
      cb(null, { stdout })
    },
  )
}

function ssUnavailable() {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, out?: { stdout: string }) => void) => {
      cb(Object.assign(new Error('spawn ss ENOENT'), { code: 'ENOENT' }))
    },
  )
}

function netstatEmits(items: NetstatItem[]) {
  netstatMock.mockImplementation((opts: NetstatOptions, cb: (item: NetstatItem) => void) => {
    for (const item of items) cb(item)
    opts.done(null)
  })
}

describe('parseSsOutput', () => {
  it('maps a listening line to its port and pid', () => {
    const out = 'LISTEN 0 511 127.0.0.1:5173 0.0.0.0:* users:(("node",pid=37400,fd=24))'
    expect(parseSsOutput(out)).toEqual([{ port: 5173, pid: 37400 }])
  })

  it('reads the port after the final colon so IPv6 addresses stay correct', () => {
    const out = 'LISTEN 0 511 [::1]:8080 [::]:* users:(("node",pid=222,fd=9))'
    expect(parseSsOutput(out)).toEqual([{ port: 8080, pid: 222 }])
  })

  it('skips listening sockets owned by other users that expose no pid', () => {
    const out = 'LISTEN 0 4096 127.0.0.1:2375 0.0.0.0:*'
    expect(parseSsOutput(out)).toEqual([])
  })

  it('ignores non-listening lines such as the header', () => {
    const out =
      'State Recv-Q Send-Q Local Address:Port\nESTAB 0 0 127.0.0.1:1 1.1.1.1:2 users:(("x",pid=5,fd=1))'
    expect(parseSsOutput(out)).toEqual([])
  })
})

describe('parseLsofOutput', () => {
  it('maps a listening line to its port and pid', () => {
    const out = 'node 31797 me 10u IPv4 0xabc 0t0 TCP 127.0.0.1:3000 (LISTEN)'
    expect(parseLsofOutput(out)).toEqual([{ port: 3000, pid: 31797 }])
  })

  it('reads the port after the final colon so IPv6 addresses stay correct', () => {
    const out = 'node 31797 me 11u IPv6 0xdef 0t0 TCP [::1]:3000 (LISTEN)'
    expect(parseLsofOutput(out)).toEqual([{ port: 3000, pid: 31797 }])
  })

  it('reads pid and port even when the command name contains spaces', () => {
    const out = 'Google Chrome 42 me 30u IPv4 0x1 0t0 TCP 127.0.0.1:8080 (LISTEN)'
    expect(parseLsofOutput(out)).toEqual([{ port: 8080, pid: 42 }])
  })

  it('ignores the header row', () => {
    const out = 'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME'
    expect(parseLsofOutput(out)).toEqual([])
  })
})

describe.runIf(process.platform === 'linux')('getOccupancy on Linux via ss', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps a listening port to its pid and resolved process name', async () => {
    ssReturns('LISTEN 0 511 127.0.0.1:3000 0.0.0.0:* users:(("node",pid=111,fd=9))')
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(3000)).toEqual({ pid: 111, name: 'node' })
  })

  it('keeps only the first entry for a port listed on both IPv4 and IPv6', async () => {
    ssReturns(
      'LISTEN 0 511 0.0.0.0:8080 0.0.0.0:* users:(("first",pid=111,fd=9))\n' +
        'LISTEN 0 511 [::]:8080 [::]:* users:(("second",pid=222,fd=9))',
    )
    psListMock.mockResolvedValue([
      { pid: 111, name: 'first' },
      { pid: 222, name: 'second' },
    ])

    const occupancy = await getOccupancy()

    expect(occupancy.get(8080)).toEqual({ pid: 111, name: 'first' })
  })

  it('falls back to an empty name when the pid is missing from ps-list', async () => {
    ssReturns('LISTEN 0 511 127.0.0.1:5000 0.0.0.0:* users:(("node",pid=999,fd=9))')
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(5000)).toEqual({ pid: 999, name: '' })
  })
})

describe('getOccupancy falls back to netstat when ss is unavailable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ssUnavailable()
  })

  it('maps a listening port to its pid and resolved process name', async () => {
    netstatEmits([{ state: 'LISTENING', pid: 111, local: { port: 3000 } }])
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(3000)).toEqual({ pid: 111, name: 'node' })
  })

  it('ignores ports that are not in a listening state', async () => {
    netstatEmits([{ state: 'ESTABLISHED', pid: 111, local: { port: 4000 } }])
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.has(4000)).toBe(false)
  })

  it('accepts both LISTEN (Linux) and LISTENING (Windows) states', async () => {
    netstatEmits([
      { state: 'LISTEN', pid: 111, local: { port: 22 } },
      { state: 'LISTENING', pid: 222, local: { port: 80 } },
    ])
    psListMock.mockResolvedValue([
      { pid: 111, name: 'sshd' },
      { pid: 222, name: 'nginx' },
    ])

    const occupancy = await getOccupancy()

    expect(occupancy.get(22)).toEqual({ pid: 111, name: 'sshd' })
    expect(occupancy.get(80)).toEqual({ pid: 222, name: 'nginx' })
  })
})

describe.runIf(process.platform === 'darwin')('getOccupancy on macOS via lsof', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads listening ports from lsof on macOS', async () => {
    execFileMock.mockImplementation(
      (cmd: string, _args: string[], cb: (err: Error | null, out: { stdout: string }) => void) => {
        const stdout =
          cmd === 'lsof' ? 'node 111 me 10u IPv4 0x1 0t0 TCP 127.0.0.1:3000 (LISTEN)' : ''
        cb(null, { stdout })
      },
    )
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(3000)).toEqual({ pid: 111, name: 'node' })
  })

  it('falls back to netstat when lsof is unavailable', async () => {
    ssUnavailable()
    netstatEmits([{ state: 'LISTEN', pid: 222, local: { port: 5000 } }])
    psListMock.mockResolvedValue([{ pid: 222, name: 'rapportd' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(5000)).toEqual({ pid: 222, name: 'rapportd' })
  })
})
