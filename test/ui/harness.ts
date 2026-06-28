import type { render as inkRender } from 'ink-testing-library'
import type { FilterState } from '../../src/types.ts'
import { render } from 'ink-testing-library'
import { createElement } from 'react'
import { expect, vi } from 'vitest'

// Fixed occupancy snapshot shared by every UI test, built before the mocks below
// run (vi.hoisted is lifted above vi.mock). Includes common+occupied (3000/8080)
// and non-common+occupied (54321) so the c/s/p filters all have something to show.
const { FIXED_OCC } = vi.hoisted(() => ({
  FIXED_OCC: new Map<number, { pid: number; name: string }>([
    [3000, { pid: 101, name: 'node' }],
    [8080, { pid: 102, name: 'java' }],
    [54321, { pid: 103, name: 'app' }],
  ]),
}))

// Replace the data layer so the component renders a deterministic snapshot
// without spawning real processes.
vi.mock('../../src/data/occupancy.ts', () => ({
  getOccupancy: vi.fn().mockResolvedValue(FIXED_OCC),
}))
vi.mock('../../src/data/enrich.ts', () => ({
  getCmd: vi.fn().mockResolvedValue(''),
}))

// Imported after the mocks above (vi.mock is hoisted, so App's data-layer
// imports resolve to the mocks).
const { App } = await import('../../src/ui/App.tsx')

export type RenderResult = ReturnType<typeof inkRender>

const DEFAULT_FILTER: FilterState = {
  commonOnly: false,
  status: 'all',
  hidePrivileged: false,
}

interface RenderAppOptions {
  initialFilter?: Partial<FilterState>
  refreshMs?: number
  initialPort?: number
}

/** Render the App with deterministic data. refreshMs defaults huge so the htop-style interval never re-fires mid-test. */
export function renderApp(options: RenderAppOptions = {}): RenderResult {
  const initialFilter: FilterState = { ...DEFAULT_FILTER, ...options.initialFilter }
  return render(
    createElement(App, {
      initialFilter,
      refreshMs: options.refreshMs ?? 600_000,
      initialPort: options.initialPort,
    }),
  )
}

// ESC (27) and DEL (127) built from char codes to keep raw control bytes out of source.
const ESC = String.fromCharCode(27)
const DEL = String.fromCharCode(127)

/** Terminal key sequences accepted by Ink's useInput. */
export const KEY = {
  down: `${ESC}[B`,
  up: `${ESC}[A`,
  pgdn: `${ESC}[6~`,
  pgup: `${ESC}[5~`,
  enter: '\r',
  esc: ESC,
  del: DEL,
} as const

export function delay(ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Wait until the initial occupancy load finished (loading banner gone). */
export async function waitForLoad(r: RenderResult): Promise<void> {
  await vi.waitFor(() => expect(r.lastFrame()).not.toContain('Scanning ports'))
}

/** Send a key sequence, then let React flush the resulting re-render. */
export async function press(r: RenderResult, seq: string): Promise<void> {
  r.stdin.write(seq)
  await delay(0)
}

/** Read the port number of the row currently marked with the cursor (the selected row). */
export function cursorPort(frame: string | undefined): number | undefined {
  const match = frame?.match(/❯\s*(\d+)/)
  return match ? Number(match[1]) : undefined
}
