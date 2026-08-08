#!/usr/bin/env python3
"""Build the 2-D embedding map for the reading highlights.

Pipeline:
  highlights.json  ->  text embeddings  ->  UMAP (2-D)  ->  KMeans clusters
                    ->  per-cluster theme labels (distinctive TF-IDF terms)
                    ->  compact map.json (+ .gz)

Embeddings use sentence-transformers (all-MiniLM-L6-v2) when available for
good semantic clusters; otherwise it falls back to TF-IDF + TruncatedSVD.

Point order in the output matches the order of highlights in highlights.json,
so the map page can pull tooltip text straight from that file by index.
"""
import gzip
import json
import os
import re
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
HL = os.path.join(HERE, "..", "reading-quotes", "highlights.json")
OUT = os.path.join(HERE, "map.json")
K = int(os.environ.get("MAP_K", "7"))
EXPAND = float(os.environ.get("MAP_EXPAND", "1.9"))  # push clusters apart

# Warm, distinct categorical palette (looks vivid on a dark background).
PALETTE = [
    "#e8836b", "#f2b880", "#efd27a", "#9dd18b", "#6fc3b8", "#6db3e8",
    "#8f9ee8", "#c48fe0", "#e88fc0", "#d98f8f", "#b8c47a", "#79cba6",
    "#e0a15c", "#a0d4d0", "#c9a0e8", "#e6c15a", "#88b0d8", "#d78fa8",
]

STOP = set("""a an the and or but if then of to in on for with as at by from into
about over under again further is are was were be been being have has had do does
did doing this that these those i you he she it we they them his her its our your
their my me him us not no nor so than too very can will just don should now what
which who whom whose when where why how all any both each few more most other some
such only own same s t can't don't won't isn't it's you're they're we're i'm i've
one two get got go going make made like really things thing something someone people
person way ways want wants need needs know knows think thinks feel feels much many
said say says saying ask asks asked tell tells told telling would could should might
must shall may come comes came goes went give gives gave take takes took keep keeps
kept put puts even ever every always never around away back time day days man men
woman women good bad big long thought thoughts see seen saw look looks looking find
finds found use used using every everything nothing anything else lot every day
didn doesn isn wasn aren weren hasn hadn haven wouldn couldn shouldn don won ain
https http www com net org html twitter pbs media image jpg png amp via href
""".split())

WORD = re.compile(r"[a-zA-Z][a-zA-Z'-]{2,}")


def load():
    d = json.load(open(HL, encoding="utf-8"))
    texts = [h[0] for h in d["highlights"]]
    cats = [d["categories"][d["books"][h[1]][2]] for h in d["highlights"]]
    return d, texts, cats


def embed(texts):
    try:
        from sentence_transformers import SentenceTransformer
        print("embedding with sentence-transformers all-MiniLM-L6-v2 ...", flush=True)
        model = SentenceTransformer("all-MiniLM-L6-v2")
        emb = model.encode(texts, batch_size=256, show_progress_bar=True,
                           normalize_embeddings=True)
        return np.asarray(emb, dtype=np.float32), "minilm"
    except Exception as e:  # fallback
        print("sentence-transformers unavailable (%s); using TF-IDF+SVD" % e, flush=True)
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.decomposition import TruncatedSVD
        from sklearn.preprocessing import normalize
        vec = TfidfVectorizer(stop_words="english", max_features=40000,
                              ngram_range=(1, 2), min_df=3, sublinear_tf=True)
        X = vec.fit_transform(texts)
        svd = TruncatedSVD(n_components=100, random_state=42)
        emb = svd.fit_transform(X)
        emb = normalize(emb).astype(np.float32)
        return emb, "tfidf"


def layout(emb):
    import umap
    print("UMAP -> 2D ...", flush=True)
    reducer = umap.UMAP(n_neighbors=25, min_dist=0.25, metric="cosine",
                        random_state=42, n_components=2)
    return reducer.fit_transform(emb).astype(np.float32)


def expand_clusters(xy, labels, k, factor):
    """Push whole clusters away from the global centroid to open gaps between
    themes, while preserving each cluster's internal shape."""
    g = xy.mean(0)
    out = xy.copy()
    for c in range(k):
        idx = np.where(labels == c)[0]
        if len(idx) == 0:
            continue
        cen = xy[idx].mean(0)
        out[idx] = xy[idx] + (cen - g) * (factor - 1.0)
    return out


def normalize(xy):
    xy = xy - xy.min(0)
    span = xy.max(0)
    scale = 1000.0 / max(span[0], span[1])
    return (xy * scale).astype(np.float32)


def one_word(w):
    """Reduce a term to a single clean capitalized word (drop hyphen/space tails)."""
    w = re.split(r"[^a-zA-Z]", w, 1)[0]
    return w[:1].upper() + w[1:].lower() if w else w


def cluster(emb, k):
    from sklearn.cluster import KMeans
    print(f"KMeans k={k} ...", flush=True)
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    return km.fit_predict(emb)


def label_clusters(texts, labels, cats, k):
    """Distinctive terms per cluster via class-based TF-IDF-ish scoring."""
    from collections import Counter
    docs = [Counter() for _ in range(k)]
    dfreq = Counter()
    for t, c in zip(texts, labels):
        toks = set(w.lower() for w in WORD.findall(t) if w.lower() not in STOP)
        for w in toks:
            docs[c][w] += 1
            dfreq[w] += 1
    total = len(texts)
    top_terms, top_scores, doms = [], [], []
    for c in range(k):
        n = max(1, sum(1 for l in labels if l == c))
        scores = {}
        for w, cnt in docs[c].items():
            if cnt < 3 or len(w) < 3:
                continue
            inside = cnt / n
            outside = (dfreq[w] - cnt) / max(1, total - n)
            scores[w] = inside / (outside + 0.02)
        srt = sorted(scores.items(), key=lambda kv: -kv[1])
        top_terms.append([w for w, _ in srt[:6]])
        top_scores.append(srt[0][1] if srt else 0)
        cc = Counter(cat for cat, l in zip(cats, labels) if l == c).most_common(1)
        doms.append(cc[0][0] if cc else "")

    # the least-distinctive cluster becomes the "Random" catch-all
    import numpy as _np
    random_c = int(_np.argmin(top_scores))

    used = set()
    label_by_c = {}
    # assign the strongest clusters first so they claim their best word
    for c in sorted(range(k), key=lambda c: -top_scores[c]):
        if c == random_c:
            label_by_c[c] = "Random"
            continue
        bad = {"random", "other", "others", "thing", "things", "stuff", "etc",
               "kind", "sort", "someone", "everyone", "everything"}
        chosen = None
        for w in top_terms[c]:
            ww = one_word(w)
            if len(ww) >= 3 and ww.lower() not in used and ww.lower() not in bad:
                chosen = ww; used.add(ww.lower()); break
        if not chosen:
            chosen = "Theme"
        label_by_c[c] = chosen

    return [{"terms": top_terms[c], "category": doms[c], "label": label_by_c[c]} for c in range(k)]


def main():
    d, texts, cats = load()
    n = len(texts)
    print(f"{n} highlights", flush=True)
    emb, method = embed(texts)
    labels = cluster(emb, K)
    xy = layout(emb)
    xy = expand_clusters(xy, labels, K, EXPAND)
    xy = normalize(xy)
    names = label_clusters(texts, labels, cats, K)

    clusters = []
    for c in range(K):
        idx = np.where(labels == c)[0]
        cx, cy = xy[idx].mean(0) if len(idx) else (0, 0)
        clusters.append({
            "id": c,
            "label": names[c]["label"],
            "terms": names[c]["terms"],
            "category": names[c]["category"],
            "color": PALETTE[c % len(PALETTE)],
            "cx": round(float(cx), 1),
            "cy": round(float(cy), 1),
            "count": int(len(idx)),
        })

    out = {
        "method": method,
        "n": n,
        "k": K,
        "clusters": clusters,
        # parallel arrays, point order == highlights.json order
        "x": [round(float(v), 1) for v in xy[:, 0]],
        "y": [round(float(v), 1) for v in xy[:, 1]],
        "c": [int(v) for v in labels],
    }
    payload = json.dumps(out, separators=(",", ":"))
    open(OUT, "w").write(payload)
    with gzip.open(OUT + ".gz", "wb", compresslevel=9) as f:
        f.write(payload.encode())
    print("wrote %s (%.0f KB) and .gz (%.0f KB)" % (
        OUT, len(payload) / 1024, os.path.getsize(OUT + ".gz") / 1024))
    print("clusters:")
    for c in clusters:
        print(f"  [{c['color']}] {c['count']:5d}  {c['label']}   (cat: {c['category']})")


if __name__ == "__main__":
    main()
