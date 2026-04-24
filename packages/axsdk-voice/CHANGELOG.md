# Changelog

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
