<h1 align="center">⚓ portux</h1>
<p align="center"><sup>(/ˈpɔːr.tʌks/, from Latin <em>Portus</em> — <em>harbor</em>)</sup></p>
<p align="center">A TUI dashboard to browse ports and pick a free one with ease</p>

<pre align="center">npx <b>portux</b></pre>

<p align="center">or jump to a <b>specific port</b> and browse around it</p>

<pre align="center">npx portux <b>1234</b></pre>

<p align="center">
  <a href="https://www.npmjs.com/package/portux"><img src="https://img.shields.io/npm/v/portux?style=flat-square" alt="NPM version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square" alt="Software License"></a>
  <a href="https://github.com/ycs77/portux/actions/workflows/ci.yml?query=branch%3Amain"><img src="https://img.shields.io/github/actions/workflow/status/ycs77/portux/ci.yml?branch=main&label=tests&style=flat-square" alt="GitHub Tests Action Status"></a>
  <a href="https://www.npmjs.com/package/portux"><img src="https://img.shields.io/npm/dt/portux?style=flat-square" alt="Total Downloads"></a>
</p>

---

## Overview

portux is an interactive TUI dashboard for your ports. Instead of grepping `netstat` output or guessing what's free, you browse every port like window-shopping, see what's taken and what's open at a glance, and note a free one to use.

## Features

- No installation required — `npx portux`
- Browse every port like window-shopping, no range to set up
- See what's taken at a glance, with the process that owns it
- Jump to any port and filter the view live, all from the keyboard

## Getting Started

No install needed. Just run it:

```bash
npx portux
```

That opens the dashboard on the full port range. From here you just browse.

## Usage

```bash
# Browse everything
npx portux

# Jump straight to a port
npx portux 5173

# See only what's occupied right now
npx portux --used

# Only the well-known default ports (3000, 5173, 8080…)
npx portux --common
```

## CLI

```
portux [port] [options]
```

| Argument / Option | What it does                                         |
| ----------------- | ---------------------------------------------------- |
| `[port]`          | Open straight on this port (goto)                    |
| `--common`        | Only show common tool default ports                  |
| `--used`          | Only show occupied ports                             |
| `--free`          | Only show free ports                                 |
| `--no-privileged` | Hide privileged ports below `1024`                   |
| `--refresh <ms>`  | Occupancy snapshot refresh interval (default `3000`) |

> portux needs an interactive terminal (TTY) to run.

## Keys

| Key               | Action                                            |
| ----------------- | ------------------------------------------------- |
| `↑` `↓` / `k` `j` | Move the cursor (smooth scroll)                   |
| `PgUp` `PgDn`     | Jump a full page                                  |
| `g` / `G`         | Jump to first / last row                          |
| `0`–`9`           | Start a goto prompt; `Enter` jumps, `esc` cancels |
| `c`               | Toggle common-only                                |
| `s`               | Cycle status: all → used → free                   |
| `p`               | Toggle hiding privileged ports `<1024`            |
| `q`               | Quit                                              |

## License

[MIT LICENSE](LICENSE)
