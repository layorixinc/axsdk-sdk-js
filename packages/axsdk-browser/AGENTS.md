# AGENTS.md for `@axsdk/browser`

Package-specific guidance for the browser embed only. Use the repo-root `AGENTS.md` for monorepo rules, TypeScript conventions, and shared package workflow.

## PACKAGE SNAPSHOT

- Package: `@axsdk/browser`
- Current version: `0.4.25`
- Purpose: single-script browser embed for the AXSDK chat widget
- Runtime bundle: React 19, ReactDOM, `@axsdk/core`, `@axsdk/react`, and `@axsdk/voice`
- Public global: `window.AXSDK`
- Published output: `dist/axsdk-browser.js`

## SOURCE LAYOUT

| Path | Role |
|---|---|
| `src/embed.ts` | IIFE entry. Initializes core, mounts React, creates Shadow DOM, wires voice, exposes `window.AXSDK` |
| `src/axhandler.ts` | Wrapper for the host `axHandler` callback |
| `src/types.ts` | Browser package public types, currently `AXTheme` |
| `examples/` | Manual examples: sitemap FAQ, theme, voice |
| `test.html` | Package-local smoke test page |
| `vite.config.ts` | Vite IIFE build, CSS inlining, PCM worklet inlining |

## BUILD AND EXPORTS

```bash
bun run dev
bun run build
```

`bun run build` runs Vite and produces one browser bundle:

```text
dist/axsdk-browser.js
```

The Vite library build is an IIFE with global name `AXSDK`.

`package.json#exports` exposes only:

```json
{
  ".": "./dist/axsdk-browser.js"
}
```

There is no `./frame` export in the current package. Do not document or depend on one.

## RUNTIME ARCHITECTURE

`src/embed.ts` imports React, ReactDOM, `AXSDK`, `AXUI`, `AXShadowRootProvider`, `@axsdk/react/index.css`, and voice types.

On `AXSDK.init(config)`, the embed:

1. Calls `AXSDK.init()` from `@axsdk/core`.
2. Creates `#axsdk-browser-host`.
3. Appends that host to `document.body`.
4. Attaches an open Shadow DOM with `host.attachShadow({ mode: 'open' })`.
5. Injects a `<style>` tag into the shadow root.
6. Creates `#axsdk-root` inside the shadow root.
7. Renders `<AXUI />` through `ReactDOM.createRoot()`.
8. Wraps the UI in `<AXShadowRootProvider shadowRoot={shadow}>`.

The widget renders inside the open Shadow DOM attached to `#axsdk-browser-host`, not directly into the host page DOM.

## CSS AND WORKLET INLINING

`vite.config.ts` defines build-time constants:

- `__AXSDK_INLINED_CSS__`
- `__AXSDK_PCM_WORKLET__`

The custom CSS plugin reads Vite's emitted CSS, prepends it into `dist/axsdk-browser.js`, and removes the standalone CSS file.

At runtime, `embed.ts` injects `_baseCss + __AXSDK_INLINED_CSS__` into the shadow root. `_baseCss` defines the `:host` reset, sizing anchor, font defaults, and shadow-local `box-sizing` rules.

Voice support uses `__AXSDK_PCM_WORKLET__` to create a Blob URL and pass it as `workletUrl`. It also patches missing `workletUrl` into remote `voice.config.remote` events.

## PUBLIC API

The browser global is `window.AXSDK`. It exposes:

```ts
AXSDK.init(config)
AXSDK.destroy()
AXSDK.voice()
AXSDK.eventBus()
```

- `init` is idempotent with a warning.
- `destroy` unmounts React, removes `#axsdk-browser-host`, revokes the worklet Blob URL, removes the remote voice listener, and calls core `AXSDK.destroy()` when present.
- `voice()` returns the `@axsdk/voice` plugin instance when configured, otherwise `null`.
- `eventBus()` returns the core AXSDK event bus for host-page subscriptions.

## CAUTIONS

- Keep the script-tag API small. Add richer UI behavior in `@axsdk/react`, not here.
- Any runtime dependency increases the IIFE loaded by every host page.
- React and ReactDOM are bundled here on purpose because vanilla browser users may not have React.
- Preserve the open Shadow DOM mount unless the browser embed architecture is intentionally redesigned.
- If CSS inlining changes, confirm `dist/axsdk-browser.js` still works as the only shipped asset.
- If voice wiring changes, verify the PCM worklet Blob URL is created, reused, and revoked correctly.
- Never publish unless explicitly asked.
