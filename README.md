# Credit Status
Claude Code mod that shows your extra-usage credits in the status line, e.g. `credit-status 18.25 / 100`.

## Install
Run the following commands in your claude code chat to add the marketplace and install the plugin:
```
/plugin marketplace add 0phoff/cc-credit-status
/plugin install credit-status@cc-credit-status
```

## Overview
- Reads `plan.extraUsage` (spent / monthly limit) from the app's `get_usage` tool via `$.mcp.call('ccd_session_mgmt', 'get_usage')`.
- Costs no tokens: it is a plain data read, no model call.
- Shows `…` until the first value is read and `n/a` when it could not be read; the last known value stays while a refresh runs.

### Refreshing
- Refreshes on session start, after each turn, on each prompt, when a client attaches (switching back to a session), and every minute.
- `/credit-status` and the button always read fresh. The value shows in the status line; if something went wrong, the command prints why and the button shows it as a toast.
- The app's usage read is rate limited, so reads are spared:
  - A refresh while one is running joins it.
  - Automatic refreshes reuse a successful read under 10 seconds old. The button and the command never do, and a failed read is never reused.
  - A failed read is retried once, after 1 second.

### Button
`/credit-status --button` shows or hides a `↻ credit-status` button above the prompt that refreshes on click. Hidden by default; the choice is remembered across sessions.
It shares the band above the prompt with the buttons of other plugins that pass through to each other.

## Notes
- Reset date is not shown (not exposed by the usage data for Enterprise plans).
- The `ccd_session_mgmt` server name is specific to the Claude desktop app.
