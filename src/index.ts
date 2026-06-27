import type { BrowseMode } from './types.ts'
import { cac } from 'cac'
import { render } from 'ink'
import { createElement } from 'react'
import pkg from '../package.json' with { type: 'json' }
import { App } from './ui/App.tsx'

const DEFAULT_REFRESH_MS = 3000
const MAX_PORT = 65535

const cli = cac('portux')

cli.option('--refresh <ms>', 'Occupancy refresh interval in milliseconds', {
  default: DEFAULT_REFRESH_MS,
})

cli
  .command('[port]', 'Browse the full 0–65535 range; optionally jump straight to <port>')
  .action((port: string | undefined, options: { refresh?: number | string }) =>
    start('full', options, port),
  )

cli
  .command('common', 'Browse only the common tool default ports')
  .action((options: { refresh?: number | string }) => start('common', options))

cli.help()
cli.version(pkg.version)
cli.parse()

function start(mode: BrowseMode, options: { refresh?: number | string }, portArg?: string) {
  if (!process.stdout.isTTY) {
    console.error('portux requires an interactive terminal (TTY) to run.')
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

  const refreshMs = Number(options.refresh) || DEFAULT_REFRESH_MS

  render(createElement(App, { mode, refreshMs, initialPort }))
}
