import type { Register } from 'claude-code'

const SERVER = 'ccd_session_mgmt'

let last: string | undefined

async function refresh($: any) {
  try {
    const { content } = await $.mcp.call(SERVER, 'get_usage', {})
    const text = content.find((c: any) => c.type === 'text')?.text ?? ''
    const plan = JSON.parse(text).plan
    if (plan?.status === 'unavailable') {
      // Transient: keep showing the last known value instead of clearing it.
      last = last && last !== 'usage: n/a' ? last : 'usage: n/a'
    } else {
      const extra = plan?.extraUsage
      last = extra?.enabled
        ? `${Number(extra.spent).toFixed(2)} / ${Math.round(Number(extra.monthlyLimit))}`
        : undefined
    }
  } catch (err) {
    last = 'usage: n/a'
  }
  $.ui.status(last)
  return last
}

// Show the last known value (or a placeholder) right away, then refresh it.
function show($: any) {
  $.ui.status(last ?? 'usage …')
  refresh($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'credits',
      description: 'Refresh and show extra-usage credits in the status line',
    })
    show($)
    $.clock.every(60 * 1000, () => refresh($))
    return next(e)
  })

  on('command.run', { command: 'credits' }, async $ => {
    const text = await refresh($)
    // Success shows in the status line; only print when something went wrong.
    if (text === 'usage: n/a') {
      return { text: 'Usage could not be read right now. Try again in a minute.' }
    }
    if (!text) return { text: 'Extra usage is not enabled on this account.' }
    return {}
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
    refresh($)
    return next(e)
  })
}
