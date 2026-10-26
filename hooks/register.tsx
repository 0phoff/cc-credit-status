import type { Register } from 'claude-code'

const SERVER = 'ccd_session_mgmt'

async function refresh($: any) {
  try {
    const { content } = await $.mcp.call(SERVER, 'get_usage', {})
    const text = content.find((c: any) => c.type === 'text')?.text ?? ''
    const extra = JSON.parse(text).plan?.extraUsage
    if (!extra?.enabled) return $.ui.status(undefined)
    $.ui.status(`${Number(extra.spent).toFixed(2)} / ${Math.round(Number(extra.monthlyLimit))}`)
  } catch (err) {
    $.ui.status('usage: n/a')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    refresh($)
    $.clock.every(60 * 1000, () => refresh($))
    return next(e)
  })

  on('session.attach', async ($, e, next) => {
    refresh($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    refresh($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    refresh($)
    return next(e)
  })
}
