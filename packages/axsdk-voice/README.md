# @axsdk/voice

Voice I/O plugin for the AXSDK chat platform. Captures microphone audio (VAD-gated), streams it to a transcription proxy, dispatches finalized utterances into the chat pipeline, and speaks assistant replies back through TTS.

**Status:** `0.1.0` — scaffolding. Full behavior lands in Phases 2–5.

## Design overview

- **Registration-only** — no voice button UI. Attach the plugin to an initialized `AXSDK` and, while the chat session is open, voice activates automatically.
- **Client-side VAD gate** — silence is dropped before it hits the wire. Saves upstream bandwidth and proxy cost.
- **Independent STT / TTS toggles** — either direction can be disabled at config or runtime.
- **Pluggable transport** — `VoiceTransport` interface lets you swap the OpenAI backend for Azure, Deepgram, etc.
- **No secrets in the package** — the OpenAI API key lives in the proxy server you deploy. See the reference proxy in [`axsdk-voice`](https://github.com/layorixinc/axsdk-voice) (this package's upstream repo).

## Quickstart (Phase 5+)

```ts
import { AXSDK } from '@axsdk/core';
import { VoicePlugin, OpenAIRealtimeTransport } from '@axsdk/voice';

await AXSDK.init({ apiKey: '...', appId: '...' });

const voice = new VoicePlugin({
  transport: new OpenAIRealtimeTransport({
    wsUrl: '/ws',
    ttsUrl: '/tts',
  }),
  workletUrl: '/pcm-worklet.js', // served by your host (only needed for standalone use — see below)
  // stt/tts default true; autoActivateWhileChatOpen default true.
});

voice.attach(AXSDK);
// Capture starts automatically when the user opens the chat.
// Disable at runtime: voice.update({ stt: false });
```

## Config

| Option | Default | Meaning |
|---|---|---|
| `transport` | — (required) | Voice transport instance |
| `stt` | `true` | Enable speech-to-text input |
| `tts` | `true` | Speak assistant replies |
| `mode` | `'assistant'` | `'assistant'` routes transcripts into chat; `'echo'` speaks the transcript itself |
| `source` | `'microphone'` | (Only `'microphone'` in MVP) |
| `workletUrl` | `'/pcm-worklet.js'` | Where the host serves the AudioWorklet (auto-injected as a blob URL when used via `@axsdk/react` or `@axsdk/browser` — set explicitly only for standalone use) |
| `vad` | see below | Client-side silence gate |
| `autoActivateWhileChatOpen` | `true` | Start capture automatically when the chat opens |
| `primeMicOnAttach` | `true` | Pre-request mic permission at attach time |

### VAD defaults

```ts
vad: {
  enabled: true,
  rmsThreshold: 0.015,   // 0..1, below this is silence
  speechHangMs: 400,     // keep forwarding this long after last voiced frame
  prerollMs: 200,        // send this much audio from before detection
  minUtteranceMs: 120,   // drop shorter bursts (taps, clicks)
}
```

## Serving the worklet

The `AudioWorklet` runs in a separate context and must be loaded from a URL.

- **Using `@axsdk/react` or `@axsdk/browser`**: nothing to do. The worklet source is inlined into the bundle at build time and served via a `Blob` + `URL.createObjectURL` at runtime. No static asset hosting required.
- **Using `@axsdk/voice` standalone**: this package ships the compiled JS at `public/pcm-worklet.js` and exposes it via the package export `@axsdk/voice/pcm-worklet.js`. Copy it into your static assets or wire your bundler to emit it, then pass the final URL as `workletUrl`.

## Events

All events are emitted on `AXSDK.eventBus()`:

| Event | Payload |
|---|---|
| `voice.state` | `{ status: 'idle'\|'connecting'\|'listening'\|'capturing'\|'speaking'\|'error' }` |
| `voice.vad.speech.started` / `voice.vad.speech.ended` | VAD transitions |
| `voice.transcript.delta` / `voice.transcript.finalized` | Streaming + committed transcripts |
| `voice.tts.queued` / `voice.tts.playback.started` / `voice.tts.playback.ended` | TTS lifecycle |
| `voice.error` | `{ scope: 'capture'\|'transport'\|'tts', message }` |

## Reference proxy

This package does not bundle a server. Deploy the reference proxy from the [`axsdk-voice`](https://github.com/layorixinc/axsdk-voice) repo (Bun + TypeScript, relays to OpenAI Realtime + TTS) or implement your own matching the transport's wire format.
