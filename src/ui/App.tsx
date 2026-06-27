import type { BrowseMode, PortRow } from '../types.ts'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { useEffect, useRef, useState } from 'react'
import { getCmd } from '../data/enrich.ts'
import { getOccupancy } from '../data/occupancy.ts'
import { buildCommonRows, buildFullRows } from '../ports/rows.ts'

interface AppProps {
  mode: BrowseMode
  refreshMs: number
  initialPort?: number
}

const MAX_PORT = 65535

/** Rows reserved for the banner / thead / footer chrome. */
const CHROME_ROWS = 8

/** Fixed column widths (the Name column uses flexGrow to fill the rest). */
const COL_MARKER = 2
const COL_PORT = 7
const COL_STATUS = 9

/** Privileged port boundary: ports below this need root and are discouraged. */
const PRIVILEGED_PORT = 1024

type RowColor = 'red' | 'cyan' | 'gray'

/**
 * Decide each row's color by priority: occupied > common preset > <1024 > free.
 * - occupied → red (cannot use)
 * - common preset port (has a label) → cyan (worth grabbing)
 * - <1024 → red (privileged, needs root)
 * - otherwise free → gray
 */
function getRowColor(row: PortRow): RowColor {
  if (row.occupant) return 'red'
  if (row.label) return 'cyan'
  if (row.port < PRIVILEGED_PORT) return 'red'
  return 'gray'
}

export function App({ mode, refreshMs, initialPort }: AppProps) {
  const { exit } = useApp()
  const { stdout } = useStdout()

  const [rows, setRows] = useState<PortRow[]>([])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(true)
  const [occupiedCount, setOccupiedCount] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [cmd, setCmd] = useState('')
  // goto prompt: null = inactive, otherwise the digits typed so far
  const [gotoInput, setGotoInput] = useState<string | null>(null)
  const didInitGoto = useRef(false)

  const width = stdout.columns ?? 80
  const viewport = Math.max(5, (stdout.rows ?? 24) - CHROME_ROWS)

  // Periodically refresh the whole occupancy snapshot (like htop) so the
  // red/green state never goes stale.
  useEffect(() => {
    let active = true

    async function refresh() {
      const occupancy = await getOccupancy()
      if (!active) return
      const next = mode === 'full' ? buildFullRows(occupancy) : buildCommonRows(occupancy)
      setRows(next)
      setOccupiedCount(occupancy.size)
      setUpdatedAt(new Date())
      setLoading(false)
    }

    refresh()
    const timer = setInterval(refresh, refreshMs)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [mode, refreshMs])

  // When an occupied port is focused, lazy-load its full cmd in the background
  // (200ms debounce, cached per pid).
  const selected = rows[cursor]
  const selectedPid = selected?.occupant?.pid
  useEffect(() => {
    setCmd('')
    if (selectedPid === undefined) return

    let cancelled = false
    const timer = setTimeout(async () => {
      const result = await getCmd(selectedPid)
      if (!cancelled) setCmd(result)
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedPid])

  // Move the cursor to a given port number (no-op if it isn't in the current mode).
  function jumpToPort(port: number) {
    const idx = rows.findIndex(r => r.port === port)
    if (idx >= 0) setCursor(idx)
  }

  // Jump to the port passed on the CLI once rows are first loaded (full mode).
  useEffect(() => {
    if (didInitGoto.current || initialPort === undefined || rows.length === 0) return
    jumpToPort(initialPort)
    didInitGoto.current = true
  }, [rows, initialPort])

  useInput((input, key) => {
    // goto prompt: collect digits, then jump on Enter (Esc cancels)
    if (gotoInput !== null) {
      if (key.return) {
        if (gotoInput !== '') jumpToPort(Number(gotoInput))
        setGotoInput(null)
        return
      }
      if (key.escape) {
        setGotoInput(null)
        return
      }
      if (key.backspace || key.delete) {
        setGotoInput((prev) => {
          const next = (prev ?? '').slice(0, -1)
          return next === '' ? null : next
        })
        return
      }
      if (/^[0-9]$/.test(input)) {
        setGotoInput((prev) => {
          const next = (prev ?? '') + input
          return Number(next) > MAX_PORT ? prev : next
        })
      }
      return
    }

    if (input === 'q') {
      exit()
      return
    }
    // typing a digit opens the goto prompt
    if (/^[0-9]$/.test(input)) {
      setGotoInput(input)
      return
    }
    if (key.downArrow || input === 'j') setCursor(c => Math.min(rows.length - 1, c + 1))
    if (key.upArrow || input === 'k') setCursor(c => Math.max(0, c - 1))
    if (key.pageDown) setCursor(c => Math.min(rows.length - 1, c + viewport))
    if (key.pageUp) setCursor(c => Math.max(0, c - viewport))
    if (input === 'g') setCursor(0)
    if (input === 'G') setCursor(Math.max(0, rows.length - 1))
  })

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyanBright" bold>portux</Text>
        <Text dimColor>Scanning ports…</Text>
      </Box>
    )
  }

  // Virtual scrolling: keep the cursor centered and slice out only the visible rows.
  const half = Math.floor(viewport / 2)
  const maxStart = Math.max(0, rows.length - viewport)
  const start = Math.max(0, Math.min(cursor - half, maxStart))
  const windowRows = rows.slice(start, start + viewport)

  return (
    <Box flexDirection="column" width={width}>
      {/* banner: title on the left, status on the right */}
      <Box width="100%" justifyContent="space-between" marginBottom={1}>
        <Text color="cyanBright" bold>portux</Text>
        <Text dimColor>
          {mode === 'full' ? 'Full range 0–65535' : 'Common tool default ports'}
          {` · ${occupiedCount} in use`}
          {` · ${cursor + 1}/${rows.length}`}
          {updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ''}
        </Text>
      </Box>

      {/* thead (persistent header row) */}
      <Box width="100%">
        <Box width={COL_MARKER} />
        <Box width={COL_PORT}><Text bold>Port</Text></Box>
        <Box width={COL_STATUS}><Text bold>Status</Text></Box>
        <Box flexGrow={1}><Text bold>Name</Text></Box>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>

      {/* tbody */}
      <Box flexDirection="column">
        {windowRows.map((row, i) => (
          <Row key={row.port} row={row} selected={start + i === cursor} />
        ))}
      </Box>

      {/* footer */}
      <Box flexDirection="column" marginTop={1}>
        {selected && (
          <Text>
            {`Port ${selected.port}`}
            {selected.occupant
              ? ` · PID ${selected.occupant.pid} · ${selected.occupant.name || '(protected system process)'}`
              : ' · free — available'}
          </Text>
        )}
        {selected?.occupant && (
          <Text dimColor>{cmd ? `cmd: ${cmd}` : 'cmd: loading…'}</Text>
        )}
        {gotoInput !== null
          ? (
              <Text>
                <Text color="cyanBright">{`goto port: ${gotoInput}▏`}</Text>
                <Text dimColor>  ↵ jump · esc cancel</Text>
              </Text>
            )
          : (
              <Text dimColor>↑/↓ j/k move · PgUp/PgDn page · g/G jump · 0-9 goto · q quit</Text>
            )}
      </Box>
    </Box>
  )
}

interface RowProps {
  row: PortRow
  selected: boolean
}

function Row({ row, selected }: RowProps) {
  const color = getRowColor(row)
  const status = row.occupant ? '● used' : '○ free'
  const name = row.occupant
    ? row.occupant.name || `pid ${row.occupant.pid}`
    : row.label ?? ''

  return (
    <Box width="100%">
      <Box width={COL_MARKER}>
        <Text color={color} bold={selected}>{selected ? '❯' : ' '}</Text>
      </Box>
      <Box width={COL_PORT}>
        <Text color={color} bold={selected}>{String(row.port)}</Text>
      </Box>
      <Box width={COL_STATUS}>
        <Text color={color} bold={selected}>{status}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={color} bold={selected} wrap="truncate-end">{name}</Text>
      </Box>
    </Box>
  )
}
