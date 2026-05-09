# AGENTS.md for `@axsdk/voice`

Guidance for agents working in `packages/axsdk-voice` only. Root monorepo rules still apply; this file covers voice-specific facts.

## PACKAGE ROLE

`@axsdk/voice` is the optional voice I/O plugin for AXSDK chat. It captures microphone audio in the browser, gates speech with VAD, sends audio to a user-supplied transport, dispatches finalized transcripts into chat, and plays assistant replies through TTS.

Current package version: `0.2.27`.

## HARD RULES

- No server code belongs in this package.
- Never read, pass, or document `OPENAI_API_KEY` for client-side use. Secrets stay in the user's proxy.
- No React imports or React components. React integration belongs in `@axsdk/react`.
- DOM APIs are expected: `AudioContext`, `AudioWorkletNode`, `MediaStream`, `WebSocket`, `fetch`, `Blob`, `URL`, and `<audio>`.
- This package is browser-facing. Do not make changes that imply it runs as a Node runtime package.
- Keep `@axsdk/core` external in builds.

## SOURCE LAYOUT

| Path | Purpose |
|---|---|
| `src/lib.ts` | Public entry point and exports |
| `src/plugin.ts` | `VoicePlugin`, attach/detach, config updates, chat lifecycle wiring |
| `src/capture.ts` | Microphone capture, `AudioContext`, worklet hookup |
| `src/vad.ts` | RMS/Silero VAD gate and utterance buffering |
| `src/transport.ts` | `VoiceTransport` contract and `OpenAIRealtimeTransport` proxy client |
| `src/tts-player.ts` | Queued browser audio playback, deduped by `messageId` |
| `src/tts-cache.ts` | TTS result caching |
| `src/usage.ts` | Optional client-side usage accounting |
| `src/pcm-worklet.ts` | Helper surface for the PCM worklet asset |
| `src/silero-capture.ts` | Optional Silero VAD capture path using `@ricky0123/vad-web` |
| `src/state/*.ts` | Robot state machines for STT, TTS, and transport flow |
| `src/vad.test.ts` | Ad-hoc VAD harness runnable with Bun |
| `src/state/machines.test.ts` | Ad-hoc state machine harness runnable with Bun |
| `public/pcm-worklet.js` | Raw AudioWorklet source shipped as a public asset |

## WORKLET CONTRACT

`public/pcm-worklet.js` is exported as `@axsdk/voice/pcm-worklet.js`.

- `@axsdk/react` and `@axsdk/browser` inline the worklet at build time, then create a Blob URL at runtime.
- Standalone `@axsdk/voice` consumers must serve the worklet asset and pass `workletUrl`.
- Do not assume `/pcm-worklet.js` exists on the host page unless an integration supplied it.

## BUILD FACTS

```bash
bun run build        # bun ./build.ts && bun build:types
bun run build:types  # bunx tsc --emitDeclarationOnly
```

The Bun build emits browser-targeted bundles from `src/lib.ts`:

- `dist/lib.js`, ESM
- `dist/lib.cjs`, CJS
- linked source maps
- minified output
- `"use client";` banner
- `@axsdk/core` external

Types come from `tsc --emitDeclarationOnly` into `dist/lib.d.ts`.

## CORE INTEGRATION

`@axsdk/core` is a peer dependency using the workspace current version during local development. Current core is `0.4.x`, so published voice builds must stay compatible with that line.

The plugin integrates through public core surfaces:

- `AXSDK.getChatStore()` for the chat store
- `AXSDK.eventBus()` for events
- `message.chat` for transcript dispatch
- `session.status` changes for TTS timing

Voice input should emit the same chat event shape as normal text send paths. Voice output should prefer the `busy` to `idle` transition as the TTS trigger. If the core store shape drifts, validate fields, fail soft, and avoid throwing from subscriptions.

## GOTCHAS

- Browser autoplay can block first TTS playback unless activation follows a user gesture.
- Transient transport failures should not tear down mic capture or the `AudioContext`.
- TTS must dedupe by `messageId`, especially when both status and fallback triggers fire.
- VAD is a client-side gate, not the final utterance authority.
- `@ricky0123/vad-web` is optional. Keep Silero paths lazy and guarded.
- Never publish unless explicitly asked.
