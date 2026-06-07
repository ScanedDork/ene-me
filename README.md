# Ene me

> **Reclaim yourself.** An open-source, local-first recovery & habit-reset toolkit with bring-your-own-AI.

Ene me helps you quit destructive habits and build new identity. Streak tracking, panic button, CBT thought reframing, AI urge coach, voice journaling, meditation, identity check-ins, and therapist-ready exports — all running entirely on your device by default.

**🔗 Live demo:** https://scaneddork.github.io/ene-me/

- **Local-first.** Your data lives in your browser (or your own server). No accounts, no cloud lock-in.
- **Bring your own AI.** OpenAI, Anthropic, Gemini, Ollama, LM Studio, or any OpenAI-compatible endpoint. Your API keys never leave your device.
- **Flexible storage.** In-memory, browser localStorage, or your own HTTPS endpoint.
- **MIT licensed.** Fork it, self-host it, modify it.

---

## Quick start (run locally)

```bash
git clone https://github.com/ScanedDork/ene-me
cd ene-me
bun install        # or: npm install / pnpm install
bun run dev        # or: npm run dev
```

Open <http://localhost:5173>. That's it — no backend required.

### Configure your AI

1. Open **AI Provider** in the sidebar.
2. Pick a provider, paste your API key (or point at your local Ollama / LM Studio), pick a model, hit **Test connection**.
3. Save. Coach, journal summarization, CBT reframes, and weekly reflections now use your provider.

Supported out of the box: OpenAI · Anthropic · Google Gemini · Ollama · LM Studio · any OpenAI-compatible endpoint (vLLM, llama.cpp, OpenRouter, Groq, Together, ...).

### Configure your storage

Open **Storage** in the sidebar and pick:

| Mode | What it does | When to use |
| --- | --- | --- |
| **In-memory** | Nothing persists. Data clears when you close the tab. | Maximum privacy / one-off sessions. |
| **This browser** | localStorage on this device. *Default.* | Single-device, fully offline. |
| **My server** | Sync to any HTTPS endpoint you control. | Multi-device, self-hosted. |

---

## Self-hosting the sync server

The server contract is intentionally tiny:

```
GET  ${baseUrl}/${path}   -> 200 application/json (your AppState blob), or 404 if none
PUT  ${baseUrl}/${path}   -> body is AppState JSON, any 2xx is success
                              Headers: Authorization: Bearer <token>   (if you set one)
                              Headers: Content-Type: application/json
```

A reference Node implementation ships in [`server/`](./server). Run it with:

```bash
cd server
node index.mjs                                  # default: port 8787, no auth, ./data dir
ENE_PORT=9000 ENE_TOKEN=secret node index.mjs   # with bearer token
```

Then in the app: **Storage → My server**, URL `http://localhost:8787`, path `state`, token if you set one.

CORS: the reference server allows all origins. For production, lock it to your app's origin.

---

## Architecture

- **Frontend:** TanStack Start v1 + React 19 + Vite 7 + Tailwind v4 + shadcn/ui.
- **Routing:** File-based via `src/routes/`.
- **Storage adapter:** `src/lib/storage.ts` — pluggable memory / localStorage / HTTP backends.
- **AI client:** `src/lib/ai-client.ts` — direct browser-to-provider calls, no server in the loop.
- **State:** Single `AppState` JSON blob in `src/lib/store.ts`, mirrored to whichever storage backend you chose.

Folder map:

```
src/
  routes/          # every .tsx is a page (file-based routing)
  components/      # AppSidebar, shadcn/ui primitives
  lib/
    store.ts       # AppState shape + useStore() hook
    storage.ts     # pluggable storage backend
    ai-client.ts   # multi-provider AI client
server/            # optional reference sync server (Node, no deps)
```

---

## Features

- **Habit tracking** with replacement habits, streaks, and milestones.
- **Panic button** — instant urge interrupt with breathing, tips, and cold-water cue.
- **AI urge coach** — short, CBT-flavored conversations using your provider.
- **CBT module** — cognitive distortion tagging + AI-assisted reframing.
- **Voice journal** — Web Speech API transcript + AI summarization (mood, craving, energy, triggers).
- **Crisis mode** — mandatory 60s pause before a relapse can be logged, with post-mortem wizard.
- **Identity-based streaks** — "I'm someone who…" daily check-ins.
- **Meditation library** — box breath, 4-7-8, body scan, urge surf, gratitude.
- **Insights** — trigger patterns, mood/craving trends, AI weekly reflection.
- **Therapist pack** — 4-week PDF export of mood/craving/CBT/relapse data.
- **Reports** — JSON + CSV export.
- **PWA** — installable, runs offline once loaded.

---

## Contributing

PRs welcome. Keep it local-first. Keep dependencies minimal. Open an issue first for anything large.

```bash
bun install
bun run dev
bun run lint
```

---

## Privacy

- No telemetry. No analytics. No accounts.
- AI calls go **directly** from your browser to the provider you chose. Ene me has no server in the loop unless you point one at the Storage tab.
- API keys, tokens, and all habit/journal/CBT data live in `localStorage` (or memory, or your server).
- This is not medical advice. If you're in crisis, please reach out to a professional or a crisis line in your country.

---

## Credits

Built with care by **Ramar Ranjeet Skanda**.

- GitHub: [github.com/ScanedDork](https://github.com/ScanedDork)
- Portfolio: [ranjeetskanda.com](https://ranjeetskanda.com)

Released under the [MIT License](./LICENSE). Use it, fork it, ship it.
