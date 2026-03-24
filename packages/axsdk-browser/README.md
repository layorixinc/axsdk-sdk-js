# @axsdk/browser

[![npm version](https://img.shields.io/npm/v/@axsdk/browser)](https://www.npmjs.com/package/@axsdk/browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Vanilla JS embed SDK for the [AXSDK](https://axsdk.ai) AI chat widget. No framework required — drop a single `<script>` tag on any web page to embed a fully-featured AI chat widget inside a sandboxed iframe.

---

## Overview

`@axsdk/browser` loads the AXSDK chat UI inside an `<iframe>` using `srcdoc`, keeping the widget completely isolated from your host page's styles and scripts. Communication between the host page and the iframe is handled via `postMessage`.

```
Host Page                              iframe (srcdoc)
────────────────────────────────       ──────────────────────────────────────────
<script src="axsdk-browser.js">
AXSDKBrowser.init(config)  ─────────► AXSDK_INIT (postMessage)
                                        AXSDK.init({ ...config, axHandler: rpc })
                                        <AXUI /> mounted in document.body

AXSDK_HANDLER_REQUEST  ◄────────────  axHandler(command, args)  [RPC outbound]
user axHandler callback
AXSDK_HANDLER_RESPONSE ────────────► Promise resolves / rejects
```

The parent-page loader (`axsdk-browser.js`) has no React dependency and is very small. The full React + UI bundle (`axsdk-browser-frame.js`) is loaded inside the iframe.

---

## Features

- **Zero-dependency embed** — plain `<script>` tag, no npm required for the host page
- **iframe isolation** — widget styles and scripts cannot bleed into your host page
- **Responsive sizing** — full-screen on mobile (≤ 767 px), 420 × 680 px panel on desktop; adapts in real-time via `matchMedia`
- **postMessage communication** — secure, structured RPC protocol between host and iframe
- **`axHandler` RPC bridge** — AI tool-call handler runs on the host page, not inside the iframe; no cross-origin trust issues
- **Automatic frame bundle resolution** — frame bundle URL is derived from the loader script's `src`, no manual configuration needed
- **`destroy()` API** — cleanly removes the widget and releases all listeners

---

## Installation

### npm / bun (monorepo / build pipeline)

```bash
npm install @axsdk/browser
# or
bun add @axsdk/browser
```

### CDN / static hosting (recommended for vanilla JS)

Copy both files from the package's `dist/` folder to your CDN or web server:

| File | Purpose |
|---|---|
| `axsdk-browser.js` | Lightweight loader for the host page |
| `axsdk-browser-frame.js` | Self-contained iframe bundle (React + AXUI + CSS) |

Both files **must be served from the same path prefix** — the loader automatically derives the frame bundle URL from its own `src` attribute.

```html
<!-- Both files must live at the same URL prefix -->
<script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
```

---

## Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My App</title>
</head>
<body>
  <!-- Your page content -->

  <script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
  <script>
    AXSDKBrowser.init({
      apiKey: 'YOUR_API_KEY',
      appId:  'YOUR_APP_ID',
    });
  </script>
</body>
</html>
```

The widget will appear as a fixed floating button in the bottom-right corner of the viewport. Clicking it opens the full chat popup.

---

## Configuration / API Reference

### `AXSDKBrowser.init(config)`

Initializes and mounts the chat widget. Can only be called once per page load; subsequent calls are ignored with a console warning.

```ts
AXSDKBrowser.init(config: AXSDKBrowserConfig): void
```

#### `AXSDKBrowserConfig`

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✅ | Your AXSDK API key |
| `appId` | `string` | ✅ | Your AXSDK application ID |
| `axHandler` | `(command: string, args: unknown) => Promise<unknown>` | — | Callback invoked when the AI triggers an action. Runs on the host page; return value is sent back to the iframe. |
| `[key: string]` | `unknown` | — | Any additional serializable keys are forwarded to `AXSDK.init()` inside the iframe (e.g. `headers`, `language`, `debug`, `translations`) |

> **Note:** `axHandler` is **not** forwarded via `postMessage` (functions are not serializable). Instead, it is bridged transparently using the `AXSDK_HANDLER_REQUEST` / `AXSDK_HANDLER_RESPONSE` RPC protocol described below.

#### Example with `axHandler`

```html
<script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
<script>
  AXSDKBrowser.init({
    apiKey: 'YOUR_API_KEY',
    appId:  'YOUR_APP_ID',

    // Optional: handle AI tool calls from the iframe
    axHandler: async (command, args) => {
      if (command === 'getUser') {
        return { name: 'Alice', role: 'admin' };
      }
      throw new Error(`Unknown command: ${command}`);
    },
  });
</script>
```

### `AXSDKBrowser.destroy()`

Removes the iframe and cleans up all internal state and listeners.

```ts
AXSDKBrowser.destroy(): void
```

---

## iframe Sizing

The iframe is positioned `fixed` and sized automatically:

| Viewport | Position | Size |
|---|---|---|
| Desktop (> 767 px) | `right: 0; bottom: 0` | `420 × 680 px` |
| Mobile (≤ 767 px) | `top: 0; left: 0; right: 0; bottom: 0` | `100% × 100dvh` |

Sizing updates in real-time when the viewport crosses the 767 px breakpoint. Styles are applied inline via JavaScript; you can override them after `init()` by targeting the iframe element directly.

---

## postMessage Protocol

All messages use `window.postMessage` with `'*'` as the target origin.

### Parent → iframe: Initialize

Sent automatically by `AXSDKBrowser.init()` after the iframe loads.

```ts
{
  type: 'AXSDK_INIT';
  config: {
    apiKey: string;
    appId: string;
    // ...any other serializable config keys passed to init()
    // axHandler is NOT included
  };
}
```

### iframe → Parent: Handler RPC request

Sent by the iframe when the AI triggers an `axHandler` call.

```ts
{
  type: 'AXSDK_HANDLER_REQUEST';
  requestId: string;   // Unique ID used to match the response
  command: string;     // Handler command name
  args: unknown;       // Command arguments
}
```

### Parent → iframe: Handler RPC response

Sent by `AXSDKBrowser` after calling the user-provided `axHandler`.

```ts
// On success:
{
  type: 'AXSDK_HANDLER_RESPONSE';
  requestId: string;
  result: unknown;
}

// On error (axHandler threw):
{
  type: 'AXSDK_HANDLER_RESPONSE';
  requestId: string;
  error: string;       // Error message string
}
```

---

## Build Output

| File | Description |
|---|---|
| `dist/axsdk-browser.js` | Lightweight parent-page loader. No React. Exposes `AXSDKBrowser` global. |
| `dist/axsdk-browser-frame.js` | Self-contained iframe bundle — bundles React, `@axsdk/core`, `@axsdk/react`, and inlines all CSS. |

---

## Development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0

### Install dependencies

```bash
bun install
```

### Build

```bash
# Build both bundles (loader + frame)
bun run build

# Build only the parent-page loader
bun run build:browser

# Build only the iframe bundle
bun run build:frame
```

### Dev server

```bash
bun run dev
```

### Publish

```bash
bun run publish
```

### Package structure

```
packages/axsdk-browser/
├── src/
│   ├── embed.ts              # Parent-page loader → dist/axsdk-browser.js
│   └── frame.tsx             # iframe React app → dist/axsdk-browser-frame.js
├── dist/
│   ├── axsdk-browser.js
│   └── axsdk-browser-frame.js
├── vite.config.browser.ts    # Vite config for the loader bundle
├── vite.config.frame.ts      # Vite config for the iframe bundle (inlines CSS)
├── tsconfig.json
└── package.json
```

---

## Related Packages

| Package | Description |
|---|---|
| [`@axsdk/core`](../axsdk-core/README.md) | Framework-agnostic core SDK — session management, SSE streaming, event bus |
| [`@axsdk/react`](../axsdk-react/README.md) | React components — drop-in chat UI built on `@axsdk/core` |

---

## License

MIT © [Layorix Inc.](https://github.com/layorixinc)
