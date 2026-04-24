# @axsdk/browser

[![npm version](https://img.shields.io/npm/v/@axsdk/browser)](https://www.npmjs.com/package/@axsdk/browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Vanilla JS embed for the [AXSDK](https://axsdk.ai) AI chat widget. Drop one `<script>` tag on any page and the chat mounts itself. No framework required, no build step.

---

## Architecture

Single IIFE bundle. `@axsdk/core`, `@axsdk/react`, and `@axsdk/voice` are bundled in; React renders `<AXUI />` directly into the host page's DOM. Styles are scoped via `all: initial` on an `.ax-portal-root` element, so the widget renders identically regardless of the host page's CSS.

> Historical note: the package used to load inside a sandboxed `<iframe>` with postMessage RPC. That's been removed — the current build renders in-process for better performance, simpler debugging, and direct access to `@axsdk/core` APIs from the host.

---

## Features

- **Zero-dependency embed** — single `<script>` tag, no npm / bundler required
- **CSS isolation** — `all: initial` reset on `.ax-portal-root` keeps host styles out
- **Responsive sizing** — full-screen on mobile (≤ 767 px), 420 × 680 px panel on desktop; live switch via `matchMedia`
- **Direct `axHandler`** — AI tool-call callback runs as a normal function (no RPC bridge)
- **`destroy()` API** — unmounts React, removes the host element + `<style>` tag, disposes the voice plugin
- **Optional voice I/O** — add a `voice` config to stream mic audio through your transcription proxy and speak assistant replies via TTS (see `examples/03_voice.html`)
- **Public event bus + plugin handle** — `AXSDKBrowser.eventBus()` for host-side subscribers, `AXSDKBrowser.voice()` for programmatic voice control

---

## Installation

### CDN / `<script>` tag

```html
<script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
```

That's the whole install. `dist/axsdk-browser.js` is a self-contained IIFE with CSS inlined — no additional assets to host.

### npm / bun (for build pipelines)

```bash
npm install @axsdk/browser
# or
bun add @axsdk/browser
```

---

## Quick start

```html
<!DOCTYPE html>
<html>
  <body>
    <script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
    <script>
      AXSDK.init({
        apiKey: 'YOUR_API_KEY',
        appId:  'YOUR_APP_ID',
      });
    </script>
  </body>
</html>
```

Global `AXSDK` is the `AXSDKBrowser` object (`init`, `destroy`, `voice`, `eventBus`). A floating chat button appears in the bottom-right; clicking opens the chat popup.

### With `axHandler`

```js
AXSDK.init({
  apiKey: 'YOUR_API_KEY',
  appId:  'YOUR_APP_ID',
  axHandler: async (command, args) => {
    if (command === 'getUser') return { name: 'Alice', role: 'admin' };
    throw new Error(`unknown command: ${command}`);
  },
});
```

`axHandler` runs in the host page's JS context — no serialization, no postMessage. Throw to signal errors; the rejection surfaces to the assistant.

### With voice (optional)

```js
AXSDK.init({
  apiKey: 'YOUR_API_KEY',
  appId:  'YOUR_APP_ID',
  voice: {
    wsUrl:  'wss://voice.example.com/ws',
    ttsUrl: 'https://voice.example.com/tts',
    // apiKey/appId default to the outer config — the voice proxy
    // validates the same AXSDK shared secret.
  },
});

// Optional: surface voice errors + iOS autoplay unlock
const bus = AXSDK.eventBus();
bus.on('voice.tts.gesture_required', () => {
  document.addEventListener(
    'click',
    () => AXSDK.voice()?.unlockAudio(),
    { once: true },
  );
});
```

Full voice reference: see [`@axsdk/voice`](../axsdk-voice/README.md). Runnable example: `examples/03_voice.html`.

---

## API reference

### `AXSDKBrowser.init(config)`

Initializes the SDK, mounts the widget, and optionally attaches the voice plugin. Idempotent-with-warning — a second call logs `[AXSDKBrowser] Already initialized` and no-ops.

```ts
AXSDKBrowser.init(config: AXSDKBrowserConfig): void
```

#### `AXSDKBrowserConfig`

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✅ | AXSDK API key. Also used as the shared secret for the voice proxy. |
| `appId` | `string` | ✅ | AXSDK application ID. Also used as the shared secret for the voice proxy. |
| `axHandler` | `(command, args) => Promise<unknown>` | — | AI tool-call handler |
| `theme` | `AXTheme` | — | Theme overrides (see `AXTheme` type) |
| `voice` | `AXSDKBrowserVoiceConfig` | — | Voice I/O — see below |
| `[key]` | `unknown` | — | Additional keys forwarded to `AXSDK.init()` (`debug`, `language`, `translations`, `headers`, `env`, `data`, `knowledge`, …) |

#### `AXSDKBrowserVoiceConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `wsUrl` | `string` | — | WebSocket URL of your transcription proxy (`ws://` / `wss://`) |
| `ttsUrl` | `string` | — | HTTP URL of your TTS proxy (`http://` / `https://`) |
| `apiKey` | `string` | outer `apiKey` | Override voice-proxy credentials if they differ from AXSDK's |
| `appId` | `string` | outer `appId` | ↑ |
| `ttsVoice` | `string` | `'alloy'` | TTS voice name |
| `stt` / `tts` | `boolean` | `true` / `true` | Independent STT / TTS toggles |
| `mode` | `'assistant' \| 'echo'` | `'assistant'` | `echo` speaks the user's transcript instead of the assistant reply — dev/demo |
| `vad` | `Partial<VadConfig>` | `{}` | VAD tuning — see `@axsdk/voice` reference |
| `autoActivateWhileChatOpen` | `boolean` | `true` | Auto-start capture when chat opens |
| `primeMicOnAttach` | `boolean` | `true` | Request mic permission at init time (reduces first-open latency) |
| `debug` | `boolean` | `false` | Verbose voice logs |

### `AXSDKBrowser.destroy()`

Unmounts React, removes the host element, detaches the voice plugin, revokes the worklet blob URL, removes injected `<style>`.

### `AXSDKBrowser.voice()`

Returns the `VoicePlugin` instance if voice was configured, else `null`. Use this for host-side operations like iOS autoplay unlock:

```js
AXSDK.voice()?.unlockAudio();
AXSDK.voice()?.update({ tts: false });
```

### `AXSDKBrowser.eventBus()`

Returns the `@axsdk/core` event emitter. Subscribe to `voice.*`, `message.chat`, `session.*`, etc.

---

## Runtime layout

```
document.body
└── #axsdk-browser-host          (position: fixed; 0×0; z-index: max)
    └── #axsdk-root.ax-portal-root   (React root — <AXUI /> renders here)
```

`z-index: 2147483647` (max int32) so the widget floats above any host overlay. `pointer-events: none` on the host wrapper lets clicks pass through dead zones; visible child elements re-enable their own pointer events.

CSS isolation applied on `.ax-portal-root`:
- `all: initial` — wipes inherited host styles
- `font-size: 16px` — anchors all `em` units used internally
- `box-sizing: border-box` (inherited by all descendants)
- plus a `font-family` / `line-height` / `direction` / smoothing reset

Don't loosen these — `@axsdk/react` depends on them for visual consistency across host pages.

---

## Mobile sizing

| Viewport | Position | Size |
|---|---|---|
| Desktop (> 767 px) | `right: 1.25em; bottom: …` | 420 × 680 px panel |
| Mobile (≤ 767 px) | edge-to-edge | `100% × 100dvh` |

Sizing updates live when the viewport crosses 767 px (`matchMedia`).

---

## Build

```bash
bun run build    # vite build → dist/axsdk-browser.js + inlined CSS
bun run dev      # vite dev server (serves examples/)
```

Output: **`dist/axsdk-browser.js`** — single IIFE with global name `AXSDK`. CSS is inlined into the JS bundle by a custom Vite plugin (`inlineCssPlugin` in `vite.config.ts`); no separate `.css` file ships. The `@axsdk/voice` AudioWorklet source is also inlined as a string constant at build time and wrapped in a Blob + `URL.createObjectURL` at runtime.

---

## Examples

| File | Shows |
|---|---|
| `examples/01_sitemap_faq.html` | Basic setup + sitemap knowledge |
| `examples/02_theme.html` | Theme customization |
| `examples/03_voice.html` | Voice I/O (mic capture + TTS playback) |

---

## Related packages

| Package | Role |
|---|---|
| [`@axsdk/core`](../axsdk-core/README.md) | Framework-agnostic core — session, SSE, event bus |
| [`@axsdk/react`](../axsdk-react/README.md) | React components — `<AXUI />` and primitives |
| [`@axsdk/voice`](../axsdk-voice/README.md) | Voice I/O plugin — VAD-gated mic + TTS playback |

---

## License

MIT © [Layorix Inc.](https://github.com/layorixinc)
