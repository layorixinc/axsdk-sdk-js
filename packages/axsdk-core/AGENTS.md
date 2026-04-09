# AGENTS.md — `@axsdk/core`

Framework-agnostic core package for the AXSDK JavaScript SDK. See the repo-root [`AGENTS.md`](../../AGENTS.md) for monorepo-wide rules.

## Purpose

`@axsdk/core` provides the runtime foundation that every other package builds on:

- SDK initialization (`AXSDK.init`)
- Session and chat state management (Zustand store)
- SSE streaming for chat responses
- Event bus (`eventemitter3`)
- API client + request/response transforms
- Schema validation (Zod v4)
- All shared TypeScript types

It has **no React, no DOM rendering, and no UI**. It must remain importable from any JS environment (browser, Node, workers).

## Source layout (`src/`)

| File | Role |
|---|---|
| `lib.ts` | Public entry point — re-exports `axsdk` + `axtools` |
| `index.ts` | Internal dev entry (used by `bun run dev`) |
| `cli.ts` | Interactive REPL test harness (`bun run cli`) — reads `.env` |
| `axsdk.ts` | `AXSDK` facade — `init`, `sendMessage`, knowledge, lifecycle |
| `axapi.ts` | High-level API surface |
| `axcall.ts` | Call/invocation primitives |
| `axchat.ts` | Chat session logic |
| `axhandler.ts` | Host-side `axHandler` command dispatch |
| `axtools.ts` | Public utility helpers (re-exported from `lib.ts`) |
| `apiclient.ts` | HTTP client |
| `sse.ts` | Server-sent events streaming |
| `chattransform.ts` | Message normalization / transforms |
| `eventbus.ts` | `eventemitter3` wrapper |
| `store.ts` | Zustand store |
| `config.ts` | Runtime config |
| `translations.ts` | i18n strings |
| `types/` | Shared types — `axsdk.ts`, `chat.ts`, `index.ts` |

## Build

Custom Bun build (no Vite):

```bash
bun run dev          # bun ./src/index.ts
bun run cli          # bun ./src/cli.ts — interactive REPL against a live backend
bun run build        # bun ./build.ts && bun build:types
bun run build:types  # bunx tsc --emitDeclarationOnly
```

The `cli` script reads credentials from `packages/axsdk-core/.env`
(`VITE_AXSDK_API_BASE_URL`, `VITE_AXSDK_API_KEY`, `VITE_AXSDK_APP_ID`, plus
optional `VITE_AXSDK_APP_DOMAIN` / `VITE_AXSDK_APP_AUTH_TOKEN`) and exposes
commands: `send`, `knowledge [group] [page]`, `groups`,
`search <regex> [group] [page]`, `state`, `messages`, `errors`, `clear`.

## Knowledge surface

Knowledge is stored in `knowledgeStore` as `Record<string, unknown[]>` keyed by
group name. `AXSDK.init({ remote_knowledge, knowledge })` selects the source:

- `remote_knowledge: true` — every `getKnowledge` / `searchKnowledge` /
  `getKnowledgeGroups` call hits the server (`/knowledge`, `/knowledge/search`,
  `/knowledge/groups`). `fetchKnowledge` also writes into the store.
- `remote_knowledge: false` (default) — `config.knowledge` (a `Record` or async
  function, same shape as `config.data`) is loaded into the store during `init`
  and all knowledge methods read from the store.

`axhandler.ts` exposes `AX_get_knowledge_groups` and `AX_search_knowledge` for
host-side command dispatch, matching the existing `AX_get_data_categories` /
`AX_search_data` pattern.

`build.ts` produces **two** bundles from `src/lib.ts`:

1. ESM → `dist/lib.js`
2. CJS → `dist/lib.cjs`

Both are **minified**, **browser-targeted**, and prefixed with the `"use client";` banner so the package is safe to import from React Server Components consumers. Type declarations land in `dist/lib.d.ts` via `tsc --emitDeclarationOnly`.

If you change the public surface, update `package.json#exports` to match — both `import`, `require`, and `types` conditions must resolve.

## Conventions

- **No DOM imports** (`document`, `window`) outside of guarded code paths. Anything that needs the DOM should be opt-in or live in `axsdk-react` / `axsdk-browser`.
- **No React imports.** Ever.
- **Validation at boundaries**: Use Zod schemas in `types/` for any data crossing the network boundary.
- **State**: Zustand store in `store.ts` is the single source of truth for session state.
- **Events**: Use the `eventbus.ts` emitter for cross-module signaling rather than direct coupling.
- Strict TypeScript — `noUncheckedIndexedAccess` is on, so always narrow array/index access.

## Versioning

- Current version: see `package.json` (`0.2.13` at time of writing).
- `@axsdk/react` and `@axsdk/browser` pin a `^x.y` range against this package — when bumping the **minor** version of `core`, also bump the dependents' `dependencies` entries and rebuild them in order: `core` → `react` → `browser`.
- Public API breaks should bump the minor (pre-1.0) and be called out in the commit message.

## What to be careful about

- `html2canvas` is a heavy optional dependency used for screenshot capture — don't import it at module top level on hot paths; lazy-load when actually needed.
- The SSE parser in `sse.ts` is the core streaming primitive; bugs here cascade to every consumer. Prefer surgical fixes with reproductions.
- `chattransform.ts` normalizes message shape between server and store — keep transforms pure and idempotent so they're safe to replay.
- Don't run `bun run publish` unless explicitly asked.
