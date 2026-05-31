#!/usr/bin/env python3
"""Regenerate _data/photography.yml from Cloudinary asset folders.

Usage:
    CLOUDINARY_KEY=...  CLOUDINARY_SECRET=...  bin/sync-photography.py

Reads the asset folders listed in FOLDERS below from your Cloudinary
account and writes one YAML project per folder, with an `images:` list
of delivery URLs. Image URLs include `q_auto,f_auto,c_limit,w_1600`
transformations so browsers get a properly sized WebP/AVIF.

To add a new tab/project, upload photos into a new asset folder in
Cloudinary, then add a (folder_name, slug) tuple to FOLDERS and rerun
this script.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from base64 import b64encode
from pathlib import Path

CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "dozxd4znm")
TRANSFORM = "q_auto,f_auto,c_limit,w_1600"

# (Cloudinary asset folder, page slug). Order matters -- first entry is
# the default tab. Edit this list to add / reorder / remove projects.
FOLDERS: list[tuple[str, str]] = [
    ("Switzerland",    "switzerland"),
    ("Canada",         "canada"),
    ("United Kingdom", "united-kingdom"),
    ("United States",  "united-states"),
]

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = REPO_ROOT / "_data" / "photography.yml"


def fetch_folder(api_key: str, api_secret: str, folder: str) -> list[dict]:
    """Fetch every resource in a Cloudinary asset folder, paging if needed."""
    base = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/resources/by_asset_folder"
    auth = b64encode(f"{api_key}:{api_secret}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}"}
    resources: list[dict] = []
    cursor = None
    while True:
        params = {"asset_folder": folder, "max_results": "500"}
        if cursor:
            params["next_cursor"] = cursor
        url = f"{base}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        resources.extend(data.get("resources", []))
        cursor = data.get("next_cursor")
        if not cursor:
            break
    resources.sort(key=lambda r: r.get("public_id", ""))
    return resources


def url_for(resource: dict) -> str:
    """Inject our transformations into the Cloudinary delivery URL."""
    secure = resource["secure_url"]
    marker = "/image/upload/"
    i = secure.find(marker)
    if i == -1:
        return secure
    head = secure[: i + len(marker)]
    tail = secure[i + len(marker):]
    return f"{head}{TRANSFORM}/{tail}"


def yaml_string(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main() -> int:
    key = os.environ.get("CLOUDINARY_KEY")
    secret = os.environ.get("CLOUDINARY_SECRET")
    if not key or not secret:
        print(
            "error: CLOUDINARY_KEY and CLOUDINARY_SECRET must be set in the environment.",
            file=sys.stderr,
        )
        return 1

    out: list[str] = []
    out.append("# Photography projects.")
    out.append("#")
    out.append("# Each entry below is one tab in the project switcher on /photography/.")
    out.append("# Image URLs use Cloudinary's q_auto,f_auto delivery so the browser gets a")
    out.append("# properly sized WebP/AVIF without us managing variants. To regenerate this")
    out.append("# file after uploading new photos to Cloudinary, run:")
    out.append("#")
    out.append("#   CLOUDINARY_KEY=... CLOUDINARY_SECRET=... bin/sync-photography.py")
    out.append("")
    out.append("projects:")

    for title, slug in FOLDERS:
        try:
            resources = fetch_folder(key, secret, title)
        except Exception as e:
            print(f"error: failed to fetch {title!r}: {e}", file=sys.stderr)
            return 1
        print(f"{title}: {len(resources)} images")
        out.append("")
        out.append(f"  - slug: {slug}")
        out.append(f"    title: {yaml_string(title)}")
        out.append('    description: ""')
        out.append("    images:")
        for r in resources:
            out.append(f"      - {url_for(r)}")

    out.append("")
    OUT_PATH.write_text("\n".join(out))
    print(f"\nWrote {OUT_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
