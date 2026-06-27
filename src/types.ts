/** Process that occupies a port (name is filled up front via ps-list). */
export interface PortOccupant {
  pid: number
  name: string
}

/** port → occupying process; a miss means the port is free. */
export type OccupancyMap = Map<number, PortOccupant>

/** Static definition of a common tool default port. */
export interface WellKnownPort {
  port: number
  label: string
}

/** A single list row: merges the common-port label with live occupancy state. */
export interface PortRow {
  port: number
  label?: string
  occupant?: PortOccupant
}

/** Browse mode: common = common tool default ports, full = the whole 0–65535 range. */
export type BrowseMode = 'common' | 'full'
