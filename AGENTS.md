# Development Reference

This repository contains two products:

1. **Jekyll Academic Site** (root `/`): al-folio theme personal website for Ara Khan
2. **Cline SDK** (`sdk-wip-main/`): TypeScript monorepo for building AI agents (Bun workspaces)

## Cursor Cloud specific instructions

### Prerequisites

- **Node.js >= 22** (pre-installed via nvm)
- **Bun >= 1.3.13** — install with `curl -fsSL https://bun.sh/install | bash` then `export PATH="$HOME/.bun/bin:$PATH"`
- **Ruby 3.2+** and **Bundler** (pre-installed in the VM)

### Cline SDK (`sdk-wip-main/`)

Standard commands (see `sdk-wip-main/CONTRIBUTING.md` for details):

| Command | Purpose |
|---------|---------|
| `bun install` | Install all workspace dependencies |
| `bun run build:sdk` | Build SDK packages (shared → llms → agents → core) |
| `bun -F @clinebot/cli build` | Build the CLI |
| `bun run lint` | Lint (Biome) |
| `bun run test` | Run all tests (Vitest) |
| `bun run types` | Typecheck all packages |
| `bun run dev` | Dev mode: build SDK + run CLI interactively |
| `bun run cli` | Run CLI in development mode |

**Gotchas:**

- If `/tmp/cline-data/locks/hub/owners/` has root-owned files from a prior session, tests will fail with `EACCES`. Fix with `sudo rm -rf /tmp/cline-data` before running tests.
- After editing any SDK package source, you must run `bun run build:sdk` before building the CLI or running e2e tests (the CLI bundles from compiled `dist/`, not TypeScript source).
- The `bun run test` command runs tests across all packages in parallel. Individual package tests: `bun -F @clinebot/core test`, etc.

### Jekyll Site (root `/`)

```sh
cd /workspace
bundle install
bundle exec jekyll serve --port=8080 --host=0.0.0.0
```

Site is then accessible at `http://localhost:8080/`.

**Gotchas:**

- The `_config.yml` must exclude `sdk-wip-main/` to prevent Jekyll from scanning node_modules (causes `InvalidYAMLFrontMatterError` on `.astro` files).
- `bundle install` uses `vendor/bundle` path (configured via `.bundle/config`). The `vendor` directory is already excluded from Jekyll builds.
