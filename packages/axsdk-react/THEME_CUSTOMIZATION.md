# axsdk-react Theme Customization Guide

`axsdk-react` provides a CSS variable-based theme system. Developers can customize the UI styles using either **direct CSS overrides** or the **TypeScript `theme` prop**.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Customizing with CSS Variables (Recommended)](#2-customizing-with-css-variables-recommended)
3. [Customizing with the TypeScript theme prop](#3-customizing-with-the-typescript-theme-prop)
4. [Using AXThemeProvider Directly (Advanced)](#4-using-axthemeprovider-directly-advanced)
5. [Per-component styles override](#5-per-component-styles-override)
6. [Light Mode Support](#6-light-mode-support)

---

## 1. Overview

The theme system in `axsdk-react` is built on top of **CSS Custom Properties (CSS Variables)**. When the `<AXUI>` component renders, CSS variables prefixed with `--ax-*` are automatically injected into the portal root `div` element. All child components consume these variables using the `var(--ax-*)` syntax.

### Two Customization Methods

| Method | Description | Recommended For |
|--------|-------------|-----------------|
| **Direct CSS Override** | Override `--ax-*` CSS variables directly in a CSS file | Bulk brand color changes |
| **TypeScript `theme` prop** | Configure type-safely via the `<AXUI theme={...} />` prop | Fine-grained control, dynamic theme switching |

---

## 2. Customizing with CSS Variables (Recommended)

The simplest approach is to override `--ax-*` variables in your CSS file.

```css
/* Declare directly on the portal root element, or globally on :root */
:root {
  /* Change brand color from purple to blue */
  --ax-color-primary:       #2563eb;
  --ax-color-primary-dark:  #1d4ed8;
  --ax-color-primary-light: #3b82f6;
  --ax-color-primary-muted: #60a5fa;

  /* Adjust ring/badge gradient accent colors */
  --ax-color-accent1: #3b82f6;
  --ax-color-accent2: #06b6d4;
  --ax-color-accent3: #0891b2;
  --ax-color-accent4: #8b5cf6;
}
```

> **Note:** AXUI mounts its portal as a separate `div` appended to `document.body`. Host page CSS may not apply inside the portal, so using the `theme` prop is the more reliable approach.

---

### Full CSS Variable Reference

The following is the complete list of CSS variables injected into the portal root by the `injectCSSVariables()` function.  
Default values shown are for when `colorMode` is `'dark'`.

#### Color Tokens (`--ax-color-*`)

| Variable | Default (dark) | Description |
|----------|----------------|-------------|
| `--ax-color-primary` | `#7c3aed` | Main brand color (purple) |
| `--ax-color-primary-dark` | `#1d4ed8` | Secondary gradient partner (indigo) |
| `--ax-color-primary-light` | `#a855f7` | Light accent for borders and focus rings |
| `--ax-color-primary-muted` | `#c084fc` | Muted color for gradient text |
| `--ax-color-accent1` | `#a855f7` | Ring gradient accent 1 (violet) |
| `--ax-color-accent2` | `#3b82f6` | Ring gradient accent 2 (blue) |
| `--ax-color-accent3` | `#06b6d4` | Ring gradient accent 3 (cyan) |
| `--ax-color-accent4` | `#ec4899` | Ring gradient accent 4 (pink) |
| `--ax-color-primary-rgb` | `168, 85, 247` | R,G,B component string of `primaryLight` (for composing rgba values) |

#### Background Tokens (`--ax-bg-*`)

| Variable | Default (dark) | Description |
|----------|----------------|-------------|
| `--ax-bg-base` | `rgba(12, 12, 18, 0.97)` | Chat panel base background |
| `--ax-bg-popover` | `rgba(18, 18, 28, 0.92)` | Popover / speech bubble background |
| `--ax-bg-user-message` | `linear-gradient(135deg, rgba(124,58,237,1) 0%, rgba(79,70,229,1) 100%)` | User message bubble background |
| `--ax-bg-assistant-message` | `rgba(255, 255, 255, 1.0)` | Assistant message bubble background |
| `--ax-bg-question-dialog` | `linear-gradient(160deg, rgba(20,15,45,0.97) 0%, rgba(10,8,30,0.98) 100%)` | Question dialog card background |
| `--ax-bg-input-textarea` | `rgba(255, 255, 255, 0.07)` | Input textarea background |
| `--ax-bg-overlay` | `rgba(0, 0, 0, 0.5)` | Full-screen overlay backdrop |
| `--ax-bg-error` | `rgba(248, 113, 113, 0.08)` | Error state background |

#### Text Tokens (`--ax-text-*`)

| Variable | Default (dark) | Description |
|----------|----------------|-------------|
| `--ax-text-primary` | `rgba(255, 255, 255, 0.92)` | Primary text color |
| `--ax-text-muted` | `rgba(255, 255, 255, 0.75)` | Secondary / muted text |
| `--ax-text-dim` | `rgba(255, 255, 255, 0.45)` | Dim decorative text |
| `--ax-text-assistant` | `rgba(33, 33, 33, 0.92)` | Text inside assistant bubbles |
| `--ax-text-timestamp` | `rgba(255, 255, 255, 0.28)` | Timestamp label |
| `--ax-text-error` | `#f87171` | Error message color |
| `--ax-text-success` | `rgba(52, 211, 153, 0.9)` | Success confirmation color |
| `--ax-text-caret` | `#a78bfa` | Textarea caret color |
| `--ax-text-gradient` | `linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)` | Gradient text for speech bubbles |

#### Border Tokens (`--ax-border-*`)

| Variable | Default (dark) | Description |
|----------|----------------|-------------|
| `--ax-border-primary` | `rgba(168, 85, 247, 0.35)` | Primary border (auto-computed from `primaryLight`) |
| `--ax-border-surface` | `rgba(255, 255, 255, 0.12)` | Surface divider (dark) / `rgba(0,0,0,0.12)` (light) |
| `--ax-border-error` | `rgba(248, 113, 113, 0.25)` | Error state border |

---

## 3. Customizing with the TypeScript theme prop

Pass an `AXTheme` object to the `theme` prop of the `<AXUI>` component to configure the theme in a type-safe manner.

### `AXTheme` Type Structure

```typescript
import type { AXTheme } from '@axsdk/react';

const myTheme: AXTheme = {
  // Color mode: 'dark' | 'light' (default: 'dark')
  colorMode: 'dark',

  // Button icon image URL for the default (idle) state
  buttonImageUrl: 'https://example.com/bot-icon.png',

  // Image (can be a GIF) URL to display in the busy state
  buttonAnimationImageUrl: 'https://example.com/bot-spinning.gif',

  // Color token overrides
  colors: {
    primary: {
      primary:      '#2563eb',  // Main brand color
      primaryDark:  '#1d4ed8',  // Secondary gradient color
      primaryLight: '#3b82f6',  // Border and ring color
      primaryMuted: '#60a5fa',  // Muted brand color
      accent1:      '#3b82f6',  // Ring gradient accent 1
      accent2:      '#06b6d4',  // Ring gradient accent 2
      accent3:      '#0891b2',  // Ring gradient accent 3
      accent4:      '#8b5cf6',  // Ring gradient accent 4
    },
    bg: {
      dark: {
        base:             'rgba(10, 10, 20, 0.97)',
        popover:          'rgba(15, 15, 30, 0.92)',
        userMessage:      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        assistantMessage: 'rgba(255, 255, 255, 1.0)',
        questionDialog:   'linear-gradient(160deg, rgba(10,15,40,0.97) 0%, rgba(5,8,25,0.98) 100%)',
        inputTextarea:    'rgba(255, 255, 255, 0.07)',
        overlay:          'rgba(0, 0, 0, 0.5)',
        error:            'rgba(248, 113, 113, 0.08)',
      },
      light: {
        base:             'rgba(255, 255, 255, 0.97)',
        popover:          'rgba(248, 248, 252, 0.97)',
        userMessage:      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        assistantMessage: 'rgba(245, 245, 250, 1.0)',
        questionDialog:   'rgba(255, 255, 255, 0.98)',
        inputTextarea:    'rgba(0, 0, 0, 0.04)',
        overlay:          'rgba(0, 0, 0, 0.35)',
        error:            'rgba(248, 113, 113, 0.06)',
      },
    },
    text: {
      primary:   'rgba(255, 255, 255, 0.92)',
      muted:     'rgba(255, 255, 255, 0.75)',
      dim:       'rgba(255, 255, 255, 0.45)',
      assistant: 'rgba(33, 33, 33, 0.92)',
      timestamp: 'rgba(255, 255, 255, 0.28)',
      error:     '#f87171',
      success:   'rgba(52, 211, 153, 0.9)',
      caret:     '#60a5fa',
      gradient:  'linear-gradient(90deg, #60a5fa 0%, #818cf8 50%, #38bdf8 100%)',
    },
    border: {
      error: 'rgba(248, 113, 113, 0.25)',
    },
  },

  // Per-component inline style overrides
  styles: {
    button: { /* AXThemeButtonStyles */ },
    input:  { /* AXThemeInputStyles  */ },
    popover: { /* AXThemePopoverStyles */ },
    message: { /* AXThemeMessageStyles */ },
    questionDialog: { /* AXThemeQuestionDialogStyles */ },
  },
};
```

### Example: Switching between dark / light mode

```tsx
import React, { useState } from 'react';
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

export function App() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark');

  const theme: AXTheme = { colorMode: mode };

  return (
    <>
      <button onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}>
        {mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>
      <AXUI theme={theme} />
    </>
  );
}
```

### Example: Applying a custom brand color (purple → blue)

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const blueTheme: AXTheme = {
  colorMode: 'dark',
  colors: {
    primary: {
      primary:      '#2563eb',
      primaryDark:  '#1d4ed8',
      primaryLight: '#3b82f6',
      primaryMuted: '#60a5fa',
      accent1:      '#3b82f6',
      accent2:      '#06b6d4',
      accent3:      '#0891b2',
      accent4:      '#8b5cf6',
    },
    bg: {
      dark: {
        userMessage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
  },
};

export function App() {
  return <AXUI theme={blueTheme} />;
}
```

### Example: Custom button image

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const customButtonTheme: AXTheme = {
  // Button icon for the idle state
  buttonImageUrl: 'https://example.com/my-bot-icon.png',
  // Animated GIF to show in the busy state (while a response is being generated)
  buttonAnimationImageUrl: 'https://example.com/my-bot-loading.gif',
};

export function App() {
  return <AXUI theme={customButtonTheme} />;
}
```

---

## 4. Using `AXThemeProvider` Directly (Advanced)

### Accessing the current theme with the `useAXTheme()` hook

Any component inside an `AXThemeProvider` can access the current theme values using the `useAXTheme()` hook.

```tsx
import { useAXTheme } from '@axsdk/react';

function MyCustomComponent() {
  const { theme, resolvedColorMode } = useAXTheme();

  return (
    <div style={{ color: theme.colors?.text?.primary }}>
      Current mode: {resolvedColorMode}
    </div>
  );
}
```

The `AXThemeContextValue` structure returned by `useAXTheme()`:

```typescript
interface AXThemeContextValue {
  theme: AXTheme;                    // The theme passed by the user (unmerged original)
  resolvedColorMode: 'dark' | 'light'; // The actually applied color mode
}
```

### Using `AXThemeProvider` independently

If you want to provide only the theme context to a custom component tree without `<AXUI>`:

```tsx
import { AXThemeProvider } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const myTheme: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: { primary: '#2563eb' },
  },
};

function Root() {
  return (
    <AXThemeProvider theme={myTheme}>
      {/* Child components can access the theme via useAXTheme() */}
      <MyCustomChatInterface />
    </AXThemeProvider>
  );
}
```

### `mergeTheme()` utility function

`mergeTheme()` deep-merges a user theme on top of the default theme (dark or light), returning a fully populated `AXTheme` object.

```typescript
import { mergeTheme } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const partial: AXTheme = {
  colorMode: 'dark',
  colors: {
    primary: { primary: '#2563eb' },
  },
};

// Deep-merge partial on top of the dark defaults
const resolved = mergeTheme(partial);
console.log(resolved.colors?.primary?.primaryLight); // '#a855f7' (default value preserved)
```

### `injectCSSVariables()` utility function

Use this to directly inject `--ax-*` CSS variables into a DOM element. `<AXUI>` calls this function internally on the portal root automatically.

```typescript
import { injectCSSVariables } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const myTheme: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: { primary: '#2563eb' },
  },
};

// Inject CSS variables into a specific DOM element
const container = document.getElementById('my-ax-container')!;
injectCSSVariables(container, myTheme);
```

---

## 5. Per-component styles override

Through the `theme.styles` object, you can fine-tune specific DOM elements of each component using `React.CSSProperties`. User styles are merged into the component's default inline styles via `Object.assign`, with **user values taking precedence**.

### `styles.button` — `AXThemeButtonStyles`

Overrides individual layers of the `AXButton` component.

| Key | Target Element |
|-----|----------------|
| `wrapper` | Outer wrapper `div` (position: fixed container) |
| `button` | The `<button>` element itself |
| `orb` | Orb / main body layer |
| `label` | "AX" label `span` (shown when `buttonImageUrl` is not set) |

### `styles.input` — `AXThemeInputStyles`

Overrides the `AXChatMessageInput` component.

| Key | Target Element |
|-----|----------------|
| `card` | Outer card container `div` |
| `textarea` | The `<textarea>` element |
| `sendButton` | Send `<button>` |
| `clearButton` | Clear `<button>` |
| `guideText` | Guide text `div` |

### `styles.popover` — `AXThemePopoverStyles`

Overrides the `AXChatMessagePopoverBase` component (notification popover, recent messages).

| Key | Target Element |
|-----|----------------|
| `wrapper` | Outer positioning wrapper |
| `card` | Inner card with backdrop-filter |
| `content` | Scrollable content area |
| `closeButton` | Close button |

### `styles.message` — `AXThemeMessageStyles`

Overrides individual `AXChatMessage` message bubbles.

| Key | Target Element |
|-----|----------------|
| `row` | Outer row `div` |
| `userBubble` | User message bubble `div` |
| `assistantBubble` | Assistant message bubble `div` |
| `timestamp` | Timestamp `div` |

### `styles.questionDialog` — `AXThemeQuestionDialogStyles`

Overrides the `AXQuestionDialog` component.

| Key | Target Element |
|-----|----------------|
| `card` | Dialog card outer `div` |
| `optionSelected` | Selected option card button |
| `optionUnselected` | Unselected option card button |
| `submitButton` | Submit/Next button (active state) |
| `declineButton` | Decline button |

### Example: Per-component style overrides

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const styledTheme: AXTheme = {
  colorMode: 'dark',
  styles: {
    button: {
      wrapper: {
        bottom: '2rem',
        right: '2rem',
      },
      button: {
        borderRadius: '16px', // Rounded square instead of circular
      },
    },
    input: {
      card: {
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
      textarea: {
        fontSize: '1rem',
        lineHeight: '1.6',
      },
      sendButton: {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
    popover: {
      card: {
        maxWidth: '360px',
        borderRadius: '16px',
      },
    },
    message: {
      userBubble: {
        borderRadius: '18px 18px 4px 18px',
      },
      assistantBubble: {
        borderRadius: '18px 18px 18px 4px',
      },
    },
    questionDialog: {
      card: {
        borderRadius: '20px',
        padding: '1.5rem',
      },
      submitButton: {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
  },
};

export function App() {
  return <AXUI theme={styledTheme} />;
}
```

---

## 6. Light Mode Support

Setting `colorMode: 'light'` automatically applies a palette suited for light-background pages.

```tsx
import { AXUI } from '@axsdk/react';

export function App() {
  return <AXUI theme={{ colorMode: 'light' }} />;
}
```

CSS variable defaults that are automatically swapped when switching to `colorMode: 'light'`:

| CSS Variable | dark default | light default |
|--------------|-------------|---------------|
| `--ax-bg-base` | `rgba(12, 12, 18, 0.97)` | `rgba(255, 255, 255, 0.97)` |
| `--ax-bg-popover` | `rgba(18, 18, 28, 0.92)` | `rgba(248, 248, 252, 0.97)` |
| `--ax-bg-assistant-message` | `rgba(255, 255, 255, 1.0)` | `rgba(245, 245, 250, 1.0)` |
| `--ax-bg-question-dialog` | `linear-gradient(160deg, rgba(20,15,45,0.97) ...)` | `rgba(255, 255, 255, 0.98)` |
| `--ax-bg-input-textarea` | `rgba(255, 255, 255, 0.07)` | `rgba(0, 0, 0, 0.04)` |
| `--ax-bg-overlay` | `rgba(0, 0, 0, 0.5)` | `rgba(0, 0, 0, 0.35)` |
| `--ax-bg-error` | `rgba(248, 113, 113, 0.08)` | `rgba(248, 113, 113, 0.06)` |
| `--ax-text-primary` | `rgba(255, 255, 255, 0.92)` | `rgba(20, 20, 40, 0.92)` |
| `--ax-text-muted` | `rgba(255, 255, 255, 0.75)` | `rgba(20, 20, 40, 0.60)` |
| `--ax-text-dim` | `rgba(255, 255, 255, 0.45)` | `rgba(20, 20, 40, 0.35)` |
| `--ax-text-assistant` | `rgba(33, 33, 33, 0.92)` | `rgba(20, 20, 40, 0.92)` |
| `--ax-text-timestamp` | `rgba(255, 255, 255, 0.28)` | `rgba(20, 20, 40, 0.30)` |
| `--ax-text-error` | `#f87171` | `#dc2626` |
| `--ax-text-success` | `rgba(52, 211, 153, 0.9)` | `rgba(5, 150, 105, 0.9)` |
| `--ax-text-caret` | `#a78bfa` | `#7c3aed` |
| `--ax-text-gradient` | `linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)` | `linear-gradient(90deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)` |
| `--ax-border-error` | `rgba(248, 113, 113, 0.25)` | `rgba(248, 113, 113, 0.35)` |
| `--ax-border-surface` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.12)` |
| `--ax-color-accent1` | `#a855f7` | `#9333ea` |
| `--ax-color-accent2` | `#3b82f6` | `#2563eb` |
| `--ax-color-accent3` | `#06b6d4` | `#0891b2` |
| `--ax-color-accent4` | `#ec4899` | `#db2777` |
| `--ax-color-primary-dark` | `#1d4ed8` | `#4f46e5` |

> In light mode, individual tokens can be further overridden via the `colors` field. `mergeTheme()` will deep-merge user overrides on top of the light defaults when `colorMode: 'light'` is specified.

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

// Light mode + blue brand
const lightBlueTheme: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: {
      primary:      '#2563eb',
      primaryLight: '#3b82f6',
    },
    bg: {
      light: {
        userMessage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
  },
};

export function App() {
  return <AXUI theme={lightBlueTheme} />;
}
```
