# AGENTS.md — `@axsdk/voice`

Guidance for AI coding agents working inside `packages/axsdk-voice`. See the repo-root [`AGENTS.md`](../../AGENTS.md) and [`packages/axsdk-core/AGENTS.md`](../axsdk-core/AGENTS.md) first — the monorepo rules apply here.

## Purpose

Optional voice I/O plugin for `@axsdk/core`. While a chat session is open, the plugin captures microphone audio (VAD-gated), streams it to a user-supplied transcription proxy, routes finalized transcripts into the chat as user messages, and speaks assistant replies through TTS once the session transitions to `idle`.

## Hard rules

- **Never bundle a server in this package.** The package is DOM-only; the reference proxy lives in the standalone `axsdk-voice` repo and is deployed separately by consumers.
- **Never touch `OPENAI_API_KEY` client-side.** Keys live in the user's proxy.
- **No React.** If a React wrapper is needed later, it must be a separate package.
- **DOM APIs are expected** (`AudioContext`, `AudioWorkletNode`, `MediaStream`, `WebSocket`, `fetch`, `<audio>`). The package is not meant to run in Node.
- **Respect strict TS** (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`). Audio buffers have a lot of index access — narrow every `[0]`.

## Source layout (`src/`)

| File | Role |
|---|---|
| `lib.ts` | Public entry — exports `VoicePlugin`, `OpenAIRealtimeTransport`, types |
| `plugin.ts` | `VoicePlugin` — attach/detach, chat-open listener, session-status watcher, config updates |
| `capture.ts` | `getUserMedia` + `AudioContext` + `AudioWorkletNode` glue (Phase 2) |
| `vad.ts` | Pure RMS-based voice activity state machine (Phase 2) |
| `transport.ts` | `VoiceTransport` interface + default `OpenAIRealtimeTransport` |
| `tts-player.ts` | Queued `<audio>` playback keyed by `messageId` (Phase 4) |
| `usage.ts` | Optional client-side cost metering (console) |
| `pcm-worklet.ts` | Exports the worklet asset URL helper |

`public/pcm-worklet.js` is the raw AudioWorklet source. Exposed via package export `@axsdk/voice/pcm-worklet.js`.

- `@axsdk/react` and `@axsdk/browser` read this file at **build time** via Vite `define` (`__AXSDK_PCM_WORKLET__`) and inline it into their bundles, then create a `Blob` URL at runtime — host needs no static asset.
- Standalone `@axsdk/voice` consumers must serve it themselves and pass `workletUrl` to `VoicePlugin`.

## Build

```bash
bun run build        # bun ./build.ts && tsc --emitDeclarationOnly
bun run build:types
```

Produces `dist/lib.js` (ESM), `dist/lib.cjs` (CJS), `dist/lib.d.ts`. Both bundles are minified and browser-targeted, prefixed with `"use client";` for RSC safety (matching `@axsdk/core`).

## Integration contract with `@axsdk/core`

- Plugin depends on `@axsdk/core` as a **peer**.
- It subscribes to `AXSDK.getChatStore()` (Zustand) to detect chat open/close and `session.status` transitions.
- Voice IN emits via `AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.message', data: { text, images: [] } })` — same event shape as `AXSDK.sendMessage()`.
- Voice OUT watches `chatStore.session.status`. Primary trigger: `busy → idle`. Fallback: last assistant message stops receiving deltas for ~800 ms.
- Plugin must be tolerant of core version drift — validate store shape when subscribing; fail soft on missing fields.

## VAD

- Runs on the main thread, consuming Int16 PCM frames (100 ms at 24 kHz = 2400 samples) from the worklet.
- Ring buffer holds `prerollMs` of pre-voice audio so we don't clip speech onsets.
- Client VAD is a **gate**, not a segmenter. Utterance boundaries are still detected by the server (OpenAI `turn_detection: server_vad`).

## Transport

- `VoiceTransport` bundles STT (audio in / transcript events out) and TTS (text in / audio blob out). Hosts can implement either side as a no-op.
- Default `OpenAIRealtimeTransport` wraps the reference proxy's `/ws` + `/tts` wire format. Not tied to OpenAI directly — swappable.

## Versioning

- Pre-1.0 — breaking changes allowed in minor bumps, called out in commit message.
- Pin to `@axsdk/core ^0.3` until core ships 0.4.
- **Do not publish** without explicit user request.

## What to be careful about

- `<audio>` autoplay: the first chat-open must be user-initiated or TTS may fail on the first utterance. Plugin falls back to `voice.error` with scope `'tts'`.
- AudioWorklet URL: when integrating via `@axsdk/react` or `@axsdk/browser` the worklet is inlined as a blob URL at build time — `workletUrl` is auto-supplied. Standalone `@axsdk/voice` consumers must serve `public/pcm-worklet.js` and pass `workletUrl`. Both packages also patch missing `workletUrl` in server-injected `voice.config.remote` payloads, so server `voiceConfig` doesn't 404 on `/pcm-worklet.js`.
- Do not tear down `AudioContext` on transient transport errors — just reopen the socket. Tearing down the context forfeits the mic gesture and forces another permission prompt.
- If both the primary (`session.status`) and fallback (`delta-quiet timeout`) fire for the same assistant message, only speak once — dedupe by `messageId` in the TTS queue.
