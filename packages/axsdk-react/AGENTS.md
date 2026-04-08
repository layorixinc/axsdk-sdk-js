# AGENTS.md — `@axsdk/react`

React 19 component library for AXSDK. See the repo-root [`AGENTS.md`](../../AGENTS.md) for monorepo-wide rules.

## Purpose

Drop-in React UI for the AXSDK chat platform. Built on top of `@axsdk/core`. The headline export is `<AXUI />`, but the full set of composable primitives (`AXChat`, `AXButton`, popups, dialogs, etc.) is also exported for custom layouts.

The package is consumed by host React apps **and** by `@axsdk/browser` (which renders `<AXUI />` into a vanilla-JS embed). Both consumption paths must keep working.

## Source layout (`src/`)

| Path | Role |
|---|---|
| `lib.ts` | Public entry — imports `index.css`, re-exports everything from `components/` |
| `main.tsx` / `App.tsx` / `App.css` | Vite dev playground (not shipped) |
| `index.css` | Global CSS — keyframes, scoped `box-sizing` reset, isolation rules |
| `theme.ts` / `defaultTheme.ts` / `AXThemeContext.tsx` | Theming system (`AXTheme` + provider) |
| `cssVariables.ts` | Injects `--ax-*` custom properties onto the portal root |
| `components/AXUI.tsx` | Root component — creates portal target, mounts the widget |
| `components/AXButton.tsx` | Floating chat trigger button |
| `components/AXChat.tsx` | Main chat surface |
| `components/AXChatPopup.tsx` | Popup chat window |
| `components/AXChatMessage*.tsx` | Message rendering, input, popovers |
| `components/AXChatNotificationPopover.tsx` | Notification UI |
| `components/AXChatErrorBar.tsx` | Error surface |
| `components/AXChatLastMessage.tsx` | Speech-bubble preview |
| `components/AXQuestionDialog.tsx` | Modal question prompt |
| `components/AXDevTools.tsx` | Dev-only diagnostics |
| `hooks/` | Custom React hooks |

## Build

Vite library build + dual `tsc` for app vs. build types:

```bash
bun run dev          # vite --port 3334 (uses index.html, src/main.tsx)
bun run build        # tsc -b && vite build && bun build:types
bun run build:types  # bunx tsc --project tsconfig.build.json
bun run lint         # eslint .
bun run preview      # vite preview
```

- `tsconfig.app.json` covers the dev playground.
- `tsconfig.build.json` covers the published library types.
- `tsconfig.node.json` covers Vite/eslint config files.
- `rollup-plugin-preserve-use-client` keeps the `"use client";` directive in built output so the lib works inside React Server Components hosts.

Outputs:
- `dist/lib.js` (ESM)
- `dist/lib.d.ts`
- `dist/lib.css` (exported as `@axsdk/react/index.css`)

`react` and `react-dom` are **peerDependencies** — never bundle them.

## Style isolation (load-bearing)

This is the most subtle part of the package. Read [`ISOLATION_STRATEGY.md`](./ISOLATION_STRATEGY.md) before touching anything style-related.

Key invariants:

1. **The portal root (`<div class="ax-portal-root">`) anchors `font-size: 16px`** so every `em` unit in component styles is predictable regardless of host page typography. **Never use `rem`** in component styles — `rem` resolves against `:root`, defeating isolation. Always use `em`, `px`, or theme variables.
2. **`box-sizing: border-box` is scoped** to `.ax-portal-root *` in `index.css`, not applied globally.
3. **Theme tokens (`--ax-*`)** are stamped onto the portal root via `cssVariables.ts`'s `element.style.setProperty(...)`. Components read them with `var(--ax-...)`.
4. **Keyframes** are prefixed (`ax-*`, `axchat-*`, `axbubble-*`) and live in `index.css`. Avoid generic names like `spin`.
5. The `theme` prop on `<AXUI />` flows through `AXThemeContext` and is also serialized into CSS variables.

When `@axsdk/browser` consumes this package, it inlines `dist/lib.css` into a `<style>` tag plus an `all: initial` reset on `.ax-portal-root` — see `packages/axsdk-browser/src/embed.ts`. Any new CSS rule you add must survive that hard reset.

## Conventions

- **React 19**, new JSX transform — no `import React` for JSX-only files.
- Most styling is **inline `React.CSSProperties`** plus theme variables. There is no Tailwind, no CSS Modules, no CSS-in-JS lib.
- State that needs to live across components uses **Zustand**; everything else uses local `useState` / `useReducer`.
- Strict TS — narrow array access, no implicit any.
- Avoid mutating `document.body` or `document.head` from new components; existing mutations (e.g., `document.body.style.overflow` in `AXChatPopup`) are documented and intentional.

## What to be careful about

- Changing `font-size` defaults, removing the `.ax-portal-root` class, or reintroducing `rem` will silently break the embed in any non-default host page.
- The dev playground (`main.tsx`, `App.tsx`, `index.html`) is **not** part of the published bundle — don't add runtime logic there expecting consumers to get it.
- `eslint.config.js` is the source of truth for linting — fix lint errors rather than disabling rules.
- Don't run `bun run publish` unless explicitly asked. Always rebuild after a `@axsdk/core` bump.
