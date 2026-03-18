# @axsdk/react

These packages are code for integrating with the AXSDK (https://axsdk.ai) platform.

React UI components for the AXSDK AI chat platform. Built on top of [`@axsdk/core`](../axsdk-core), providing a fully-featured chat popup, message list, input bar, and floating action button — all rendered into a portal so they stay above your app's layout.

## Installation

```bash
# npm
npm install @axsdk/react @axsdk/core

# bun
bun add @axsdk/react @axsdk/core
```

Import the stylesheet alongside the components:

```ts
import "@axsdk/react/index.css";
```

## Peer Dependencies

| Package | Version |
|---|---|
| `react` | ^19 |
| `react-dom` | ^19 |

## Quick Start

### Option A — `<AXUI />` (recommended)

Drop `<AXUI />` anywhere in your React tree **after** calling `AXSDK.init()`. It handles everything: the floating button, the popup overlay, the message list, and the input bar.

```tsx
import { useEffect } from "react";
import { AXSDK } from "@axsdk/core";
import { AXUI } from "@axsdk/react";
import "@axsdk/react/index.css";

export default function App() {
  useEffect(() => {
    AXSDK.init({
      apiKey: import.meta.env.VITE_AXSDK_API_KEY,
      appId:  import.meta.env.VITE_AXSDK_APP_ID,
      headers: { origin: import.meta.env.VITE_AXSDK_APP_DOMAIN },
      axHandler: async (command, args) => {
        console.log(command, args);
        return { status: "OK" };
      },
    });
  }, []);

  return (
    <>
      {/* Your app content */}
      <AXUI />
    </>
  );
}
```

### Option B — Composing individual components

```tsx
import { useState } from "react";
import { AXSDK } from "@axsdk/core";
import { AXButton, AXChatPopup } from "@axsdk/react";

export default function MyChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AXButton onClick={() => setOpen((v) => !v)} isOpen={open} size={64} />
      <AXChatPopup
        visible={open}
        onSendMessage={(text) => AXSDK.sendMessage(text)}
      />
    </>
  );
}
```

## Components

| Component | Description |
|---|---|
| `<AXUI />` | Top-level composite component. Renders a portal containing the floating button, both speech bubbles, and the full chat popup. Manages open/closed state internally via the `chatStore`. |
| `<AXButton />` | Animated floating action button (fixed, bottom-right). Supports show/hide animations, press ripple effects, and an `isOpen` slide-off mode. |
| `<AXChatPopup />` | Full-screen overlay containing the chat message list and input bar. Animates in/out on `visible` prop changes. |
| `<AXChat />` | Scrollable chat message list. Auto-scrolls to the latest message and applies a scroll-based opacity fade for older messages. Exposes `scrollToBottom()` via `ref`. |
| `<AXChatMessage />` | Renders a single chat message bubble (user or assistant). Handles text parts, reasoning collapsible sections, tool call details, and a thinking indicator. |
| `<AXChatMessageInput />` | Bottom input bar with a resizing textarea, a send button, and a clear-conversation button. Submits on Enter (Shift+Enter for newline). |

## Component Props

### `<AXUI>`

```ts
interface AXUIProps {
  children?: React.ReactNode; // Rendered inside the portal (above the popup)
}
```

### `<AXButton>`

```ts
interface AXButtonProps {
  onClick?: () => void;
  visible?: boolean;        // Controls show/hide animation (default: true)
  isOpen?: boolean;         // Slides button to top-right when the popup is open
  size?: number | string;   // Diameter: px number, rem, vw, vh, vmin, vmax (default: 64)
  className?: string;
}
```

### `<AXChatPopup>`

```ts
interface AXChatPopupProps {
  visible: boolean;
  children?: React.ReactNode;
  onSendMessage?: (message: string, position: { x: number; y: number }) => void;
  onInputFocusOrChange?: () => void;
}
```

### `<AXChat>`

```ts
interface AXChatProps {
  messages: ChatMessage[];
  onMessageClick?: () => void;
}

// Imperative handle (via ref)
interface AXChatHandle {
  scrollToBottom: () => void;
}
```

### `<AXChatMessage>`

```ts
interface AXChatMessageProps {
  message: ChatMessage;
  onMessageClick?: () => void;
  opacity?: number;
  messageRef?: (el: HTMLDivElement | null) => void;
  isSelected?: boolean;
  onClick?: () => void;
}
```

### `<AXChatMessageInput>`

```ts
interface AXChatMessageInputProps {
  onSend: (message: string) => void;
  onFocus?: () => void;
  onInputChange?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
}
```

## License

MIT
