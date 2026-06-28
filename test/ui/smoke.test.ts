import { describe, expect, it } from 'vitest'
import { cursorPort, KEY, press, renderApp, waitForLoad } from './harness.ts'

describe('App smoke test', () => {
  it('renders the port table after the occupancy load finishes', async () => {
    const r = renderApp()
    await waitForLoad(r)

    // Only the ~15-row window renders; at cursor 0 that is ports 0..14, so the
    // occupied 3000 is off-screen until navigated to. Assert the table chrome instead.
    const frame = r.lastFrame()
    expect(frame).toContain('Port')
    expect(frame).toContain('Status')
    expect(frame).toContain('free')
    expect(frame).toContain('Port 0 · free — available')
    r.unmount()
  })

  it('moves the cursor down by one row on the down key', async () => {
    const r = renderApp()
    await waitForLoad(r)

    expect(cursorPort(r.lastFrame())).toBe(0)
    await press(r, KEY.down)
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(1)
    r.unmount()
  })
})
