import type { FilterState, OccupancyMap, PortRow } from '../../src/types.ts'
import { describe, it, expect } from 'vitest'
import { applyFilters, buildRows, getRowColor } from '../../src/ports/rows.ts'

const rows: PortRow[] = [
  { port: 80, label: 'HTTP', occupant: { pid: 111, name: 'node' } },
  { port: 443, label: 'HTTPS' },
  { port: 3000, label: 'React / Next.js dev server' },
  { port: 22, occupant: undefined },
  { port: 9999 },
]

describe('applyFilters', () => {
  it('returns every row when no filter is active', () => {
    const f: FilterState = {
      commonOnly: false,
      status: 'all',
      hidePrivileged: false,
    }
    expect(applyFilters(rows, f)).toEqual(rows)
  })

  it('shows only labeled ports when commonOnly is set', () => {
    const f: FilterState = {
      commonOnly: true,
      status: 'all',
      hidePrivileged: false,
    }
    const result = applyFilters(rows, f)
    expect(result.map(r => r.port)).toEqual([80, 443, 3000])
  })

  it('shows only occupied ports when status is used', () => {
    const f: FilterState = {
      commonOnly: false,
      status: 'used',
      hidePrivileged: false,
    }
    const result = applyFilters(rows, f)
    expect(result.map(r => r.port)).toEqual([80])
  })

  it('shows only free ports when status is free', () => {
    const f: FilterState = {
      commonOnly: false,
      status: 'free',
      hidePrivileged: false,
    }
    const result = applyFilters(rows, f)
    expect(result.map(r => r.port)).toEqual([443, 3000, 22, 9999])
  })

  it('hides privileged ports below 1024 with a strict boundary', () => {
    const boundaryRows: PortRow[] = [{ port: 1023 }, { port: 1024 }]
    const f: FilterState = {
      commonOnly: false,
      status: 'all',
      hidePrivileged: true,
    }
    const result = applyFilters(boundaryRows, f)
    expect(result.map(r => r.port)).toEqual([1024])
  })

  it('combines commonOnly and free status to show labeled free ports only', () => {
    const f: FilterState = {
      commonOnly: true,
      status: 'free',
      hidePrivileged: false,
    }
    const result = applyFilters(rows, f)
    expect(result.map(r => r.port)).toEqual([443, 3000])
  })

  it('returns an empty array when nothing matches', () => {
    const f: FilterState = {
      commonOnly: true,
      status: 'used',
      hidePrivileged: true,
    }
    const result = applyFilters([{ port: 9999 }], f)
    expect(result).toEqual([])
  })
})

describe('buildRows', () => {
  const occupancy: OccupancyMap = new Map([[3000, { pid: 111, name: 'node' }]])

  it('produces a row for every port from 0 to 65535', () => {
    expect(buildRows(occupancy)).toHaveLength(65536)
  })

  it('carries the well-known label for a common port', () => {
    const result = buildRows(occupancy)
    expect(result[3000].label).toBeDefined()
  })

  it('attaches the occupant to an occupied port and leaves free ports empty', () => {
    const result = buildRows(occupancy)
    expect(result[3000].occupant).toEqual({ pid: 111, name: 'node' })
    expect(result[9999].occupant).toBeUndefined()
  })

  it('includes both boundary ports 0 and 65535', () => {
    const result = buildRows(occupancy)
    expect(result[0].port).toBe(0)
    expect(result[65535].port).toBe(65535)
  })
})

describe('getRowColor', () => {
  it('marks an occupied common port red, proving occupied wins over common', () => {
    expect(getRowColor({ port: 80, label: 'HTTP', occupant: { pid: 1, name: 'x' } })).toBe('red')
  })

  it('marks a free common port below 1024 cyan, proving common wins over privileged', () => {
    expect(getRowColor({ port: 80, label: 'HTTP' })).toBe('cyan')
  })

  it('marks a free unlabeled privileged port red', () => {
    expect(getRowColor({ port: 22 })).toBe('red')
  })

  it('marks a free unlabeled non-privileged port gray', () => {
    expect(getRowColor({ port: 9999 })).toBe('gray')
  })
})
