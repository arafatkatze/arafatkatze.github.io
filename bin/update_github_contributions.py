#!/usr/bin/env python3
"""Refresh the GitHub contribution calendar snapshot used by the resume page.

Writes ``assets/json/github_contributions.json``: one daily contribution count
per entry, covering the trailing year that GitHub itself displays.

Data sources, tried in order:

1. GitHub GraphQL API, when ``GITHUB_TOKEN`` (or ``GH_TOKEN``) is set. A
   personal access token belonging to the profile owner also reports private
   contributions, matching what the owner sees on github.com.
2. The public ``github.com/users/<user>/contributions`` calendar fragment,
   which needs no credentials but only reports public activity.

Usage:
    python bin/update_github_contributions.py [--user LOGIN] [--output PATH]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = REPO_ROOT / "assets" / "json" / "github_contributions.json"
CONFIG_FILE = REPO_ROOT / "_config.yml"

GRAPHQL_URL = "https://api.github.com/graphql"
CALENDAR_URL = "https://github.com/users/{user}/contributions"
USER_AGENT = "al-folio-contribution-graph/1.0"
TIMEOUT = 30

GRAPHQL_QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
"""


COUNT_PATTERN = re.compile(r"\s*(No|\d[\d,]*)\s+contribution")


class CalendarParser(HTMLParser):
    """Collects (date, count) pairs from GitHub's contribution calendar HTML.

    Current markup keeps the date on the ``<td>`` and the count in a sibling
    ``<tool-tip for="cell-id">``; older markup used a ``data-count`` attribute
    or nested text. All three shapes are handled.
    """

    def __init__(self) -> None:
        super().__init__()
        self.days: dict[str, int] = {}
        self._date_by_cell_id: dict[str, str] = {}
        self._current_date: str | None = None
        self._tooltip_target: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "td" and "ContributionCalendar-day" in (values.get("class") or ""):
            date = values.get("data-date")
            if not date:
                return
            self._current_date = date
            cell_id = values.get("id")
            if cell_id:
                self._date_by_cell_id[cell_id] = date
            count = values.get("data-count")
            self.days[date] = int(count) if count and count.isdigit() else 0
        elif tag == "tool-tip":
            self._tooltip_target = values.get("for")

    def handle_data(self, data: str) -> None:
        date = self._current_date
        if self._tooltip_target:
            date = self._date_by_cell_id.get(self._tooltip_target)
        if not date:
            return
        match = COUNT_PATTERN.match(data)
        if match:
            raw = match.group(1)
            self.days[date] = 0 if raw == "No" else int(raw.replace(",", ""))

    def handle_endtag(self, tag: str) -> None:
        if tag == "td":
            self._current_date = None
        elif tag == "tool-tip":
            self._tooltip_target = None


def read_default_user() -> str:
    """Pull ``github_username`` out of _config.yml without requiring PyYAML."""
    try:
        text = CONFIG_FILE.read_text(encoding="utf-8")
    except OSError:
        return ""
    match = re.search(r"^github_username:\s*([^\s#]+)", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def http_json(url: str, payload: dict, token: str) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


def http_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read().decode("utf-8")


def fetch_via_graphql(user: str, token: str) -> dict[str, int]:
    body = http_json(GRAPHQL_URL, {"query": GRAPHQL_QUERY, "variables": {"login": user}}, token)
    if body.get("errors"):
        raise RuntimeError(f"GraphQL errors: {body['errors']}")
    calendar = body["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    days: dict[str, int] = {}
    for week in calendar["weeks"]:
        for day in week["contributionDays"]:
            days[day["date"]] = day["contributionCount"]
    return days


def fetch_via_calendar_html(user: str) -> dict[str, int]:
    parser = CalendarParser()
    parser.feed(http_text(CALENDAR_URL.format(user=user)))
    return parser.days


def quartile_thresholds(counts: list[int]) -> list[int]:
    """GitHub-style bucket edges: quartiles over the days with any activity."""
    active = sorted(count for count in counts if count > 0)
    if not active:
        return [1, 2, 3]

    def percentile(fraction: float) -> int:
        index = min(int(round(fraction * (len(active) - 1))), len(active) - 1)
        return active[index]

    edges = [percentile(0.25), percentile(0.5), percentile(0.75)]
    # Keep the edges strictly increasing so every level stays reachable.
    for i in range(1, len(edges)):
        edges[i] = max(edges[i], edges[i - 1] + 1)
    return edges


def build_snapshot(user: str, days: dict[str, int], source: str) -> dict:
    if not days:
        raise RuntimeError("no contribution days were returned")

    dates = sorted(days)
    start = dt.date.fromisoformat(dates[0])
    end = dt.date.fromisoformat(dates[-1])
    span = (end - start).days + 1
    counts = [days.get((start + dt.timedelta(days=offset)).isoformat(), 0) for offset in range(span)]

    return {
        "user": user,
        "source": source,
        "updated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total": sum(counts),
        "max": max(counts),
        "levels": quartile_thresholds(counts),
        "counts": counts,
    }


def write_snapshot(snapshot: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    # Counts on one line keeps the diff readable when only a few days change.
    body = json.dumps(snapshot, indent=2)
    body = re.sub(
        r'"counts": \[[^\]]*\]',
        '"counts": [' + ", ".join(str(count) for count in snapshot["counts"]) + "]",
        body,
        flags=re.DOTALL,
    )
    output.write_text(body + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user", default=os.environ.get("GITHUB_CONTRIB_USER") or read_default_user())
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.user:
        print("error: no GitHub user given and github_username is missing from _config.yml", file=sys.stderr)
        return 2

    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
    attempts = []
    if token:
        attempts.append(("graphql", lambda: fetch_via_graphql(args.user, token)))
    attempts.append(("calendar-html", lambda: fetch_via_calendar_html(args.user)))

    for source, fetch in attempts:
        try:
            days = fetch()
            snapshot = build_snapshot(args.user, days, source)
        except (urllib.error.URLError, RuntimeError, KeyError, ValueError, TimeoutError) as error:
            print(f"warning: {source} lookup failed: {error}", file=sys.stderr)
            continue
        write_snapshot(snapshot, args.output)
        print(
            f"wrote {args.output.relative_to(REPO_ROOT)} "
            f"({snapshot['total']} contributions, {snapshot['start_date']} to {snapshot['end_date']}, via {source})"
        )
        return 0

    print("error: could not retrieve contribution data from any source", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
