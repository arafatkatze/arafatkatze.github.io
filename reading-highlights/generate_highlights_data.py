#!/usr/bin/env python3
"""Generate compact JSON for the reading-highlights library from the Readwise CSV export.

Usage: python3 generate_highlights_data.py /path/to/highlights.csv highlights.json

The output is a compact structure with de-duplicated lookup tables to keep the
payload small enough to ship to the browser as a single static file.
"""
import csv
import json
import re
import sys
import collections

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/highlights.csv"
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "highlights.json"

# --- Category classification -------------------------------------------------
# Topical buckets scored by keyword hits against title (+author fallback).
CATEGORY_KEYWORDS = {
    "Dating & Relationships": [
        "dating", "women", "woman", "seduction", "seduc", "attract", "mating",
        "romance", "relationship", "sexual", "marriage", "intimacy", "mystery method",
        "alabaster", "value of others", "nice guy", "limerence", "erotic", "marketplace",
        "girlfriend", "breakup", "flirt", "polly", "captivity", "courtship", "masculine",
        "feminine", "boundaries", "heartbreak", "lover",
    ],
    "Psychology & Self": [
        "self-esteem", "esteem", "psychology", "psycholog", "anxiety", "emotion",
        "trauma", "shadow", "attachment", "narciss", "confidence", "therapy", "feelings",
        "self-help", "love yourself", "codepend", "inner", "healing", "self-love",
        "self-compassion", "mindset", "grief", "depression", "identity",
    ],
    "Philosophy": [
        "philosoph", "stoic", "incerto", "procrustes", "antifragile", "randomness",
        "black swan", "skin in the game", "finite and infinite", "meaning", "existential",
        "krishnamurti", "aphorism", "wisdom", "ethics", "truth", "absurd", "nihil",
        "metaphysic", "consciousness", "obstacle is the way", "fountainhead", "mimetic",
        "wanting", "dignity", "rationalist", "manifestation",
    ],
    "Wealth & Business": [
        "wealth", "money", "startup", "business", "entrepreneur", "almanack", "balaji",
        "invest", "founder", "company", "marketing", "economics", "workweek", "4-hour",
        "minimalist entrepreneur", "leverage", "capital", "negotiat", "sales", "career",
        "productivity", "million", "rich", "finance", "anthology",
    ],
    "Health & Fitness": [
        "fitness", "muscle", "leaner", "stronger", "diet", "running", "workout", "sleep",
        "exercise", "nutrition", "strength", "ultra", "marathon", "weight", "training",
        "protein", "cardio", "insomnia", "headache", "heal your",
    ],
    "Spirituality & Mindfulness": [
        "spiritual", "waking up", "meditation", "mindful", "buddhis", "zen", "awareness",
        "enlighten", "dharma", "tao", "presence", "10% happier", "non-dual", "soul",
        "sacred", "prayer", "god", "religion", "surrender", "awaken", "siddhartha",
        "let your life speak", "vocation",
    ],
    "Writing & Creativity": [
        "writing", "great work", "storytell", "prose", "creativ", "craft of", "on writing",
        "poetry", "poem", "novel", "artist", "imagination", "make something",
        "letters to a young poet", "paul graham", "essays that will change",
    ],
    "Productivity & Habits": [
        "habit", "deep work", "atomic", "procrastinat", "discipline", "focus", "time management",
        "getting things done", "routine", "systems", "willpower",
    ],
    "Science & Technology": [
        "science", "physics", "algorithm", "brain", "neuro", "technology", "biology",
        "evolution", "quantum", "cosmos", "universe", "genetic", "machine learning",
        "artificial intelligence", "computer",
    ],
}

# Blog/substack authors and prolific authors mapped directly.
AUTHOR_CATEGORY = {
    "heather havrilesky": "Dating & Relationships",
    "ask-polly.com": "Dating & Relationships",
    "orion taraban": "Dating & Relationships",
    "robert glover": "Dating & Relationships",
    "ava": "Dating & Relationships",
    "ava.substack.com": "Dating & Relationships",
    "nassim nicholas taleb": "Philosophy",
    "james carse": "Philosophy",
    "nathaniel branden": "Psychology & Self",
    "kamal ravikant": "Psychology & Self",
    "mark manson": "Psychology & Self",
    "markmanson.net": "Psychology & Self",
    "lawrence yeo": "Psychology & Self",
    "moretothat.com": "Psychology & Self",
    "dan harris": "Spirituality & Mindfulness",
    "naval ravikant": "Wealth & Business",
    "eric jorgenson": "Wealth & Business",
    "eric jorgenson, jack butcher, and tim ferriss": "Wealth & Business",
    "nav.al": "Wealth & Business",
    "paul graham": "Writing & Creativity",
    "paulgraham.com": "Writing & Creativity",
    "henrik karlsson": "Writing & Creativity",
    "sasha chapin": "Writing & Creativity",
    "brainpickings.org": "Writing & Creativity",
    "luke burgis": "Philosophy",
    "scott adams": "Psychology & Self",
    "brianna wiest": "Psychology & Self",
    "aella": "Dating & Relationships",
    "goodlookingloser.com": "Dating & Relationships",
    "paul millerd": "Wealth & Business",
    "sam altman": "Wealth & Business",
    "blog.samaltman.com": "Wealth & Business",
    "hermann hesse, sbp editors": "Spirituality & Mindfulness",
    "parker j. palmer": "Spirituality & Mindfulness",
    "ayn rand and leonard peikoff": "Philosophy",
}

OTHER = "Essays & Ideas"


def classify(title, author):
    t = (title or "").lower()
    a = (author or "").lower().strip()
    scores = collections.Counter()
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                scores[cat] += 1
    if scores:
        # highest score wins; ties broken by CATEGORY_KEYWORDS insertion order
        best = max(scores.items(), key=lambda kv: (kv[1], -list(CATEGORY_KEYWORDS).index(kv[0])))
        return best[0]
    if a in AUTHOR_CATEGORY:
        return AUTHOR_CATEGORY[a]
    return OTHER


def clean_title(title):
    """Make messy export titles a bit more human."""
    s = (title or "").strip()
    # strip a trailing " (2014)" style year but keep meaningful parens otherwise handled later
    s = re.sub(r"\s+", " ", s.replace("_", " ")).strip()
    return s


def clean_author(author):
    a = (author or "").strip()
    if not a or a.lower() in ("unknown", "readwise reader"):
        return ""
    return a


COLOR_CODE = {"": 0, "yellow": 1, "orange": 2, "blue": 3}


def main():
    rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8")))

    books = {}          # title -> id
    book_list = []      # [title, authorId, catId, favCount]
    authors = {"": 0}
    author_list = [""]
    cats = {}
    cat_list = []

    def author_id(name):
        if name not in authors:
            authors[name] = len(author_list)
            author_list.append(name)
        return authors[name]

    def cat_id(name):
        if name not in cats:
            cats[name] = len(cat_list)
            cat_list.append(name)
        return cats[name]

    highlights = []
    skipped = 0
    for r in rows:
        text = (r.get("Highlight") or "").strip()
        if not text:
            skipped += 1
            continue
        tags = [x.strip().lower() for x in (r.get("Tags") or "").split(",") if x.strip()]
        if "discard" in tags:
            skipped += 1
            continue
        title = clean_title(r.get("Book Title"))
        if not title:
            title = "Uncategorized"
        author = clean_author(r.get("Book Author"))

        if title not in books:
            aid = author_id(author)
            cid = cat_id(classify(title, author))
            books[title] = len(book_list)
            book_list.append([title, aid, cid, 0])
        bid = books[title]

        fav = 1 if "favorite" in tags else 0
        if fav:
            book_list[bid][3] += 1
        color = COLOR_CODE.get((r.get("Color") or "").strip().lower(), 0)
        note = (r.get("Note") or "").strip()

        # highlight record: [text, bookId, fav, color, note]
        rec = [text, bid, fav, color]
        if note:
            rec.append(note)
        highlights.append(rec)

    # order categories by size for nicer default display
    cat_counts = collections.Counter()
    for b in book_list:
        pass
    hl_cat_counts = collections.Counter()
    for h in highlights:
        cid = book_list[h[1]][2]
        hl_cat_counts[cid] += 1

    out = {
        "generatedFrom": CSV_PATH.split("/")[-1],
        "authors": author_list,
        "categories": cat_list,
        "categoryCounts": [hl_cat_counts.get(i, 0) for i in range(len(cat_list))],
        "books": book_list,
        "highlights": highlights,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"highlights: {len(highlights)} (skipped {skipped})")
    print(f"books: {len(book_list)}  authors: {len(author_list)}  categories: {len(cat_list)}")
    print("category breakdown:")
    for i, c in enumerate(cat_list):
        print(f"  {hl_cat_counts.get(i,0):5d}  {c}")


if __name__ == "__main__":
    main()
