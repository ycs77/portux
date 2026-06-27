import type { OccupancyMap, PortRow } from '../types.ts'
import { WELL_KNOWN_PORTS } from './well-known.ts'

const MAX_PORT = 65535

/** common mode: build only the common tool default ports, sorted by port number. */
export function buildCommonRows(occupancy: OccupancyMap): PortRow[] {
  return [...WELL_KNOWN_PORTS]
    .sort((a, b) => a.port - b.port)
    .map(({ port, label }) => ({
      port,
      label,
      occupant: occupancy.get(port),
    }))
}

/** full mode: build the whole 0–65535 range, keeping labels on common ports (only visible rows render). */
export function buildFullRows(occupancy: OccupancyMap): PortRow[] {
  const labelByPort = new Map(WELL_KNOWN_PORTS.map(w => [w.port, w.label]))
  const rows: PortRow[] = Array.from({ length: MAX_PORT + 1 }, (_, port) => ({
    port,
    label: labelByPort.get(port),
    occupant: occupancy.get(port),
  }))
  return rows
}
