# Credit Status
Claude Code mod that shows your extra-usage credits in the status line, e.g. `usage 18.25 / 100`.

## What it does
- Reads `plan.extraUsage` (spent / monthly limit) from the app's `get_usage` tool via `$.mcp.call('ccd_session_mgmt', 'get_usage')`.
- Refreshes on session start, after each turn, on each prompt, when a client attaches (switching back to a session), and every minute.
- On a prompt, attach or session start, the last known value (or `usage …`) shows immediately in the status line and is refreshed in the background.
- `/credits` forces a refresh now; the value shows in the status line, or the command prints if something went wrong.
- Costs no tokens: it is a plain data read, no model call.

## Install
```
claude plugin marketplace add ~/Documents/code/cc-mods/cc-credit-status
claude plugin install usage@cc-credit-status --scope user
```

## Notes
- Reset date is not shown (not exposed by the usage data for Enterprise plans).
- The `ccd_session_mgmt` server name is specific to the Claude desktop app.
