import type { FilterState } from './types.ts'
import { cac } from 'cac'
import { render } from 'ink'
import { createElement } from 'react'
import pkg from '../package.json' with { type: 'json' }
import { App } from './ui/App.tsx'

const DEFAULT_REFRESH_MS = 3000
const MAX_PORT = 65535

interface CliOptions {
  refresh?: number | string
  common?: boolean
  used?: boolean
  free?: boolean
  /** cac negated flag: defaults to true, becomes false when --no-privileged is passed. */
  privileged?: boolean
}

const cli = cac('portux')

cli.option('--refresh <ms>', 'Occupancy refresh interval in milliseconds', {
  default: DEFAULT_REFRESH_MS,
})

cli
  .command('[port]', 'Browse the full 0–65535 range; optionally jump straight to <port>')
  .option('--common', 'Only show common tool default ports')
  .option('--used', 'Only show occupied ports')
  .option('--free', 'Only show free ports')
  .option('--no-privileged', 'Hide privileged ports below 1024')
  .action((port: string | undefined, options: CliOptions) => start(options, port))

cli.help()
cli.version(pkg.version)
cli.parse()

function start(options: CliOptions, portArg?: string) {
  // Argument validation first (environment-independent, so it works in CI too).
  if (options.used && options.free) {
    console.error('Options --used and --free are mutually exclusive.')
    process.exit(1)
  }

  let initialPort: number | undefined
  if (portArg !== undefined) {
    const port = Number(portArg)
    if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
      console.error(`Invalid port "${portArg}". Expected an integer between 0 and ${MAX_PORT}.`)
      process.exit(1)
    }
    initialPort = port
  }

  if (!process.stdout.isTTY) {
    console.error('portux requires an interactive terminal (TTY) to run.')
    process.exit(1)
  }

  const refreshMs = Number(options.refresh) || DEFAULT_REFRESH_MS

  const initialFilter: FilterState = {
    commonOnly: options.common === true,
    status: options.used ? 'used' : options.free ? 'free' : 'all',
    hidePrivileged: options.privileged === false,
  }

  render(createElement(App, { initialFilter, refreshMs, initialPort }))
}
