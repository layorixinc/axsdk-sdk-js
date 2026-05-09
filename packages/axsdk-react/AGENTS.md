# AGENTS.md for `@axsdk/react`

Child guide for `packages/axsdk-react`, version `0.5.25`. This package is the React 19 UI layer for AXSDK: `<AXUI />`, chat primitives, theme helpers, Shadow DOM integration, and optional voice hooks on top of `@axsdk/core`.

## PACKAGE BOUNDARIES

- `react` and `react-dom` are peer dependencies. Do not bundle them into this package.
- `@axsdk/core` is a workspace dependency and runtime peer for SDK state/events.
- `@axsdk/voice` is optional/peer-based at runtime; React loads it dynamically through `src/voice.tsx`.
- `@axsdk/browser` consumes this package by rendering `<AXUI />` inside an open Shadow DOM and wrapping it with `AXShadowRootProvider`.

## PUBLIC ENTRY

Published entry: `src/lib.ts`.

```ts
import './index.css';
export * from './components';
export * from './voice';
```

Keep this entry small. It must import `index.css`, export public components/theme helpers through `components/index.ts`, and export voice hooks from `voice.tsx`.

The export map points `.` to `dist/lib.js` and `dist/lib.d.ts`, and exposes `./index.css` as `dist/lib.css`.

## SOURCE MAP

| Path | Role |
|---|---|
| `src/lib.ts` | Public library entry. Imports CSS, exports components and voice hooks |
| `src/components/index.ts` | Public component barrel, theme exports, Shadow DOM helpers, CSS variable injection, selected voice hooks |
| `src/components/AXUI.tsx` | Root widget component: portal target, theme CSS variables, chat store, voice hooks, portals |
| `src/AXShadowRootContext.tsx` | `AXShadowRootProvider` and `useAXShadowRoot()` for browser embeds |
| `src/voice.tsx` | Optional React voice bridge. Dynamically imports `@axsdk/voice`, attaches plugin to `AXSDK`, exposes voice state hooks |
| `src/theme.ts` | Public theme type definitions |
| `src/defaultTheme.ts` | Default dark/light themes and `mergeTheme` |
| `src/AXThemeContext.tsx` | Theme provider and `useAXTheme()` |
| `src/cssVariables.ts` | Converts theme values into `--ax-*` custom properties on the portal root |
| `src/index.css` | Portal reset, scoped box model rules, utility classes, animation keyframes |
| `THEME_CUSTOMIZATION.md` | CSS variable, `theme` prop, and per-component style override reference |
| `src/main.tsx`, `src/App.tsx`, `src/App.css`, `index.html` | Vite dev playground only; not shipped |

Component hotspot rules live in `src/components/AGENTS.md`. Read it before changing chat surfaces, popovers, message rendering, input behavior, or root `<AXUI />` composition.

## DEV PLAYGROUND

- `src/App.tsx` is a Vite playground only; it is not part of the published library entry.
- The playground intentionally uses an app shell with `header.app-bar`, `main.app-content`, and `footer.app-footer`, plus long-scroll host-page content to test widget behavior over several viewport heights.
- Keep the playground's SDK init, mock delivery `axHandler` branches, example app auth token, translations, event listeners, and voice bridge intact unless the task is explicitly about playground runtime wiring.
- `src/App.css` uses scoped `app-` classes and `--app-*` tokens. Keep playground styles isolated and avoid `rem` units here too.

## BUILD

```bash
bun run dev
bun run build
bun run build:types
bun run lint
bun run preview
```

`bun run build` runs `tsc -b`, Vite library build, then declaration emit through `tsconfig.build.json`. The library build entry is `src/lib.ts`; shipped files come from `dist/` only.

`rollup-plugin-preserve-use-client` keeps the `"use client";` directive in built output for React Server Components hosts.

## STYLE ISOLATION

Facts from `src/index.css`:

- `.ax-portal-root` applies `all: initial`.
- `.ax-portal-root` restores `display: block`, `box-sizing: border-box`, font family, line height, direction, smoothing, and relative positioning.
- `.ax-portal-root` anchors `font-size: 16px`.
- `.ax-portal-root *`, `*::before`, and `*::after` get scoped `box-sizing: border-box`.
- Theme values are CSS custom properties prefixed with `--ax-*`.

Never use `rem` in component styles. Use `em`, `px`, viewport units already established, or `var(--ax-*)`. Do not add global resets; scope rules to `.ax-portal-root` or package-owned class names.

Keyframes should be prefixed with an AXSDK-owned prefix. Existing examples include `ax-*`, `axchat-*`, and `axv-*`. `slide` is legacy and should not be copied.

## THEME RULES

- Primary reference: `THEME_CUSTOMIZATION.md`.
- `<AXUI theme={...} />` flows through `AXThemeProvider`.
- `injectCSSVariables(portalTarget, theme)` stamps tokens onto the portal root.
- Components should prefer `var(--ax-*)` or `useAXTheme()` before adding new style channels.

## SHADOW DOM AND VOICE

- `AXShadowRootContext.tsx` bridges browser embeds.
- If `useAXShadowRoot()` returns a ShadowRoot, `AXUI` appends portal/dynamic styles there.
- Without a ShadowRoot, `AXUI` appends an `.ax-portal-root` div to `document.body`.
- `useVoicePlugin()` resolves config from the `voice` prop or `AXSDK.config.voice`, dynamically imports `@axsdk/voice`, attaches it to `AXSDK`, and listens for `voice.config.remote`.
- Keep `@axsdk/voice` optional at runtime and peer-based for consumers.

## EDITING CAUTIONS

- Do not move consumer-facing runtime logic into playground files.
- Preserve `.ax-portal-root`, `all: initial`, `font-size: 16px`, scoped box sizing, prefixed keyframes, and `--ax-*` token flow.
- Do not bundle React or ReactDOM.
- Run diagnostics on touched files, then run relevant package build/lint commands after code changes.
- Never publish unless explicitly asked.
