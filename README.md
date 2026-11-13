# usage-band

Session usage at a glance for Claude Code: how close you are to your plan limits, how full the context is and what the session costs, without running `/cost` or `/context`.

Two looks, switched with one command:

**Top**: a colored band above the prompt.

```
Opus 5.5   Session 5h: ██░░░░░░░░ 20%  Resets: 4h 33m   Weekly: ██░░░░░░░░ 17%  Resets: 3d 19h   Context: ██░░░░░░░░ 18%  183k/1M   💰 $3.38
```

**Bottom**: a compact line below the prompt.

```
Opus 5.5 · 5h 20% · 7d 17% · ctx 18%
```

## Install

At the prompt of a terminal session:

```
/plugin install usage-band --marketplace lucianogalvao/usage-band
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```bash
claude plugin install usage-band --marketplace lucianogalvao/usage-band
```

## Commands

| Command | What it does |
|---|---|
| `/usage-band top` | Band above the prompt (default) |
| `/usage-band bottom` | Compact line below the prompt |
| `/usage-band off` | Hide it |
| `/usage-band pt` / `en` | Portuguese or English labels |
| `/usage-band` | Show the current mode and language |

The mode and language are remembered across sessions.

## What each part means

| Part | Meaning |
|---|---|
| Model | The model the session is on. |
| Session 5h | Your plan's 5-hour window and the time until it resets. Green, amber from 60%, red from 85%. |
| Weekly | Your plan's weekly window and the time until it resets. Same colors. |
| Context | How full the context window is. Green, amber from 50%, red from 80%. |
| 💰 | What the session would cost at API prices. On a subscription this is a reference, not a charge. |

## Requirements

- A recent Claude Code: it uses the plugin hooks API (`ui.render`, `$.session.usage`, `$.ui.status`).
- The 5-hour and weekly parts appear only on a Pro or Max plan, where the API reports rate limits. On API-key billing they are hidden.

## Privacy

Everything is read from Claude Code's own session figures. The plugin makes no network calls, runs no shell commands and reads no files.

## Português

Uso da sessão sem sair do prompt: limites do plano (5h e semanal), contexto e custo. `/usage-band pt` troca os textos para português (Sessão 5h, Semanal, Contexto); `/usage-band top`, `bottom` ou `off` escolhe onde mostrar (`cima` e `baixo` também funcionam).

## License

MIT
