import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const SERVER = 'ccd_session_mgmt'

// Whether the reload button shows above the prompt, kept across sessions: off by default.
const BUTTON = 'showButton'
const buttonTick = atom({ plugin: 'credit-status', key: 'buttonTick' } as const, 0)
const buttonShown = async ($: any) => (await $.store.get(BUTTON)) === true

const UNAVAILABLE = 'n/a'

let last: string | undefined

type Reading = { text: string | undefined; problem?: string; notice?: string }

// One read of the credits. `problem` says why nothing could be read, `notice` that extra usage
// is off; both stay undefined when the value was read.
async function attempt($: any): Promise<Reading> {
  let problem: string | undefined
  let notice: string | undefined
  try {
    const { content } = await $.mcp.call(SERVER, 'get_usage', {})
    const text = content.find((c: any) => c.type === 'text')?.text ?? ''
    const plan = JSON.parse(text).plan
    if (plan?.status === 'unavailable') {
      // Transient: keep showing the last known value instead of clearing it.
      problem = `The usage data is unavailable right now${plan.note ? `: ${plan.note}` : ''}`
      last = last && last !== UNAVAILABLE ? last : UNAVAILABLE
    } else {
      const extra = plan?.extraUsage
      last = extra?.enabled
        ? `${Number(extra.spent).toFixed(2)} / ${Math.round(Number(extra.monthlyLimit))}`
        : undefined
      if (!last) notice = 'Extra usage is not enabled on this account.'
    }
  } catch (err) {
    problem = `The usage could not be read: ${err instanceof Error ? err.message : String(err)}`
    last = UNAVAILABLE
  }
  return { text: last, problem, notice }
}

// The app's usage read is rate limited, so reads are spared. Any refresh while one runs joins
// it. Otherwise a successful read under REUSE_MS old is reused by whatever refreshes on its
// own (a prompt, a turn, the timer); the button and the command never reuse one, and nobody
// reuses a failed one. A failed read is retried once.
const REUSE_MS = 10 * 1000
const RETRY_MS = 1000
let running: Promise<Reading> | undefined
let finishedAt = 0
let latest: Reading | undefined

// Reads the credits into the status line; `isManual` is the button or the command.
async function refresh($: any, isManual: boolean): Promise<Reading> {
  const now: number = await $.clock.now()
  // Nothing awaits between this check and the assignment of `running`, so callers cannot both pass.
  if (running) return running
  if (!isManual && latest && !latest.problem && now - finishedAt < REUSE_MS) return latest
  running = (async () => {
    let reading = await attempt($)
    if (reading.problem) {
      await $.clock.sleep(RETRY_MS)
      reading = await attempt($)
    }
    $.ui.status(last)
    latest = reading
    finishedAt = await $.clock.now()
    return reading
  })().finally(() => {
    running = undefined
  })
  return running
}

// Show the last known value (or a placeholder) right away, then refresh it.
function show($: any) {
  $.ui.status(last ?? '…')
  refresh($, false)
}

// The button does what the command does, but says it in a toast.
async function press($: any) {
  const { problem, notice } = await refresh($, true)
  const message = problem ?? notice
  if (message) $.ui.toast(message)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'credit-status',
      description: 'Refresh and show extra-usage credits in the status line; `--button` shows or hides a reload button above the prompt',
      argumentHint: '[--button]',
    })
    show($)
    $.clock.every(60 * 1000, () => refresh($, false))
    return next(e)
  })

  on('command.run', { command: 'credit-status' }, async ($, e) => {
    if (e.args.trim() === '--button') {
      const next = !(await buttonShown($))
      await $.store.set(BUTTON, next)
      await update($, buttonTick, n => n + 1)
      return { text: next ? 'Credit-status button shown above the prompt.' : 'Credit-status button hidden.' }
    }
    // Success shows in the status line; only print when something went wrong.
    const { problem, notice } = await refresh($, true)
    const message = problem ?? notice
    return message ? { text: message } : {}
  })

  // The reload button above the prompt, shown only once switched on with `/credit-status --button`.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await read($, buttonTick)
    // The band draws one tree: take what the plugins beneath drew and put the button beside it.
    const below = await next(e)
    if (e.props.hasSurvey || !(await buttonShown($))) return below
    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row">
        {below}
        <Box flexShrink={0} marginLeft={below ? 2 : 0}>
          <Button key="credit-status" plain onPress={() => press($)}>
            <Text bold>↻ credit-status</Text>
          </Button>
        </Box>
      </Box>
    )
  })

  on('session.attach', async ($, e, next) => {
    show($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    show($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    refresh($, false)
    return next(e)
  })
}
