import { expect, test } from 'claude-code/testing'

import { compactLine } from './hooks/register'

const SNAP = {
  at: 0,
  model: 'claude-opus-5-5',
  ctxPct: 18.4,
  ctxTokens: 183300,
  ctxWindow: 1000000,
  limits: [
    { kind: 'five_hour', pct: 20, resetsAt: '2026-11-13T20:00:00Z' },
    { kind: 'seven_day', pct: 17.2 },
  ],
  usd: 3.38,
}

test('compact line in English and Portuguese', async () => {
  expect(compactLine(SNAP, 'en')).toBe('Opus 5.5 · 5h 20% · 7d 17% · ctx 18%')
  expect(compactLine(SNAP, 'pt')).toBe('Opus 5.5 · 5h 20% · sem 17% · ctx 18%')
})

test('compact line leaves out what the engine has no figure for', async () => {
  expect(compactLine({ ...SNAP, model: null, limits: [], ctxPct: null }, 'en')).toBe(undefined)
  expect(compactLine({ ...SNAP, limits: [] }, 'en')).toBe('Opus 5.5 · ctx 18%')
})
