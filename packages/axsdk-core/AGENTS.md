# AGENTS.md for `@axsdk/core`

Child-level guidance for the core package only. Use the repo-root `AGENTS.md` for monorepo rules, shared TypeScript settings, release policy, and cross-package build order.

## PACKAGE FACTS

- Package: `@axsdk/core`
- Current version: `0.4.25`
- Runtime role: framework-agnostic SDK core for AXSDK chat, calls, tools, streaming, plugins, state, and shared types
- Package format: ESM package with ESM and CJS build outputs
- Public export: `package.json#exports["."]` points to `dist/lib.js`, `dist/lib.cjs`, `dist/lib.d.ts`, and source export `src/lib.ts`

## BOUNDARIES

- No React imports or React assumptions in this package.
- DOM access must stay guarded and opt-in. Keep top-level imports safe for browser, Node, workers, and bundlers.
- Validate API/config boundary data with Zod.
- Use the Zustand stores in `store.ts` for SDK state.
- Use `EventBus` from `eventbus.ts` for cross-module signaling.

## SOURCE MAP

| Path | Purpose |
|---|---|
| `src/lib.ts` | Public package entry and supported export surface |
| `src/index.ts` | Bun dev entry used by `bun run dev` |
| `src/cli.ts` | Local interactive CLI harness used by `bun run cli` |
| `src/axsdk.ts` | Main `AXSDK` facade, init, lifecycle, chat, config, plugins |
| `src/axapi.ts` | High-level API helpers |
| `src/axcall.ts` | Call and invocation primitives |
| `src/axchat.ts` | Chat session orchestration |
| `src/axhandler.ts` | Host command dispatch through configured handlers |
| `src/axtools.ts` | Public tool helpers and guarded DOM utilities |
| `src/apiclient.ts` | HTTP client and request plumbing |
| `src/sse.ts` | Server-sent event streaming parser and transport |
| `src/chattransform.ts` | Chat message normalization between API and store shapes |
| `src/eventbus.ts` | `eventemitter3` wrapper |
| `src/store.ts` | Zustand app, chat, knowledge, and related stores |
| `src/config.ts` | Runtime config defaults and accessors |
| `src/translations.ts` | Translation defaults and lookup support |
| `src/plugin.ts` | Plugin contracts and registry support |
| `src/deferred.ts` | Deferred-call manager exported as `DeferredCallManager` |
| `src/types/` | Shared public and internal TypeScript types plus Zod schemas |

## BUILD

Custom Bun build, no Vite:

```bash
bun run dev          # bun ./src/index.ts
bun run cli          # bun ./src/cli.ts
bun run build        # bun ./build.ts && bun build:types
bun run build:types  # bunx tsc --emitDeclarationOnly
```

`build.ts` builds from `src/lib.ts` into `dist/`:

1. ESM output: `dist/lib.js`
2. CJS output: `dist/lib.cjs`
3. Types: `dist/lib.d.ts`
4. Linked source maps for both JS bundles

Both JS bundles are browser-targeted, minified, and include the `"use client";` banner.

## PUBLIC API RULES

- Keep `src/lib.ts` as the single public source entry.
- If the public surface changes, update `package.json#exports` and generated declarations together.
- Preserve the `source` export so workspace and source-aware tooling can resolve `src/lib.ts`.
- Do not expose internal store details unless they are already supported API.
- Keep public types stable when possible. This package is pre-1.0, but breaking API changes should still be deliberate and documented.

## GOTCHAS

- `sse.ts` is shared by every streaming consumer. Keep fixes small and verify stream edge cases.
- `chattransform.ts` should stay pure and replay-safe. Store updates depend on repeatable transforms.
- `axtools.ts` may touch browser APIs for screenshots or DOM capture. Keep those imports lazy or guarded.
- `html2canvas` is heavy. Do not import it on hot paths or at module top level unless the guarded path requires it.
- `plugin.ts` and `deferred.ts` are part of async extension flow. Avoid hidden global state when adding plugin behavior.
- `cli.ts` reads local environment credentials and can hit live backends. Do not treat it as a unit test.
- Never run publish or release scripts unless explicitly asked.
