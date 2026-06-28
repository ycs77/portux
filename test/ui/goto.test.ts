import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cursorPort, KEY, press, renderApp, waitForLoad } from './harness.ts'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('goto prompt', () => {
  it('opens the goto prompt when a digit is typed', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, '3')
    await vi.waitFor(() => expect(r.lastFrame()).toContain('goto port: 3'))
    r.unmount()
  })

  it('jumps to the port when Enter is pressed', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, '3')
    await press(r, '0')
    await press(r, '0')
    await press(r, '0')
    await press(r, KEY.enter)

    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3000)
    r.unmount()
  })

  it('shows a notice without jumping or changing the filter when the target is hidden', async () => {
    const r = renderApp({ initialFilter: { status: 'used' } })
    await waitForLoad(r)
    await expect.poll(() => cursorPort(r.lastFrame())).toBe(3000)

    await press(r, '4')
    await press(r, '4')
    await press(r, '3')
    await press(r, KEY.enter)

    await vi.waitFor(() => expect(r.lastFrame()).toContain('is hidden by the current filter'))
    expect(cursorPort(r.lastFrame())).toBe(3000)

    const bannerLine = r
      .lastFrame()
      ?.split('\n')
      .find(line => line.includes('in use'))
    expect(bannerLine).toContain('used')
    r.unmount()
  })

  it('cancels the prompt when Esc is pressed', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, '5')
    await vi.waitFor(() => expect(r.lastFrame()).toContain('goto port: 5'))

    await press(r, KEY.esc)
    await vi.waitFor(() => expect(r.lastFrame()).not.toContain('goto port:'))
    expect(cursorPort(r.lastFrame())).toBe(0)
    r.unmount()
  })

  it('edits with backspace and closes the prompt when the last digit is removed', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, '3')
    await press(r, '0')
    await vi.waitFor(() => expect(r.lastFrame()).toContain('goto port: 30'))

    await press(r, KEY.del)
    await vi.waitFor(() => expect(r.lastFrame()).toContain('goto port: 3'))

    await press(r, KEY.del)
    await vi.waitFor(() => expect(r.lastFrame()).not.toContain('goto port:'))
    r.unmount()
  })

  it('rejects a digit that would exceed the maximum port', async () => {
    const r = renderApp()
    await waitForLoad(r)

    await press(r, '6')
    await press(r, '5')
    await press(r, '5')
    await press(r, '3')
    await press(r, '6')

    await vi.waitFor(() => expect(r.lastFrame()).toContain('goto port: 6553'))
    const gotoLine = r
      .lastFrame()
      ?.split('\n')
      .find(line => line.includes('goto port:'))
    expect(gotoLine).not.toContain('65536')
    r.unmount()
  })

  it('jumps to the initialPort once on first load', async () => {
    const r = renderApp({ initialPort: 8080 })
    await waitForLoad(r)

    await expect.poll(() => cursorPort(r.lastFrame())).toBe(8080)
    r.unmount()
  })
})
