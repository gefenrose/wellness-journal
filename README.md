# wellness-journal

A bilingual (English/Hebrew, RTL) mood journaling PWA with AI-assisted
writing prompts, entry reflection, and weekly insights.

## What's here

- `index.html` - the app: setup screen, mood slider (Suffering → Blissful),
  write/history/insights tabs, and entry modal
- `manifest.json` - PWA manifest (installable, standalone, portrait)
- `sw.js` - network-first service worker for offline support + auto-update
- `worker/` - Cloudflare Worker that proxies AI requests to the Groq API

## Status

Firebase Realtime Database (`wellness-journal-ab6b0`) syncs entries across
devices. AI features (writing prompts, entry reflection, weekly AI
reflection) are wired up to Groq via the worker below — no personal API
key is needed on-device.

## Set up the worker

Uses Groq's API (`llama-3.3-70b-versatile`, OpenAI-compatible), which has
a free tier — same provider as the Serenity worker.

1. Get a free API key at https://console.groq.com/keys
2. `cd worker`
3. Log in: `npx wrangler login`
4. Add the key as a secret: `npx wrangler secret put GROQ_API_KEY`
5. Deploy: `npx wrangler deploy`
6. Copy the resulting `*.workers.dev` URL into `WORKER_URL` near the top of
   the AI proxy section of the `<script>` in `index.html`, then commit and push.

The worker translates Groq's response into the shape the frontend
expects ({ content: [{ text }] }), so `index.html` doesn't need to know
which model is behind it — swapping providers again later only means
editing `worker.js`.

The worker only sets permissive CORS headers for a small allowlist of
origins (see `ALLOWED_ORIGINS` in `worker/worker.js`): the GitHub Pages PWA
(`https://gefenrose.github.io`) plus localhost for local testing. Add more
if you deploy elsewhere. Note this is CORS only, not real authentication —
anyone who finds the worker URL can still call it directly (bypassing
browser CORS) and spend your Groq quota. Fine for personal/low-traffic
use; add a shared-secret header check in `worker.js` if that's a concern.

## Deploy the app (PWA)

Enable GitHub Pages for this repo (Settings → Pages → branch: main,
folder: /). The app will be served at:

https://gefenrose.github.io/wellness-journal/
