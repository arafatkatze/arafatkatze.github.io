import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

const ROOT = "/workspace/_site";
const PORT = 18081;
const SNAPSHOT_URL = "**/assets/json/github_contributions.json";
const LIVE_URL = "https://github-contributions-api.jogruber.de/**";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = req.url.split("?")[0];
      let filePath = join(ROOT, urlPath === "/" ? "index.html" : urlPath);
      if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = join(filePath, "index.html");
      }
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

/** A snapshot payload in the shape written by bin/update_github_contributions.py. */
function snapshotPayload({ endOffset = 0, length = 371, count = 2 } = {}) {
  return {
    user: "testuser",
    start_date: isoDaysAgo(endOffset + length - 1),
    counts: Array.from({ length }, () => count),
  };
}

/** A payload in the shape returned by the live contributions API. */
function livePayload({ endOffset = 0, length = 371, count = 5 } = {}) {
  return {
    total: { lastYear: length * count },
    contributions: Array.from({ length }, (unused, index) => ({
      date: isoDaysAgo(endOffset + length - 1 - index),
      count,
    })),
  };
}

async function stub(page, url, body, status = 200) {
  await page.route(url, (route) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }));
}

async function readGraph(page) {
  await page.waitForSelector(".contrib-graph.is-ready", { timeout: 15000 });
  return page.evaluate(() => {
    const host = document.querySelector(".contrib-graph");
    const cells = [...host.querySelectorAll(".contrib-graph__cells .contrib-graph__cell")];
    return {
      cellCount: cells.length,
      paintedCount: cells.filter((cell) => cell.hasAttribute("data-level")).length,
      levels: [...new Set(cells.map((cell) => cell.getAttribute("data-level")))].sort(),
      firstLabel: cells.find((cell) => cell.hasAttribute("data-label")).getAttribute("data-label"),
      caption: host.querySelector(".contrib-graph__caption").textContent,
      endDate: host.getAttribute("data-end-date"),
      ariaLabel: host.querySelector(".contrib-graph__body").getAttribute("aria-label"),
    };
  });
}

async function run() {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const baseUrl = `http://127.0.0.1:${PORT}/cv/`;
  const failures = [];

  function assert(name, condition, detail = "") {
    if (!condition) {
      failures.push(`${name}${detail ? `: ${detail}` : ""}`);
      console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    } else {
      console.log(`PASS ${name}`);
    }
  }

  async function freshPage() {
    const context = await browser.newContext();
    return context.newPage();
  }

  try {
    // 1) Snapshot renders when the live API is unreachable.
    {
      const page = await freshPage();
      await page.route(LIVE_URL, (route) => route.abort());
      await stub(page, SNAPSHOT_URL, snapshotPayload({ count: 3 }));
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      const graph = await readGraph(page);

      assert("grid covers whole weeks", graph.cellCount % 7 === 0, `cells=${graph.cellCount}`);
      assert("every snapshot day is painted", graph.paintedCount === 371, `painted=${graph.paintedCount}`);
      assert("snapshot total is captioned", graph.caption.startsWith("1,113 contributions in the last year"), graph.caption);
      assert("graph ends today", graph.endDate === isoDaysAgo(0), graph.endDate);
      assert("body is labelled for screen readers", /contribution graph/i.test(graph.ariaLabel), graph.ariaLabel);
      await page.close();
    }

    // 2) Live data replaces the snapshot even when both end on the same day.
    {
      const page = await freshPage();
      await stub(page, SNAPSHOT_URL, snapshotPayload({ count: 3 }));
      await stub(page, LIVE_URL, livePayload({ count: 5 }));
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelector(".contrib-graph__caption")?.textContent.startsWith("1,855"));
      const graph = await readGraph(page);

      assert("live total wins over snapshot", graph.caption.startsWith("1,855 contributions"), graph.caption);
      assert("live response is cached", await page.evaluate(() => Boolean(localStorage.getItem("gh_contributions_arafatkatze"))));
      await page.close();
    }

    // 3) A stale live response never downgrades a fresher snapshot.
    {
      const page = await freshPage();
      await stub(page, SNAPSHOT_URL, snapshotPayload({ count: 3 }));
      await stub(page, LIVE_URL, livePayload({ endOffset: 40, count: 5 }));
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const graph = await readGraph(page);

      assert("stale live data is ignored", graph.endDate === isoDaysAgo(0), graph.endDate);
      assert("snapshot total is kept", graph.caption.startsWith("1,113 contributions"), graph.caption);
      await page.close();
    }

    // 4) Contribution counts map onto the five-step colour scale.
    {
      const page = await freshPage();
      await page.route(LIVE_URL, (route) => route.abort());
      const payload = snapshotPayload({ count: 0 });
      // Five distinct non-zero values so every quartile bucket is exercised.
      payload.counts = payload.counts.map((unused, index) => index % 6);
      await stub(page, SNAPSHOT_URL, payload);
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      const graph = await readGraph(page);

      assert("all five levels are used", graph.levels.join(",") === "0,1,2,3,4", graph.levels.join(","));
      assert(
        "zero-contribution days read as 'No contributions'",
        /^No contributions on \w{3}, \w{3} \d{1,2}, \d{4}$/.test(graph.firstLabel),
        graph.firstLabel
      );
      await page.close();
    }

    // 5) Hovering a day shows its tooltip.
    {
      const page = await freshPage();
      await page.route(LIVE_URL, (route) => route.abort());
      await stub(page, SNAPSHOT_URL, snapshotPayload({ count: 7 }));
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await readGraph(page);

      const cell = page.locator(".contrib-graph__cell[data-label]").nth(100);
      const expected = await cell.getAttribute("data-label");
      await cell.hover();
      const tooltip = page.locator(".contrib-graph__tooltip.is-visible");
      await tooltip.waitFor({ state: "visible", timeout: 5000 });

      assert("tooltip text matches the hovered day", (await tooltip.textContent()) === expected, expected);

      const tooltipBox = await tooltip.boundingBox();
      const cellBox = await cell.boundingBox();
      assert(
        "tooltip sits above the hovered day",
        tooltipBox.y + tooltipBox.height <= cellBox.y + 1,
        JSON.stringify({ tooltip: tooltipBox.y, cell: cellBox.y })
      );
      await page.close();
    }

    // 6) Both sources failing leaves a readable message rather than an empty box.
    {
      const page = await freshPage();
      await page.route(LIVE_URL, (route) => route.abort());
      await page.route(SNAPSHOT_URL, (route) => route.fulfill({ status: 500, body: "boom" }));
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      const status = page.locator(".contrib-graph__status");
      await status.waitFor({ state: "visible", timeout: 10000 });

      assert("fallback message is shown", /unavailable/i.test(await status.textContent()), await status.textContent());
      assert("graph is not marked ready", !(await page.locator(".contrib-graph.is-ready").count()));
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    console.error(`\n${failures.length} test(s) failed`);
    process.exit(1);
  }

  console.log("\nAll GitHub contribution graph tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
