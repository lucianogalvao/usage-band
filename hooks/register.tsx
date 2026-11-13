import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Lang, Mode, Snap } from '../types'

const snap = atom({ plugin: 'usage-band', key: 'snap' } as const, null)
const mode = atom({ plugin: 'usage-band', key: 'mode' } as const, 'top')
const lang = atom({ plugin: 'usage-band', key: 'lang' } as const, 'en')

const MODES: Record<string, Mode> = { top: 'top', bottom: 'bottom', off: 'off', cima: 'top', baixo: 'bottom' }
const LANGS: Lang[] = ['en', 'pt']

const TEXT = {
  en: {
    five_hour: 'Session 5h:', seven_day: 'Weekly:', spend_limit: 'Spend:', context: 'Context:', resets: 'Resets:',
    short: { five_hour: '5h', seven_day: '7d' } as Record<string, string>,
    desc: 'Where to show session usage: top (band), bottom (compact line) or off; en/pt for the language',
    now: (m: Mode, l: Lang) => `Now: ${m}, ${l}. Use /usage-band top, bottom or off; en or pt for the language.`,
    done: { top: 'Band above the prompt.', bottom: 'Compact line below the prompt.', off: 'Usage hidden.' },
    lang: 'Language: English.',
  },
  pt: {
    five_hour: 'Sessão 5h:', seven_day: 'Semanal:', spend_limit: 'Gasto:', context: 'Contexto:', resets: 'Resets:',
    short: { five_hour: '5h', seven_day: 'sem' } as Record<string, string>,
    desc: 'Onde mostrar o uso da sessão: top (faixa), bottom (linha enxuta) ou off; en/pt para o idioma',
    now: (m: Mode, l: Lang) => `Agora: ${m}, ${l}. Use /usage-band top, bottom ou off; en ou pt para o idioma.`,
    done: { top: 'Faixa acima do prompt.', bottom: 'Linha enxuta embaixo do prompt.', off: 'Uso escondido.' },
    lang: 'Idioma: português.',
  },
}

const C = {
  claude: '#D97757',
  green: '#56d364',
  amber: '#e3b341',
  red: '#f85149',
  gold: '#f2cc60',
  muted: '#7d8590',
}

// "claude-opus-5-5" becomes "Opus 5.5"; anything else is shown as it came
const modelName = (id: string) => {
  if (!id.startsWith('claude-')) return id
  const tail = id.slice('claude-'.length).match(/^([^[]*)(\[.*\])?$/)
  const words = (tail?.[1] ?? '').split('-').filter(w => !/^\d{8}$/.test(w))
  const family = words.shift() ?? ''
  if (!family || !words.length || !words.every(w => /^\d+$/.test(w))) return id
  return `${family[0]!.toUpperCase()}${family.slice(1)} ${words.join('.')}${tail?.[2] ?? ''}`
}

const level = (pct: number, warn: number, crit: number) => (pct >= crit ? C.red : pct >= warn ? C.amber : C.green)

const tok = (n: number) => {
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${Number((n / 1_000_000).toFixed(1))}M`
}

const dur = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

// ten cells, each one 10% of the window
const bar = (pct: number) =>
  Array.from({ length: 10 }, (_, i) => (pct >= i * 10 + 5 ? '█' : '░')).join('')

// The compact line: "Opus 5.5 · 5h 20% · 7d 17% · ctx 18%"
export const compactLine = (s: Snap, l: Lang) => {
  const parts: string[] = []
  if (s.model) parts.push(modelName(s.model))
  for (const kind of ['five_hour', 'seven_day']) {
    const lim = s.limits.find(x => x.kind === kind)
    if (lim) parts.push(`${TEXT[l].short[kind]} ${Math.round(lim.pct)}%`)
  }
  if (s.ctxPct !== null) parts.push(`ctx ${Math.round(s.ctxPct)}%`)
  return parts.length ? parts.join(' · ') : undefined
}

async function paintLine($: any) {
  const s = await read($, snap)
  $.ui.status((await read($, mode)) === 'bottom' && s ? compactLine(s, await read($, lang)) : undefined)
}

async function measure($: any) {
  try {
    const u = await $.session.usage()
    let model: string | null = null
    try { model = await $.session.model() } catch {}
    const next: Snap = {
      at: await $.clock.now(),
      model,
      ctxPct: u.context.percent ?? null,
      ctxTokens: u.context.tokens ?? null,
      ctxWindow: u.context.window,
      limits: u.rateLimits.map((l: any) => ({ kind: l.kind, pct: l.percentUsed, resetsAt: l.resetsAt })),
      usd: u.cost?.usd ?? null,
    }
    await update($, snap, () => next)
    await paintLine($)
  } catch {
    // session not bound yet; the next measurement tries again
  }
}

export const register: Register = on => {
  let timer: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    // mode and language are kept across sessions
    const savedMode = MODES[String(await $.store.get('mode'))]
    const savedLang = await $.store.get('lang')
    if (savedMode) await update($, mode, () => savedMode)
    if (LANGS.includes(savedLang as Lang)) await update($, lang, () => savedLang as Lang)
    await $.command.register({
      name: 'usage-band',
      description: TEXT[await read($, lang)].desc,
      argumentHint: 'top | bottom | off | en | pt',
    })
    timer?.cancel()
    // the engine pushes new figures (session.measure); this only moves the reset countdowns
    timer = $.clock.every(60000, () => measure($))
    await measure($)
    return next(e)
  })

  on('command.run', { command: 'usage-band' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (LANGS.includes(arg as Lang)) {
      await update($, lang, () => arg as Lang)
      await $.store.set('lang', arg)
      await paintLine($)
      return { text: TEXT[arg as Lang].lang }
    }
    const l = await read($, lang)
    const m = MODES[arg]
    if (!m) return { text: TEXT[l].now(await read($, mode), l) }
    await update($, mode, () => m)
    await $.store.set('mode', m)
    await paintLine($)
    return { text: TEXT[l].done[m] }
  })

  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    await measure($)
    return r
  })

  // catches a /model switch without waiting for the next measurement
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    await measure($)
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snap)
    if (e.props.hasSurvey || s === null || (await read($, mode)) !== 'top') return next(e)

    const t = TEXT[await read($, lang)]
    const { Text } = $.ui.resolve(e)
    const parts: any[] = []

    if (s.model) parts.push(<Text color={C.claude} bold>{modelName(s.model)}</Text>)

    for (const l of s.limits) {
      const left = l.resetsAt ? (Date.parse(l.resetsAt) - s.at) / 1000 : null
      const c = level(l.pct, 60, 85)
      const label = (t as Record<string, unknown>)[l.kind]
      parts.push(
        <Text>
          <Text color={C.amber}>{typeof label === 'string' ? label : l.kind} </Text>
          <Text color={c}>{bar(l.pct)}</Text>
          <Text color={c} bold> {Math.round(l.pct)}%</Text>
          {left !== null && left > 0 ? <Text color={C.muted}>  {t.resets} {dur(left)}</Text> : null}
        </Text>,
      )
    }

    if (s.ctxPct !== null) {
      const c = level(s.ctxPct, 50, 80)
      parts.push(
        <Text>
          <Text color={C.amber}>{t.context} </Text>
          <Text color={c}>{bar(s.ctxPct)}</Text>
          <Text color={c} bold> {Math.round(s.ctxPct)}%</Text>
          {s.ctxTokens !== null ? <Text color={C.muted}>  {tok(s.ctxTokens)}/{tok(s.ctxWindow)}</Text> : null}
        </Text>,
      )
    }

    if (s.usd !== null) {
      parts.push(
        <Text>
          <Text>💰 </Text>
          <Text color={C.gold} bold>${s.usd.toFixed(2)}</Text>
        </Text>,
      )
    }

    if (!parts.length) return next(e)
    const sep = <Text>   </Text>
    return <Text>{parts.flatMap((p, i) => (i ? [sep, p] : [p]))}</Text>
  })
}
