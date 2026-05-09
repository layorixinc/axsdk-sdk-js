# AXSDK — JavaScript SDK Monorepo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

JavaScript/TypeScript SDK packages for integrating the [AXSDK](https://axsdk.ai) AI chat platform into web applications. Provides a framework-agnostic core, a React UI component library, and a vanilla JS browser embed — choose the layer that fits your stack.

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@axsdk/core`](./packages/axsdk-core/README.md) | [![npm](https://img.shields.io/npm/v/@axsdk/core)](https://www.npmjs.com/package/@axsdk/core) | Framework-agnostic core — SDK initialization, session management, SSE streaming, event bus, and type definitions |
| [`@axsdk/browser`](./packages/axsdk-browser/README.md) | [![npm](https://img.shields.io/npm/v/@axsdk/browser)](https://www.npmjs.com/package/@axsdk/browser) | Vanilla JS browser embed that mounts the chat widget in an open Shadow DOM from one `<script>` tag |
| [`@axsdk/react`](./packages/axsdk-react/README.md) | [![npm](https://img.shields.io/npm/v/@axsdk/react)](https://www.npmjs.com/package/@axsdk/react) | React component library — drop-in `<AXUI />` component and composable chat UI primitives built on `@axsdk/core` |
| [`@axsdk/voice`](./packages/axsdk-voice/README.md) | [![npm](https://img.shields.io/npm/v/@axsdk/voice)](https://www.npmjs.com/package/@axsdk/voice) | Optional voice I/O plugin — VAD-gated mic capture, transcript-into-chat dispatch, TTS playback on assistant replies |

---

## Getting Started

Choose the package that matches your setup:

### Vanilla JS / CDN (no build step)

Use **`@axsdk/browser`** to embed the widget with a single script tag:

```html
<script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
<script>
  AXSDKBrowser.init({
    apiKey: 'YOUR_API_KEY',
    appId:  'YOUR_APP_ID',
  });
</script>
```

→ See the [`@axsdk/browser` README](./packages/axsdk-browser/README.md) for the full guide.

### React

Use **`@axsdk/react`** for a drop-in React chat UI:

```bash
npm install @axsdk/react @axsdk/core
```

```tsx
import { AXSDK } from '@axsdk/core';
import { AXUI } from '@axsdk/react';
import '@axsdk/react/index.css';

AXSDK.init({ apiKey: 'YOUR_API_KEY', appId: 'YOUR_APP_ID' });

export default function App() {
  return <AXUI />;
}
```

→ See the [`@axsdk/react` README](./packages/axsdk-react/README.md) for the full guide.

### Custom integration / headless

Use **`@axsdk/core`** directly to drive sessions, streaming, and events with your own UI:

```bash
npm install @axsdk/core
```

```ts
import { AXSDK } from '@axsdk/core';

await AXSDK.init({ apiKey: 'YOUR_API_KEY', appId: 'YOUR_APP_ID' });
AXSDK.sendMessage('Hello!');
```

→ See the [`@axsdk/core` README](./packages/axsdk-core/README.md) for the full guide.

---

## Repository Structure

```
axsdk-sdk-js/
├── packages/
│   ├── axsdk-core/      # @axsdk/core
│   ├── axsdk-browser/   # @axsdk/browser
│   ├── axsdk-react/     # @axsdk/react
│   └── axsdk-voice/     # @axsdk/voice (optional plugin)
├── package.json         # Bun workspace root
└── tsconfig.json        # Shared TypeScript config
```

---

## Monorepo Development

This repository uses [Bun workspaces](https://bun.sh/docs/install/workspaces).

### Requirements

- [Bun](https://bun.sh) ≥ 1.0
- TypeScript ≥ 5

### Install all dependencies

```bash
bun install
```

### Build individual packages

```bash
# @axsdk/core
cd packages/axsdk-core && bun run build

# @axsdk/browser (builds the single script-tag bundle)
cd packages/axsdk-browser && bun run build

# @axsdk/react
cd packages/axsdk-react && bun run build
```

### Development servers

```bash
# @axsdk/core (watch mode)
cd packages/axsdk-core && bun run dev

# @axsdk/browser
cd packages/axsdk-browser && bun run dev

# @axsdk/react (Vite dev server)
cd packages/axsdk-react && bun run dev
```

---

## License

MIT © [Layorix Inc.](https://github.com/layorixinc)
