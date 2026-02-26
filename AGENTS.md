# AGENTS.md

## Cursor Cloud specific instructions

This is an **al-folio** Jekyll academic website theme. It is a single static site (not a monorepo). There are no databases or backend services.

### Services

| Service | Command | Port |
|---|---|---|
| Jekyll dev server | `bundle exec jekyll serve --port=4000 --host=0.0.0.0` | 4000 |

### Key commands

- **Lint (Prettier):** `npx prettier --check .`
- **Build:** `bundle exec jekyll build`
- **Serve (dev):** `bundle exec jekyll serve --port=4000 --host=0.0.0.0`

See `INSTALL.md` for additional setup options (Docker, devcontainer).

### Non-obvious caveats

- `jupyter-nbconvert` must be on PATH for `jekyll-jupyter-notebook` plugin. It is installed via pip into `~/.local/bin`, which must be on PATH (`export PATH="$HOME/.local/bin:$PATH"` is added to `~/.bashrc`).
- Ruby gems are installed to `vendor/bundle` (local path) via `bundle config set --local path vendor/bundle`. This avoids needing sudo for `bundle install`.
- The Gemfile includes `jekyll-terser` from a GitHub repo, so git must be available for `bundle install`.
- ImageMagick is required because `_config.yml` has `imagemagick.enabled: true` for responsive WebP image generation.
- Sass `@import` deprecation warnings and file conflict warnings during build are expected and come from the existing codebase.
- Prettier lint (`npx prettier --check .`) will report style issues on existing files — this is normal; the codebase has pre-existing formatting inconsistencies.
