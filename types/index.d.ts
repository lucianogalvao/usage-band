export type Mode = 'top' | 'bottom' | 'off'
export type Lang = 'en' | 'pt'
export type Limit = { kind: string; pct: number; resetsAt?: string }
export type Snap = {
  at: number
  model: string | null
  ctxPct: number | null
  ctxTokens: number | null
  ctxWindow: number
  limits: Limit[]
  usd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { snap: Snap | null; mode: Mode; lang: Lang }
  }
}
