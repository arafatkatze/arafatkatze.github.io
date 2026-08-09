# Development Reference

This repository contains the **Jekyll Academic Site** (root `/`), an al-folio theme personal website for Ara Khan.

## Cursor Cloud specific instructions

### Jekyll Site

```sh
cd /workspace
bundle install
bundle exec jekyll serve --port=8080 --host=0.0.0.0
```

Site is then accessible at `http://localhost:8080/`.

**Gotchas:**

- `bundle install` uses `vendor/bundle` path (configured via `.bundle/config`). The `vendor` directory is already excluded from Jekyll builds.
