## Cursor Cloud specific instructions

This repository contains two independent projects:

1. **Jekyll academic site** (root `/workspace`) — a personal website built with the al-folio Jekyll theme
2. **Cline SDK** (`/workspace/sdk-wip-main`) — a TypeScript monorepo for building AI agents

### Jekyll site

- **Serve locally**: `bundle exec jekyll serve --port 8080 --host 0.0.0.0 --config _config.yml,_config_dev.yml`
- The `_config_dev.yml` override excludes `sdk-wip-main` and `node_modules` from Jekyll processing (required because `bun install` in the SDK creates files that confuse Jekyll).
- **Lint**: `npx prettier --check .` (requires `npm install` at root for the Liquid plugin)
- Jupyter (`pip install jupyter nbconvert`) must be available for the `jekyll-jupyter-notebook` plugin to convert `.ipynb` files.
- Sass deprecation warnings are expected and non-blocking.

### Cline SDK

- **Runtime requirements**: Node.js >= 22, Bun >= 1.3.13
- **Install deps**: `cd sdk-wip-main && bun install`
- **Build SDK + CLI**: `bun run build:sdk && bun -F @clinebot/cli build`
- **Lint**: `bun run lint` (uses Biome)
- **Typecheck**: `bun run types`
- **Test**: `bun run test` (runs Vitest across all packages and CLI)
- **Run CLI in dev mode**: `bun run cli` (from `sdk-wip-main/`)
- **Full verification**: `bun run check` (lint + build + typecheck + check-publish)
- The `husky` pre-commit hook runs `lint-staged` which does typecheck + biome check on staged files.
- Running `bun run test` prints `ExperimentalWarning: SQLite` — this is expected and non-blocking.
- After editing SDK packages, always run `bun run build:sdk` before running the CLI to pick up changes.
