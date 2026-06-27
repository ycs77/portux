import find from 'find-process'

/** pid → full command line cache, to avoid respawning (find-process runs WMIC, ~1.8s each). */
const cmdCache = new Map<number, string>()

/**
 * Expensive per-process enrichment: only called when the cursor focuses an occupied port.
 *
 * ps-list cannot read cmd on Windows, so the full command line is looked up on demand
 * with find-process by a single pid, then cached.
 */
export async function getCmd(pid: number): Promise<string> {
  const cached = cmdCache.get(pid)
  if (cached !== undefined) return cached

  try {
    const procs = await find('pid', pid)
    const cmd = procs[0]?.cmd ?? ''
    cmdCache.set(pid, cmd)
    return cmd
  } catch {
    cmdCache.set(pid, '')
    return ''
  }
}
