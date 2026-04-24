# @axsdk/voice examples

## `chat-voice.html` — standalone test harness

Wires `VoicePlugin` to `AXSDK` without requiring a live AXSDK backend. Use it to exercise:

- Chat-open → auto-start capture
- VAD gating (watch the "state" chip flip between `listening` and `capturing` when you speak vs. stay silent)
- Runtime toggles for STT / TTS / echo mode
- Fake `busy → idle` transition to drive TTS playback

### Prerequisites

1. Build both packages from the SDK monorepo root:

   ```bash
   cd ../axsdk-core && bun run build
   cd ../axsdk-voice && bun run build
   ```

2. Run the reference proxy from the `axsdk-voice` repo (separate checkout):

   ```bash
   cd /path/to/axsdk-voice
   cp .env.example .env   # set OPENAI_API_KEY
   bun install
   bun run dev            # listens on http://localhost:5173
   ```

### Run the demo

**Serve from the monorepo root** (`axsdk-sdk-js/`), not from `examples/`. The
HTML imports sibling packages with relative paths (`../../axsdk-core/dist/…`)
which only resolve when `packages/` is inside the server's root.

```bash
cd axsdk-sdk-js              # monorepo root
bunx serve .                 # or: python3 -m http.server 3000
```

Open:

```
http://localhost:3000/packages/axsdk-voice/examples/chat-voice.html
```

in Chrome or Edge. The demo imports the built `dist/lib.js` from both
`@axsdk/core` and `@axsdk/voice` via relative paths — no npm install needed.

> If you see `Failed to load module` / 404 on `dist/lib.js`, you're almost
> certainly serving from `examples/` or from `packages/axsdk-voice/`. Go up
> to the monorepo root.

### What to verify

- [ ] Toggle "Chat is open" → state chip goes `idle → connecting → listening`. The browser prompts for mic permission on first run.
- [ ] Stay silent → the event log shows no `vad: speech started`. The proxy server should log zero-ish `input_audio_buffer.append` during silence.
- [ ] Speak → `vad: speech started` then `vad: speech ended` with a duration; transcript deltas arrive, then a finalized line.
- [ ] Uncheck "Chat is open" → capture stops, state returns to `idle`.
- [ ] Uncheck STT mid-session → capture stops without closing the demo. Re-check → capture resumes on next chat-open cycle.
- [ ] Fill the assistant text, click "Simulate busy → idle" with TTS on → plugin fetches TTS and plays it; log shows `tts queued`, `tts start`, `tts end`.
- [ ] Click the simulate button twice quickly with the same message id → only one playback (dedupe).
- [ ] Toggle "Echo mode", then speak → finalized transcript plays back as its own TTS (no assistant pipeline).
