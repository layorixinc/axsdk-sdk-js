# @axsdk/core

Framework-agnostic JavaScript/TypeScript SDK for the AXSDK AI chat platform. Manages sessions, real-time SSE streaming, and chat state — no UI dependencies required.

## Installation

```bash
# npm
npm install @axsdk/core

# bun
bun add @axsdk/core
```

> **Peer dependency:** TypeScript ≥ 5

## Quick Start

```ts
import { AXSDK } from "@axsdk/core";

await AXSDK.init({
  apiKey: "ak-YOUR_API_KEY",
  appId:  "your-app-id",

  // Called by the AI when it wants your app to perform an action
  axHandler: async (command, args) => {
    console.log(command, args);
    return { status: "OK" };
  },
});

// Send a message programmatically
AXSDK.sendMessage("Hello!");

// Listen for chat events
AXSDK.eventBus().on("message.chat", (event) => {
  console.log(event, AXSDK.getChatState());
});
```

## Configuration

`AXSDK.init(config: AXSDKConfig)` accepts:

| Field | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✅ | Your AXSDK API key |
| `appId` | `string` | ✅ | Your application identifier |
| `axHandler` | `(command, args) => Promise<unknown>` | ✅ | Callback invoked when the AI issues an action command to your app |
| `headers` | `Record<string, string>` | — | Extra HTTP headers added to every API request (e.g. `origin`) |
| `language` | `string` | — | Override UI language (defaults to `navigator.language`) |
| `debug` | `boolean` | — | Enable debug output (reasoning traces, token counts) |
| `translations` | `Record<string, Record<string, string>>` | — | Per-language UI string overrides (see below) |

### Translation keys

| Key | Description |
|---|---|
| `chatAskMe` | Prompt shown in the closed-state speech bubble |
| `chatHide` | Prompt shown in the open-state speech bubble |
| `chatEmpty` | Placeholder shown when the chat history is empty |
| `chatIdleGuide` | Status text shown when the AI session is idle |
| `chatBusyGuide` | Status text shown when the AI session is busy |
| `chatClear` | Label for the clear-conversation button |

```ts
await AXSDK.init({
  // ...
  translations: {
    en: {
      chatAskMe: "How can I help?",
      chatEmpty: "Ask me anything.",
    },
    ko: {
      chatAskMe: "무엇을 도와드릴까요?",
      chatEmpty: "대화를 시작하세요.",
    },
  },
});
```

## API Reference

### `AXSDK` (singleton)

| Method | Description |
|---|---|
| `init(config)` | Initialize (or reconfigure) the SDK |
| `destroy()` | Tear down SSE connections and internal listeners |
| `sendMessage(text)` | Send a user chat message |
| `setAppAuthToken(token)` | Attach an app-level auth token to all requests |
| `resetSession()` | Clear the current chat session and message history |
| `getLanguage()` | Returns the active language string |
| `t(id)` | Resolve a translation key to a string |
| `eventBus()` | Access the internal `EventEmitter` (`EventBus`) |
| `getAppStore()` | Returns the Zustand `StoreApi<AppState>` |
| `getChatStore()` | Returns the Zustand `StoreApi<ChatState>` |
| `getChatState()` | Returns a snapshot of `ChatState` |
| `axHandler()` | Returns the registered `AXHandler` callback |
| `headers()` | Returns the configured custom headers |

### Key Types

```ts
// SDK configuration
type AXSDKConfig = {
  apiKey: string;
  appId: string;
  axHandler: AXHandler;
  headers?: Record<string, string>;
  language?: string;
  debug?: boolean;
  translations?: Record<string, Record<string, string>>;
};

// Handler invoked when the AI triggers an app action
type AXHandler = (command: string, args: Record<string, unknown>) => Promise<unknown>;

// Chat session
interface ChatSession {
  id: string;
  status: string;   // "idle" | "busy"
  title: string;
  time: MessageTime;
}

// Chat message
interface ChatMessage {
  info: MessageInfo;   // includes role: "user" | "assistant"
  parts?: MessagePart[];
  finish?: string;
}
```

### Exported utilities (experimental)

| Export | Description |
|---|---|
| `captureScreenshot(options?)` | Captures the current page (or a DOM element) as a base64 data URL |
| `captureScreenshotBlob(options?)` | Same, but returns a `Blob` |

```ts
import { captureScreenshot, captureScreenshotBlob } from "@axsdk/core";

const dataUrl = await captureScreenshot({ type: "image/jpeg", quality: 0.8 });
const blob    = await captureScreenshotBlob({ element: document.querySelector("#app") });
```

## State Persistence

`appStore` and `chatStore` are persisted to `localStorage` under the keys `axsdk:app` and `axsdk:chat` respectively. A user ID is auto-generated and reused across page loads.

## License

MIT
