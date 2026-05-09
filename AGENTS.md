# PROJECT KNOWLEDGE BASE

**Generated:** Tue May 05 2026
**Commit:** `f3e9d2c`
**Branch:** `main`

## OVERVIEW

`axsdk-sdk-js` is a Bun workspace monorepo for AXSDK's JavaScript/TypeScript SDK. It publishes framework-agnostic core logic, React UI, a script-tag browser embed, and an optional voice plugin.

## STRUCTURE

```text
axsdk-sdk-js/
├── scripts/                    # workspace dependency and release helpers
├── docs/                       # focused design and policy notes
├── plans/                      # planning bucket, currently sparse
└── packages/
    ├── axsdk-core/             # @axsdk/core, SDK state/API/SSE/types
    ├── axsdk-react/            # @axsdk/react, React 19 UI and theming
    │   └── src/components/     # chat UI component hotspot
    ├── axsdk-browser/          # @axsdk/browser, single-file IIFE embed
    └── axsdk-voice/            # @axsdk/voice, browser voice I/O plugin
```

## WHERE TO LOOK

| Task | Location | Notes |
|---|---|---|
| SDK init, config, stores | `packages/axsdk-core/src/axsdk.ts`, `store.ts` | Core owns shared runtime state. |
| API calls and SSE | `packages/axsdk-core/src/axapi.ts`, `apiclient.ts`, `sse.ts` | Streaming bugs cascade to every consumer. |
| Public core exports | `packages/axsdk-core/src/lib.ts`, `package.json#exports` | Keep `import`, `require`, `types`, `source` aligned. |
| React public UI | `packages/axsdk-react/src/lib.ts`, `src/components/index.ts` | `lib.ts` imports CSS and exports components plus voice hooks. |
| React component work | `packages/axsdk-react/src/components/` | Read the child `AGENTS.md` first. |
| React theme tokens | `packages/axsdk-react/src/theme.ts`, `defaultTheme.ts`, `cssVariables.ts` | Tokens are emitted as `--ax-*`. |
| Browser embed | `packages/axsdk-browser/src/embed.ts` | Exposes `window.AXSDK`; mounts React in an open Shadow DOM. |
| Browser build | `packages/axsdk-browser/vite.config.ts` | Inlines React CSS and PCM worklet into `dist/axsdk-browser.js`. |
| Voice plugin | `packages/axsdk-voice/src/plugin.ts` | Coordinates capture, transport, TTS, and core events. |
| Voice worklet | `packages/axsdk-voice/public/pcm-worklet.js` | Exported as `@axsdk/voice/pcm-worklet.js`. |

## CODE MAP

| Package | Public entry | Primary output | Role |
|---|---|---|---|
| `@axsdk/core` | `src/lib.ts` | `dist/lib.js`, `dist/lib.cjs`, `dist/lib.d.ts` | SDK facade, state, SSE, EventBus, types |
| `@axsdk/react` | `src/lib.ts` | `dist/lib.js`, `dist/lib.css`, `dist/lib.d.ts` | `<AXUI />`, chat primitives, theme, voice hooks |
| `@axsdk/browser` | `src/embed.ts` | `dist/axsdk-browser.js` | script-tag IIFE, Shadow DOM host, public `window.AXSDK` |
| `@axsdk/voice` | `src/lib.ts` | `dist/lib.js`, `dist/lib.cjs`, `dist/lib.d.ts` | VAD mic capture, transcript dispatch, TTS playback |

## CHILD GUIDANCE

- `packages/axsdk-core/AGENTS.md`
- `packages/axsdk-react/AGENTS.md`
- `packages/axsdk-react/src/components/AGENTS.md`
- `packages/axsdk-browser/AGENTS.md`
- `packages/axsdk-voice/AGENTS.md`

Read the nearest child guide before editing package code.

## CONVENTIONS

- Bun workspace, ESM only, TypeScript strict mode.
- Cross-package imports use package names such as `@axsdk/core`, never relative paths into another package.
- `@axsdk/react` keeps `react` and `react-dom` as peer dependencies.
- `@axsdk/browser` bundles React, ReactDOM, `@axsdk/core`, `@axsdk/react`, and `@axsdk/voice` into the IIFE.
- Core state uses `zustand`; core events use `eventemitter3`; boundary validation uses `zod`.
- React components use inline `React.CSSProperties` plus `--ax-*` CSS variables.

## STYLE ISOLATION

- `.ax-portal-root` is load-bearing.
- `packages/axsdk-react/src/index.css` applies `all: initial`, `font-size: 16px`, and scoped `box-sizing` under `.ax-portal-root`.
- `@axsdk/browser` mounts React inside an open Shadow DOM and injects a `:host` reset plus the inlined React CSS.
- Use `em`, `px`, viewport units already present, or `var(--ax-*)`.
- Never use `rem` in widget styles; it resolves against the host document root.
- Keyframes should be package-prefixed, for example `ax-*`, `axchat-*`, `axbubble-*`, or another `ax` prefix.

## COMMANDS

```bash
bun install
bun run build

cd packages/axsdk-core && bun run build
cd packages/axsdk-react && bun run build
cd packages/axsdk-react && bun run lint
cd packages/axsdk-browser && bun run build
cd packages/axsdk-voice && bun run build
```

Root `bun run build` runs `scripts/set-workspace-deps.mjs`, then builds `axsdk-voice`, `axsdk-core`, `axsdk-react`, and `axsdk-browser` in that order.

## TESTS AND VERIFICATION

- No repo-wide test suite exists.
- `@axsdk/react` is the only package with ESLint: `cd packages/axsdk-react && bun run lint`.
- `@axsdk/voice` has ad-hoc Bun test harnesses: `src/vad.test.ts` and `src/state/machines.test.ts`.
- `@axsdk/browser/test.html` is manual smoke coverage, not an automated suite.
- After changing `core`, rebuild downstream consumers that depend on it.
- After touching style isolation or the browser embed, verify the widget inside a hostile host page.

## ANTI-PATTERNS

- Do not publish to npm or run release scripts unless explicitly asked.
- Do not add a new bundler or test framework without asking.
- Do not loosen strict TypeScript settings.
- Do not bundle host React into `@axsdk/react`.
- Do not break `window.AXSDK` or the script-tag API.
- Do not document or rely on a browser `./frame` export; current `@axsdk/browser` exports only `.`.
- Do not reference missing docs as required reading.
