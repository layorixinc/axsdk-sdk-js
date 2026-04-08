# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

`axsdk-sdk-js` is a Bun workspace monorepo containing the JavaScript/TypeScript SDK for the [AXSDK](https://axsdk.ai) AI chat platform. It ships three published packages:

| Package | Path | Purpose |
|---|---|---|
| `@axsdk/core` | `packages/axsdk-core` | Framework-agnostic core: SDK init, session management, SSE streaming, event bus, types |
| `@axsdk/react` | `packages/axsdk-react` | React 19 component library — `<AXUI />` and chat UI primitives built on `@axsdk/core` |
| `@axsdk/browser` | `packages/axsdk-browser` | Vanilla JS embed — single `<script>` tag drops a sandboxed widget on any page |

Dependency graph: `core` ← `react` ← `browser`. Always rebuild downstream packages after changing `core`.

## Setup

- Requires **Bun ≥ 1.0** and **TypeScript ≥ 5**.
- Install everything from the repo root:

  ```bash
  bun install
  ```

## Common commands

Run from each package directory (`packages/axsdk-*`):

| Command | What it does |
|---|---|
| `bun run dev` | Dev server / watch mode (Vite for `react` & `browser`, Bun runner for `core`) |
| `bun run build` | Production build + type declarations |
| `bun run build:types` | Emit `.d.ts` only (core, react) |
| `bun run lint` | ESLint (react package only) |
| `bun run publish` | Build then `npm publish --access=public` — **do not run unless explicitly asked** |

There is no repo-wide test suite. There is no root-level build script — build each package individually in dependency order (`core` → `react` → `browser`).

## Code conventions

- **TypeScript strict mode** is on (see `tsconfig.json`): `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. Honor these — do not loosen them.
- **ESM only** (`"type": "module"`). Use `import`/`export`, not CommonJS.
- **React 19** in `@axsdk/react`. Components use the new JSX transform (`"jsx": "react-jsx"`) — no `import React` needed for JSX.
- **State management**: `zustand` (in `core` and `react`).
- **Events**: `eventemitter3` in `core`.
- **Validation**: `zod` v4 in `core`.
- **Style isolation**: `@axsdk/react` mounts into a `.ax-portal-root` element with `font-size: 16px` anchored and a scoped `box-sizing` reset; `@axsdk/browser` additionally applies `all: initial` on the same root. CSS must use `em`/`px`, **never `rem`** (which would resolve against the host page's `:root`). See `packages/axsdk-react/ISOLATION_STRATEGY.md`.

## Versioning & publishing

- Each package is versioned independently. Current versions live in each `package.json`.
- `@axsdk/react` and `@axsdk/browser` depend on a specific minor of `@axsdk/core` — when bumping `core`, update the dependent packages' `dependencies` entries to match.
- Commit message style for releases follows: `core: 0.2.13 react: 0.4.2 browser: 0.3.2` (see `git log`).
- **Never publish to npm** without an explicit user request.

## What to be careful about

- Don't introduce a bundler or test framework without asking — the repo deliberately keeps tooling minimal (Vite + Bun + tsc).
- Don't add cross-package imports via relative paths (`../axsdk-core/src/...`). Import from the published package name (`@axsdk/core`) so workspace resolution stays clean.
- The `browser` package builds **two** bundles (loader + iframe/frame). Check `packages/axsdk-browser/vite.config.ts` before changing build config.
- `@axsdk/react` is consumed by host apps with their own React — keep `react`/`react-dom` as `peerDependencies`, never bundle them.
- Style isolation in `@axsdk/react` is load-bearing; if you touch CSS units or shadow root setup, verify the widget still renders correctly inside a host page with arbitrary global styles.

## Repo layout

```
axsdk-sdk-js/
├── packages/
│   ├── axsdk-core/      # @axsdk/core    (framework-agnostic)
│   ├── axsdk-react/     # @axsdk/react   (React 19, Shadow DOM)
│   └── axsdk-browser/   # @axsdk/browser (vanilla embed, two bundles)
├── plans/               # design / planning docs
├── package.json         # Bun workspace root
├── tsconfig.json        # shared strict TS config
└── README.md
```
