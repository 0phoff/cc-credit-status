# cc-credit-status

Claude Code mod that shows your extra-usage credits in the status line, e.g.:

    usage 18.25 / 100

## What it does
- Reads `plan.extraUsage` (spent / monthly limit) from the app's `get_usage` tool
  via `$.mcp.call('ccd_session_mgmt', 'get_usage')`.
- Refreshes on session start, after each turn, on each prompt, when a client attaches
  (switching back to a session), and every minute.
- Costs no tokens: it is a plain data read, no model call.
- Shows nothing if extra usage is disabled, `usage: n/a` if the read fails.

## Install
```
claude plugin marketplace add ~/Documents/code/cc-mods/cc-credit-status
claude plugin install usage@cc-credit-status --scope user
```

## Notes
- Reset date is not shown (not exposed by the usage data for Enterprise plans).
- The `ccd_session_mgmt` server name is specific to the Claude desktop app.
