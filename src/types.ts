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

/** Status axis of the filter: all ports, only occupied, or only free. */
export type StatusFilter = 'all' | 'used' | 'free'

/** The active view filter, applied on top of the full 0–65535 range. */
export interface FilterState {
  /** Only show common tool default ports (rows with a label). */
  commonOnly: boolean
  /** Filter by occupancy state. */
  status: StatusFilter
  /** Hide privileged ports below 1024. */
  hidePrivileged: boolean
}
