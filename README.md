# EconAgent — Setup & Deployment

Economic intelligence dashboard. Two apps in this repo deploy separately to Vercel:

| Project | Root directory | Live example URL |
|---|---|---|
| Simple dashboard | `/` (repo root, `app/`) | econagent.vercel.app |
| Radar / HUD dashboard | `ecoagent-frontend/` | econagent-...-kavyakjais-6296s-projects.vercel.app |

This README covers the **radar / HUD dashboard** (`ecoagent-frontend/`) — the one with the rotating rings, mission control HUD, voice input, and the intel feed.

---

## File locations

```
ecoagent-frontend/
└── app/
    ├── page.tsx              ← main UI (rings, panels, composer, popup)
    └── api/
        ├── ask/
        │   └── route.ts      ← calls the AI model, server-side
        └── news/
            └── route.ts      ← fetches live headlines, server-side
```

All three files live entirely inside `ecoagent-frontend/app/`. Nothing outside that folder needs to change.

---

## Required environment variables

Set these in **Vercel → your project → Settings → Environment Variables**, for all three environments (Production, Preview, Development), then **redeploy** (saving a variable does not redeploy automatically).

| Variable | Required? | Where to get it | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | openrouter.ai/keys — free, no card | When creating the key, set **Expiration → No expiration** and **Credit limit → a small amount like $2** (not $0 — a hard $0 cap can reject even free-model calls). Powers the AI replies. |
| `OPENROUTER_MODEL` | No | — | Defaults to `openrouter/free`, which auto-picks whichever free model is currently available. Only set this if you want to pin a specific model. |
| `GNEWS_API_KEY` | No | gnews.io/register — free, no card | Powers the live ticker and popup headlines. If omitted, the app falls back to a small set of static sample headlines — nothing breaks. |

### Safe to delete from Vercel
These showed up in your environment variables list but nothing in this codebase calls them anymore: `ELEVENLABS_VOICE_ID`, `ELEVENLABS_API_KEY`, `YOUTUBE_API_KEY`, `NEWS_API_KEY`. Voice output now uses the browser's built-in, free text-to-speech instead of ElevenLabs. Removing unused variables isn't required, but keeping them around serves no purpose.

---

## What each file does

**`page.tsx`**
The full UI: rotating rings HUD, live metric panels (S&P/CPI/BTC), session sidebar, voice input ("Hey Eco" wake word + manual mic), text composer, intel feed, and the new **insight popup** (see below). It never talks to any AI or news provider directly — it only calls the two routes below, so no key is ever exposed in the browser.

**`api/ask/route.ts`**
Receives a question, sends it to OpenRouter's free model with a system prompt telling it to answer in-character as "EcoAgent" and never show its reasoning steps. Includes:
- A `reasoning: { exclude: true }` flag plus a text safety-strip, so reasoning-style free models can't leak their internal "thinking process" into the visible reply.
- A per-visitor cooldown (one request every 8 seconds) so a public link can't be spammed into exhausting the shared free-tier daily quota.

**`api/news/route.ts`**
Fetches business headlines from GNews for the ticker and the popup. Returns an empty list (triggering the static fallback) if `GNEWS_API_KEY` isn't set or the request fails — never throws.

---

## The insight popup

When a question gets answered, a small popup now opens centered over the rotating rings, with a close (✕) button. It shows:
- A bar chart matching the topic of the question (Bitcoin → BTC trend, inflation/CPI → CPI trend, anything else → S&P 500 trend)
- Up to 5 headlines from the ticker that share keywords with the question, falling back to the latest 5 if nothing matches

Note: the bar charts use the same illustrative sample data already used elsewhere on the dashboard (`SP`, `CPI`, `BTC` arrays near the top of `page.tsx`) — this project doesn't have a live market-data feed wired in, so treat the whole dashboard, popup included, as a portfolio demo rather than real-time trading data.

---

## Known limits (be upfront about these if asked)

- OpenRouter's free tier: 20 requests/minute, 50/day shared across everyone using your link. A one-time $10 credit top-up (non-expiring) raises the daily cap to 1,000 if you need more headroom before a demo.
- The per-visitor cooldown reduces casual spam but isn't a full defense against someone hitting your API from many different IPs — acceptable for a portfolio project, not for production traffic.
- Market data (S&P/CPI/BTC numbers shown across the dashboard) is static sample data, not a live feed.

---

## Quick redeploy checklist

1. Paste the three files into their exact locations above.
2. Confirm `OPENROUTER_API_KEY` is set (credit limit non-zero, no expiration).
3. Vercel → Deployments → latest → ⋯ → **Redeploy**.
4. Open the live URL, ask a question, confirm the popup opens and the reply doesn't include any "thinking process" text.
