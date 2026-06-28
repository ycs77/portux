import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cursorPort, KEY, press, renderApp, waitForLoad } from './harness.ts'

beforeEach(() => {
  vi.clearAllMocks()
})

/** Read the banner line (the one carrying the `… in use` summary + filter chips). */
function banner(frame: string | undefined): string {
  return frame?.split('\n').find(l => l.includes('in use')) ?? ''
}

describe('filter toggles', () => {
  it('shows only common ports and resets the cursor to the top when c is pressed', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, KEY.down)
    await press(r, KEY.down)
    await press(r, KEY.down)
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3)

    await press(r, 'c')

    await expect.poll(() => banner(r.lastFrame())).toContain('common')
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(25)
    // Free common ports render their well-known label; the occupied 3000 prefers
    // its occupant name (`node`) in the Name column, so its label never shows.
    await vi.waitFor(() => {
      const frame = r.lastFrame()
      expect(frame).toContain('SQL Server')
      expect(frame).toContain('3000')
      expect(frame).toContain('node')
    })
    r.unmount()
  })

  it('shows the occupied ports with the cursor on 3000 when s cycles to used', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, KEY.down)
    await press(r, KEY.down)
    await press(r, KEY.down)
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3)

    await press(r, 's')

    await expect.poll(() => banner(r.lastFrame())).toContain('used')
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3000)
    await vi.waitFor(() => {
      const frame = r.lastFrame()
      expect(frame).toContain('8080')
      expect(frame).toContain('54321')
      expect(frame).toContain('● used')
    })
    r.unmount()
  })

  it('cycles the status filter all -> used -> free across two s presses', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, 's')
    await expect.poll(() => banner(r.lastFrame())).toContain('used')

    await press(r, 's')
    await expect.poll(() => banner(r.lastFrame())).toContain('free')
    r.unmount()
  })

  it('hides privileged ports and resets the cursor to the first port >= 1024 when p is pressed', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, KEY.down)
    await press(r, KEY.down)
    await press(r, KEY.down)
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3)

    await press(r, 'p')

    await expect.poll(() => banner(r.lastFrame())).toContain('no-priv')
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(1024)
    r.unmount()
  })

  it('returns the cursor to the first visible row on every filter toggle', async () => {
    const r = renderApp()
    await waitForLoad(r)

    // Move off the top, then toggle: cursor lands on the common view's first row.
    await press(r, KEY.down)
    await press(r, KEY.down)
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(2)
    await press(r, 'c')
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(25)

    // Move off the top again, then toggle a second filter: cursor resets once more.
    // commonOnly is still on, so the used+common view's first row is 3000.
    await press(r, KEY.down)
    await press(r, KEY.down)
    await expect.poll(() => cursorPort(r.lastFrame())).not.toBe(25)
    await press(r, 's')
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3000)
    r.unmount()
  })
})
