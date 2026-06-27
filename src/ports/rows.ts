import type { FilterState, OccupancyMap, PortRow } from '../types.ts'
import { WELL_KNOWN_PORTS } from './well-known.ts'

const MAX_PORT = 65535

/** Privileged port boundary: ports below this need root and are discouraged. */
export const PRIVILEGED_PORT = 1024

/** Build the whole 0–65535 range, keeping labels on common ports (only visible rows render). */
export function buildRows(occupancy: OccupancyMap): PortRow[] {
  const labelByPort = new Map(WELL_KNOWN_PORTS.map(w => [w.port, w.label]))
  return Array.from({ length: MAX_PORT + 1 }, (_, port) => ({
    port,
    label: labelByPort.get(port),
    occupant: occupancy.get(port),
  }))
}

/** Apply the active view filter to the full row set (pure; trivially unit-testable). */
export function applyFilters(rows: PortRow[], f: FilterState): PortRow[] {
  return rows.filter((row) => {
    if (f.commonOnly && row.label === undefined) return false
    if (f.status === 'used' && row.occupant === undefined) return false
    if (f.status === 'free' && row.occupant !== undefined) return false
    if (f.hidePrivileged && row.port < PRIVILEGED_PORT) return false
    return true
  })
}
