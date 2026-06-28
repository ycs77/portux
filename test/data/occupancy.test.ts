import { describe, it, expect, vi, beforeEach } from 'vitest'

interface NetstatItem {
  state: string
  pid: number
  local: { port: number }
}

interface NetstatOptions {
  done: (err?: string | null) => void
}

const { netstatMock, psListMock } = vi.hoisted(() => ({
  netstatMock: vi.fn(),
  psListMock: vi.fn(),
}))

vi.mock('node-netstat', () => ({ default: netstatMock }))
vi.mock('ps-list', () => ({ default: psListMock }))

import { getOccupancy } from '../../src/data/occupancy.ts'

function emit(items: NetstatItem[]) {
  netstatMock.mockImplementation((opts: NetstatOptions, cb: (item: NetstatItem) => void) => {
    for (const item of items) cb(item)
    opts.done(null)
  })
}

describe('getOccupancy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps a listening port to its pid and resolved process name', async () => {
    emit([{ state: 'LISTENING', pid: 111, local: { port: 3000 } }])
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(3000)).toEqual({ pid: 111, name: 'node' })
  })

  it('keeps only the first entry for a port listed on both IPv4 and IPv6', async () => {
    emit([
      { state: 'LISTENING', pid: 111, local: { port: 8080 } },
      { state: 'LISTENING', pid: 222, local: { port: 8080 } },
    ])
    psListMock.mockResolvedValue([
      { pid: 111, name: 'first' },
      { pid: 222, name: 'second' },
    ])

    const occupancy = await getOccupancy()

    expect(occupancy.get(8080)).toEqual({ pid: 111, name: 'first' })
  })

  it('falls back to an empty name when the pid is missing from ps-list', async () => {
    emit([{ state: 'LISTENING', pid: 999, local: { port: 5000 } }])
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.get(5000)).toEqual({ pid: 999, name: '' })
  })

  it('ignores ports that are not in a listening state', async () => {
    emit([{ state: 'ESTABLISHED', pid: 111, local: { port: 4000 } }])
    psListMock.mockResolvedValue([{ pid: 111, name: 'node' }])

    const occupancy = await getOccupancy()

    expect(occupancy.has(4000)).toBe(false)
  })

  it('accepts both LISTEN (Linux) and LISTENING (Windows) states', async () => {
    emit([
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

  it('rejects when the netstat probe reports an error', async () => {
    netstatMock.mockImplementation((opts: NetstatOptions) => {
      opts.done('netstat failed')
    })
    psListMock.mockResolvedValue([])

    await expect(getOccupancy()).rejects.toThrow()
  })
})
