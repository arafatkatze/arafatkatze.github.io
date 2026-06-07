# Shanti · Spiritual Site

A standalone, static one-page website for Shanti — helper, healer, and growth coach.
Dedicated to her son, Maddox.

## Contents

- `index.html` — the full single-page site
- `styles.css` — styling (warm saffron / lotus / Eastern aesthetic)
- `script.js` — interactivity (scroll reveal, falling petals, Bhagavad Gita
  chapter grid, and an interactive "draw a verse" feature)
- `netlify.toml` — Netlify publish configuration

## Run locally

It is pure static HTML — open `index.html` in a browser, or serve it:

```sh
cd shanti-site
python3 -m http.server 8088
# visit http://localhost:8088
```

## Deploy to Netlify

```sh
cd shanti-site
npx netlify-cli deploy --dir=. --prod
```

(Requires a `NETLIFY_AUTH_TOKEN` environment variable or `netlify login`.)
