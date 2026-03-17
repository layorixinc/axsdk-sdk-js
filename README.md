# axsdk-sdk-js

A JavaScript/TypeScript SDK monorepo for integrating AI chat into web applications. Provides a framework-agnostic core and a ready-to-use React UI layer.

## Packages

| Package | Description |
|---|---|
| [`@axsdk/core`](./packages/axsdk-core) | Framework-agnostic core: SDK initialization, session management, SSE streaming, and type definitions |
| [`@axsdk/react`](./packages/axsdk-react) | React components: drop-in chat UI built on top of `@axsdk/core` |

## Requirements

- **Node.js** ≥ 18 (for non-Bun usage)
- **Bun** ≥ 1.0 (recommended — used for builds and workspace management)
- **TypeScript** ≥ 5

## Repository Structure

```
axsdk-sdk-js/
├── packages/
│   ├── axsdk-core/      # @axsdk/core
│   └── axsdk-react/     # @axsdk/react
├── package.json         # Bun workspace root
└── tsconfig.json        # Shared TypeScript config
```

## Bootstrap

This repo uses [Bun workspaces](https://bun.sh/docs/install/workspaces).

```bash
# Install all workspace dependencies
bun install
```

### Build individual packages

```bash
# Build @axsdk/core
cd packages/axsdk-core
bun run build

# Build @axsdk/react
cd packages/axsdk-react
bun run build
```

### Development

```bash
# Run @axsdk/core in dev mode
cd packages/axsdk-core
bun run dev

# Run @axsdk/react dev server (Vite, port 3334)
cd packages/axsdk-react
bun run dev
```

## License

MIT
