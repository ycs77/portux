import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cursorPort, press, renderApp, waitForLoad } from './harness.ts'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('random port jump', () => {
  it('jumps the cursor to a random free, non-common port', async () => {
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = renderApp()
    await waitForLoad(r)

    await press(r, 'r')

    // With rng pinned to 0 the first eligible candidate is port 1024 (free, unlabeled, >=1024).
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(1024)
    rng.mockRestore()
    r.unmount()
  })

  it('shows a notice without moving when the filter hides every candidate', async () => {
    const r = renderApp({ initialFilter: { commonOnly: true } })
    await waitForLoad(r)
    const before = cursorPort(r.lastFrame())

    await press(r, 'r')

    await vi.waitFor(() =>
      expect(r.lastFrame()).toContain('no free port available in the current view'),
    )
    expect(cursorPort(r.lastFrame())).toBe(before)
    r.unmount()
  })
})
