# The Reading Room — data

This folder is a self-contained web app (`index.html`, `style.css`, `script.js`)
plus its data.

## How to update the highlights

1. Export your highlights from Readwise as CSV.
2. Replace **`highlights.csv`** in this folder with the new export
   (keep the same filename).
3. Regenerate the data payload:

   ```sh
   cd reading-quotes
   python3 generate_highlights_data.py
   ```

4. Commit both `highlights.csv` and the regenerated `highlights.json`.

That's it — the site reads `highlights.json` at runtime, so the library
updates as soon as the new JSON is deployed.

## What the generator does

- Reads `highlights.csv` (Readwise export format).
- Removes Kindle **"you have reached the clipping limit"** noise, and drops any
  highlight tagged `discard`.
- Auto-classifies each book into a topical **category** (Dating &
  Relationships, Philosophy, Psychology & Self, Wealth & Business, etc.) via
  keyword + author scoring.
- Writes a compact, de-duplicated `highlights.json` with lookup tables so the
  browser download stays small.

Expected columns in the CSV: `Highlight, Book Title, Book Author, Amazon Book
ID, Note, Color, Tags, Location Type, Location, Highlighted at, Document tags`.
