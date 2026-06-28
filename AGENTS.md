# AGENTS.md

## Keep This File Strict

- Do not add repo tours, architecture summaries, or file inventories.
- Only keep constraints, non-obvious behavior, and things an agent must not do.
- If a fact is easy to find with grep, it probably does not belong here.

## Constraints

- Node.js v22+
- TypeScript formatting: 2 spaces, single quotes, no semicolons, trailing commas

## Commands

- `pnpm build`
- `pnpm typecheck`

## Rules

- All CLI output strings and code comments under `src/` must be English.
- `--used` and `--free` are mutually exclusive; never apply both.
- Do not lazy-probe port occupancy port-by-port. Fetch one occupancy snapshot at startup and refresh it periodically (htop-style); probing is slow, noisy, and inaccurate.
- Process `name` is filled once at startup via `ps-list`; only the heavier enrichment (`cmd`, user, cwd) is lazy-loaded on cursor focus. Do not move `name` into the lazy path.
- Switching any filter (`c`/`s`/`p`) resets the cursor to the top of the list.
- `goto` to a port hidden by the current filter must not change the filter or jump; only show a brief (~2s) footer hint.
- Port row color follows a strict priority: occupied (red) > known default with label (cyan) > `<1024` privileged (red) > otherwise free (gray).
- Do not mix Ink with neo-blessed terminal state management; one interface, one library (currently Ink).

## Non-Obvious Behavior

- Filter LISTEN state with `state.startsWith('LISTEN')`: win32 returns `'LISTENING'`, Linux returns `'LISTEN'`, but `@types/node-netstat` only types `'LISTEN'`. The type disagrees with runtime — do not trust it.
- `node-netstat` on Windows runs `netstat -a -n -o` (no `-b`), so it returns PID only, never the process name. Names must be joined in separately via `ps-list` (`Map<pid, name>`).
- `ps-list` does not return `cmd` on Windows (typed "Not supported on Windows", empty in practice). Full `cmd` must come from `find-process`, invoked only on focus.
- `find-process` reverse-lookup costs ~1.8s per pid (spawns WMIC internally). Never use it for batch name lookups; single focused `cmd` fetch only.
