import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findMock } = vi.hoisted(() => ({ findMock: vi.fn() }))
vi.mock('find-process', () => ({ default: findMock }))

import { getCmd } from '../../src/data/enrich.ts'

describe('getCmd focused cmd lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the cmd reported by find-process on first lookup', async () => {
    findMock.mockResolvedValue([{ pid: 1001, name: 'node', cmd: 'node server.js' }])
    const cmd = await getCmd(1001)
    expect(cmd).toBe('node server.js')
    expect(findMock).toHaveBeenCalledWith('pid', 1001)
  })

  it('caches the result so find-process is invoked only once per pid', async () => {
    findMock.mockResolvedValue([{ pid: 1002, name: 'node', cmd: 'node app.js' }])
    const first = await getCmd(1002)
    const second = await getCmd(1002)
    expect(first).toBe('node app.js')
    expect(second).toBe('node app.js')
    expect(findMock).toHaveBeenCalledTimes(1)
  })

  it('returns an empty string when find-process finds no matching process', async () => {
    findMock.mockResolvedValue([])
    const cmd = await getCmd(1003)
    expect(cmd).toBe('')
  })

  it('swallows find-process errors, returns empty string, and caches the failure', async () => {
    findMock.mockRejectedValue(new Error('boom'))
    const first = await getCmd(1004)
    const second = await getCmd(1004)
    expect(first).toBe('')
    expect(second).toBe('')
    expect(findMock).toHaveBeenCalledTimes(1)
  })
})
