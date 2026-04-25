# Changelog

## 0.2.2 — 2026-04-25

- Peer bumped to `@axsdk/core ^0.4` (new plugin system — AXSDK.use / unload / plugin / plugins)
- Emits `voice.session.restored` on attach when the chat was already open
  (typically a persisted Zustand state restored from localStorage). Host apps
  can surface a "voice resumed from previous session" indicator.
- New `resumeOnRestore: boolean` config (default `true`). When `false`, a
  restored session does NOT auto-start capture — the host shows a "Resume
  voice?" prompt and calls `plugin.resume()` from inside the click handler.
  This fixes the iOS Safari issue where AudioContext starts in `suspended`
  state without a user gesture.
- New public method `plugin.resume()` — start capture now. Idempotent. No-op
  if capture is already running, the chat is closed, or stt is disabled.
- `capture.ts` calls `audioContext.resume()` when the context starts
  suspended (iOS Safari) — succeeds inside a gesture, silently no-ops
  otherwise.

## 0.2.1 — 2026-04-24

- Bundled into `@axsdk/browser@0.3.9` via a `voice` config key on `AXSDKBrowser.init()`. The browser embed inlines the `pcm-worklet.js` source so no extra asset needs to be served.

## 0.2.0 — 2026-04-24

- Silero VAD as an optional engine (`vad.engine: 'silero'`). Loaded via dynamic import from `@ricky0123/vad-web` (optional peer dep — install it yourself to opt in). 16 kHz Float32 frames from MicVAD are resampled to 24 kHz PCM16 before forwarding to the transport. `rms` remains the default.
- New thresholds `sileroPositiveThreshold` (0.5 default) and `sileroNegativeThreshold` (0.35) in `VadConfig`.

## 0.1.0 — 2026-04-24

Initial release.

- `VoicePlugin` — auto-activates while the AXSDK chat is open; subscribes to `chatStore` for session open/close and `busy → idle` transitions.
- Client-side VAD gate (RMS + preroll + hang + min-utterance) so silence is never sent upstream.
- `VoiceTransport` abstraction with a default `OpenAIRealtimeTransport` targeting the reference proxy's `/ws` + `/tts` wire format.
- TTS playback with streaming (`MediaSource` + `audio/mpeg`) when available, blob fallback otherwise.
- Barge-in: VAD rising edge aborts active TTS.
- iOS autoplay unlock: `voice.tts.gesture_required` event + `plugin.unlockAudio()` helper.
- Background pause via `document.visibilitychange` — resumes on re-visibility if chat still open.
- Runtime toggles (`stt`, `tts`, `mode`, `vad`) via `plugin.update(partial)`.
- Auth: `apiKey` + `appId` forwarded as `x-api-key` / `x-app-id` (HTTP) and `?api_key=` / `?app_id=` (WS).
