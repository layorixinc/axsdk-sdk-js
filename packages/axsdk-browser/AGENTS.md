# AGENTS.md — `@axsdk/browser`

Vanilla JS embed for AXSDK. See the repo-root [`AGENTS.md`](../../AGENTS.md) for monorepo-wide rules.

## Purpose

A single-script embed that drops the AXSDK chat widget onto any web page with no build step:

```html
<script src="https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js"></script>
<script>AXSDKBrowser.init({ apiKey: '...', appId: '...' });</script>
```

Internally it bundles React 19 + `@axsdk/react` + `@axsdk/core` into one IIFE, mounts `<AXUI />` into a host-page `<div>`, and applies aggressive CSS isolation so the widget renders identically regardless of the host page's styles.

> Historical note: an earlier version used a sandboxed `<iframe>` (see commit `db18fb3 removed iframe`). The current implementation renders directly into the host DOM with `all: initial` + scoped resets instead.

## Source layout (`src/`)

| File | Role |
|---|---|
| `embed.ts` | Library entry — defines `AXSDKBrowser.init` / `destroy`, mounts React, injects isolation CSS, exposes `window.AXSDK` |
| `axhandler.ts` | Wraps the host-provided `axHandler` callback with the format `@axsdk/core` expects |
| `types.ts` | Public type re-exports (`AXTheme`, etc.) |

Plus:

- `test.html` — manual smoke test page
- `examples/` — usage snippets
- `vite.config.ts` — custom build (see below)

## Build

Single Vite library build that produces an IIFE bundle:

```bash
bun run dev    # vite --config vite.config.ts
bun run build  # vite build --config vite.config.ts
```

Output:
- `dist/axsdk-browser.js` — IIFE, global name `AXSDK`, **CSS inlined** into the JS bundle as `__AXSDK_INLINED_CSS__`

The custom `inlineCssPlugin` in `vite.config.ts`:

1. Lets Vite emit `axsdk-browser.css` normally during build.
2. In `closeBundle`, reads the CSS, escapes it, and prepends `var __AXSDK_INLINED_CSS__ = \`...\`;` to `axsdk-browser.js`.
3. Deletes the standalone `.css` file so consumers only need the JS file.

`embed.ts` then reads `__AXSDK_INLINED_CSS__` at runtime and injects it into a `<style id="axsdk-browser-styles">` tag in `document.head`, prefixed with the `.ax-portal-root` isolation reset.

The `package.json#exports` map exposes two entries:

- `.` → `./dist/axsdk-browser.js` (the loader / embed)
- `./frame` → `./dist/axsdk-browser-frame.js` (legacy/optional frame entry — confirm presence before relying on it)

## Isolation strategy

`embed.ts` defines `_isolationCss`, which sets on `.ax-portal-root`:

- `all: initial` — wipes inherited host-page styles
- `display: block; box-sizing: border-box`
- `font-size: 16px` — anchors all `em` units in `@axsdk/react`
- `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`
- `line-height: 1.5; direction: ltr`
- Smoothing hints + `position: relative`

Plus a descendant `box-sizing: border-box` rule.

The mount tree is:

```
document.body
└── #axsdk-browser-host        (position:fixed; 0×0; z-index:2147483647; pointer-events:none)
    └── #axsdk-root.ax-portal-root  (React root — <AXUI /> renders here)
```

`z-index: 2147483647` (max int32) ensures the widget sits above any host overlay. `pointer-events: none` on the outer host lets clicks pass through dead zones; child components re-enable pointer events where needed.

Any change to `_isolationCss` must be cross-checked against `@axsdk/react`'s `index.css` and `ISOLATION_STRATEGY.md` — the two packages share the `.ax-portal-root` contract.

## Runtime API

```ts
AXSDKBrowser.init(config: AXSDKBrowserConfig): void
AXSDKBrowser.destroy(): void
```

- `init` is **idempotent-with-warning**: calling twice logs `[AXSDKBrowser] Already initialized` and no-ops.
- `axHandler` is required if the host wants to handle SDK commands; `embed.ts` wraps it via `handleAX` from `axhandler.ts` before passing to `AXSDK.init`.
- `destroy` unmounts React, removes the host element, removes the injected `<style>` tag, and calls `AXSDK.destroy?.()` if present.

`window.AXSDK` is set to the `AXSDKBrowser` object — this is the **public global** consumers script-tag against. Don't rename it.

## Conventions

- **No new runtime dependencies without strong justification.** Every dep ships in the IIFE bundle and inflates the embed size that's loaded on every host page.
- React + ReactDOM are **bundled** here (unlike in `@axsdk/react` where they're peerDeps). That's intentional — vanilla embed consumers don't have React.
- Keep the public surface tiny: `init`, `destroy`, types. Anything richer should live in `@axsdk/react` and be consumed via the React package.
- The IIFE format means **no top-level await** and **no ESM-only syntax** that breaks older browsers in the supported matrix.

## What to be careful about

- The `inlineCssPlugin` is fragile — it relies on Vite's bundle filenames (`axsdk-browser.css` / `browser.css`) and runs in `closeBundle`. If you change the Vite config's `lib.fileName` or output dir, update the plugin paths to match.
- Bumping `@axsdk/core` or `@axsdk/react` requires a fresh `bun install` + rebuild here so the new code lands in the IIFE.
- Don't loosen the `.ax-portal-root` reset to "fix" a styling bug — fix the bug in `@axsdk/react` instead. The reset is the only thing keeping the embed visually predictable across host pages.
- `test.html` is a manual smoke test, not an automated suite — verify it still loads and the widget renders after non-trivial changes.
- Don't run `bun run publish` unless explicitly asked.
