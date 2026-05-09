# @axsdk/react

These packages are code for integrating with the AXSDK (https://axsdk.ai) platform.

React UI components for the AXSDK AI chat platform. Built on top of [`@axsdk/core`](../axsdk-core), providing a fully-featured floating chat popup and a search-bar style assistant surface — all rendered into a portal so they stay above your app's layout.

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

### Option B — Search bar surface

Use `variant="searchBar"` when the assistant should behave like an autocomplete/search surface instead of a floating chat button. The search bar and onboarding suggestions render as one panel; answers render below it.

```tsx
import { useEffect } from "react";
import { AXSDK } from "@axsdk/core";
import { AXUI } from "@axsdk/react";
import "@axsdk/react/index.css";

export default function SearchAssistant() {
  useEffect(() => {
    AXSDK.init({
      apiKey: import.meta.env.VITE_AXSDK_API_KEY,
      appId:  import.meta.env.VITE_AXSDK_APP_ID,
      axHandler: async (command, args) => {
        console.log(command, args);
        return { status: "OK" };
      },
    });
  }, []);

  return <AXUI variant="searchBar" />;
}
```

You can mount the search bar and answer panel into existing elements with `targets`:

```tsx
<div id="ax-search" />
<div id="ax-answer" />

<AXUI
  variant="searchBar"
  targets={{ searchBar: "ax-search", answerPanel: "ax-answer" }}
/>
```

Submitted search text remains visible after send and is restored after page refresh from `@axsdk/core` chat state (`localStorage` key `axsdk:chat`). In-progress drafts are kept local and are only persisted after submit or onboarding suggestion selection.

### Option C — Bottom search bar launcher

Use `variant="bottomSearchBar"` when you want a compact bottom-right launcher that expands into a bottom-centered search surface. The open surface stacks the latest assistant preview, onboarding suggestion chips, and an embedded search input while using the same fresh-search submit semantics as `variant="searchBar"`.

```tsx
import { AXUI } from "@axsdk/react";
import "@axsdk/react/index.css";

export default function BottomSearchAssistant() {
  return <AXUI variant="bottomSearchBar" />;
}
```

### Option D — Composing individual components

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
| `<AXUI />` | Top-level composite component. Renders the default floating chat popup, the `searchBar` assistant surface, or the `bottomSearchBar` launcher surface. Manages shared state through `@axsdk/core` stores. |
| `<AXSearchBar />` | Search-style input row with controlled/uncontrolled value support and an opt-in embedded surface mode. |
| `<AXSearchOnboarding />` | Selectable onboarding suggestions. In search-bar mode, comma-separated onboarding text is shown as autocomplete rows. |
| `<AXAnswerPanel />` | Search-bar variant answer surface for user query context, assistant responses, busy state, and close behavior. |
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
  theme?: AXTheme;
  voice?: AXVoiceConfig;
  variant?: 'fab' | 'searchBar' | 'bottomSearchBar';
  targets?: {
    searchBar?: string | HTMLElement;
    answerPanel?: string | HTMLElement;
  };
  ui?: {
    variant?: 'fab' | 'searchBar' | 'bottomSearchBar';
    targets?: AXUIProps['targets'];
  };
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  defaultPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onPositionChange?: (position: AXUIProps['position']) => void;
}
```

The default `variant` is `'fab'`. The `searchBar` and `bottomSearchBar` variants submit a fresh query by cancelling/resetting the current chat session first, then sending the trimmed query text. The submitted text is persisted in the core chat store as `searchBarInputValue`.

The `bottomSearchBar` variant keeps a small bottom-right icon launcher in its closed state. Opening it reveals an animated bottom-centered surface with capped desktop width and nearly full mobile width. It uses local open state, so the default floating chat open state and chat-store open polling semantics remain unchanged.

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

### `<AXSearchBar>`

```ts
interface AXSearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  buttonLabel?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  clearOnSubmit?: boolean;
  surface?: 'standalone' | 'embedded';
}
```

`surface="embedded"` is used by `<AXUI variant="searchBar" />` and `<AXUI variant="bottomSearchBar" />` so the input row can share a composed assistant surface. Standalone usage keeps the original pill/card styling and clears on submit by default.

### `<AXSearchOnboarding>`

```ts
interface AXSearchOnboardingProps {
  onboardingText?: string;
  latestUserText?: string;
  onTextSelect?: (text: string) => void;
  layout?: 'card' | 'rows';
}
```

`layout="rows"` renders autocomplete-style suggestion rows with a leading search icon and trailing arrow affordance. Comma-separated onboarding strings are split into individual selectable rows in this layout.

## License

MIT
