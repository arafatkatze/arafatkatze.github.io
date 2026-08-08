// End-to-end test for the cross-tab polling sync added to pixel-board.js.
//
// Strategy: serve the REAL assets/js/pixel-board.js inside a minimal harness
// page, then intercept the getpantry SYNC_URL with a single stateful in-process
// mock that acts as the shared "remote" basket. Two isolated browser contexts
// (= two different browsers, each with its own localStorage) both talk to that
// one mock, so we can assert that they converge the way real tabs should.
//
// Nothing here touches the real getpantry board.

import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync } from "fs";

const PORT = 18099;
const GRID_SIZE = 50;
const STORAGE_KEY = "pixel-board-state";
const POLL_WAIT = 5200; // > the 4000ms poll interval, so at least one tick fires
const PUSH_WAIT = 800; // > the 500ms debounce, so a draw's POST lands remotely

const PIXEL_JS = readFileSync(new URL("../assets/js/pixel-board.js", import.meta.url));

// Minimal harness containing exactly the DOM ids pixel-board.js expects.
const HARNESS = `<!doctype html><html><head><meta charset="utf-8">
<style>.pixel-grid-wrapper{width:700px}#pixel-canvas{display:block}</style></head>
<body>
<div id="pixel-board-app">
  <div id="color-swatches"></div>
  <span id="pixel-position"></span>
  <span id="pixel-meta"></span>
  <span id="pixel-count"></span>
  <div class="pixel-grid-wrapper"><canvas id="pixel-canvas"></canvas></div>
  <button id="download-board"></button>
  <button id="submit-board"></button>
</div>
<div id="pixel-submit-modal">
  <span data-pixel-close></span>
  <div id="pixel-submit-form-state"></div>
  <div id="pixel-submit-success-state"></div>
  <form id="pixel-submit-form">
    <img id="pixel-submit-preview" />
    <span id="pixel-submit-caption"></span>
    <textarea id="pixel-submit-message"></textarea>
    <span id="pixel-submit-error"></span>
    <button id="pixel-submit-send"></button>
  </form>
</div>
<script src="/assets/js/pixel-board.js"></script>
</body></html>`;

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = req.url.split("?")[0];
      if (path === "/assets/js/pixel-board.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(PIXEL_JS);
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(HARNESS);
      }
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function emptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

// ---- the shared "remote": one object both browsers read/write through ----
let remoteStore = null;

async function wireRemote(context) {
  await context.route("https://getpantry.cloud/**", async (route) => {
    const method = route.request().method();
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Accept",
    };
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify(remoteStore || {}),
      });
      return;
    }
    if (method === "POST") {
      try {
        remoteStore = JSON.parse(route.request().postData() || "{}");
      } catch {
        /* ignore malformed */
      }
      await route.fulfill({
        status: 200,
        headers: { ...cors, "Content-Type": "text/plain" },
        body: "ok",
      });
      return;
    }
    await route.continue();
  });
}

async function newBoard(browser, label) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  await wireRemote(context);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error(`[${label}] pageerror:`, e.message));
  await page.goto(`http://127.0.0.1:${PORT}/pixels/`, { waitUntil: "load" });
  await page.waitForSelector("#pixel-canvas");
  await page.waitForFunction(() => document.getElementById("pixel-count").textContent !== "");
  return page;
}

async function drawAt(page, x, y) {
  const box = await page.locator("#pixel-canvas").boundingBox();
  const cell = box.width / GRID_SIZE;
  await page.mouse.click(box.x + (x + 0.5) * cell, box.y + (y + 0.5) * cell);
}

async function holdAt(page, x, y) {
  const box = await page.locator("#pixel-canvas").boundingBox();
  const cell = box.width / GRID_SIZE;
  await page.mouse.move(box.x + (x + 0.5) * cell, box.y + (y + 0.5) * cell);
  await page.mouse.down();
}

function cellOf(page, x, y) {
  return page.evaluate(
    ({ key, x, y }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const g = JSON.parse(raw).grid;
      return g && g[y] ? g[y][x] : null;
    },
    { key: STORAGE_KEY, x, y }
  );
}

function countOf(page) {
  return page
    .locator("#pixel-count")
    .textContent()
    .then((t) => {
      const m = (t || "").match(/^(\d+)/);
      return m ? Number(m[1]) : 0;
    });
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const assert = (name, cond, detail = "") => {
    if (cond) console.log(`PASS  ${name}`);
    else {
      failures.push(name);
      console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };

  try {
    const A = await newBoard(browser, "A");
    const B = await newBoard(browser, "B");

    // baseline: both start empty and in agreement
    assert("both tabs start empty", (await countOf(A)) === 0 && (await countOf(B)) === 0);

    // ---- Case 1: A draws -> B converges via poll (the core fix) ----
    await drawAt(A, 5, 5);
    await drawAt(A, 6, 5);
    await A.waitForTimeout(PUSH_WAIT); // let A push to remote
    assert("A has its own 2 pixels", (await countOf(A)) === 2);
    assert("B still blind before polling", (await countOf(B)) === 0, `count=${await countOf(B)}`);

    await B.waitForTimeout(POLL_WAIT); // B polls and should adopt A's board
    assert(
      "B converges to A after a poll",
      (await countOf(B)) === 2 && (await cellOf(B, 5, 5)) === "#6FEDD6" && (await cellOf(B, 6, 5)) === "#6FEDD6",
      `count=${await countOf(B)} c55=${await cellOf(B, 5, 5)}`
    );

    // ---- Case 2: B draws -> A converges (bidirectional, board accumulates) ----
    await drawAt(B, 10, 10);
    await B.waitForTimeout(PUSH_WAIT);
    await A.waitForTimeout(POLL_WAIT);
    assert(
      "A converges to B's later edit",
      (await countOf(A)) === 3 && (await cellOf(A, 10, 10)) === "#6FEDD6",
      `count=${await countOf(A)} c10=${await cellOf(A, 10, 10)}`
    );
    assert("A still keeps earlier pixels", (await cellOf(A, 5, 5)) === "#6FEDD6");

    // ---- Case 3: stale remote must NOT clobber a tab's newer local state ----
    // Inject an OLD board (revision 1). Neither tab should downgrade to it.
    const beforeStale = await countOf(A);
    remoteStore = { grid: emptyGrid(), pixelCount: 0, updatedAt: 1 };
    await A.waitForTimeout(POLL_WAIT);
    assert(
      "stale remote does not wipe newer local",
      (await countOf(A)) === beforeStale && (await cellOf(A, 5, 5)) === "#6FEDD6",
      `count=${await countOf(A)}`
    );

    // ---- Case 4: a poll must NOT overwrite the board mid-drag (isDrawing guard) ----
    // First let A re-publish its real board so remote isn't the stale one.
    await drawAt(A, 0, 0); // toggle on
    await drawAt(A, 0, 0); // toggle off -> still bumps updatedAt and republishes
    await A.waitForTimeout(PUSH_WAIT);

    await holdAt(A, 1, 1); // mouse down held -> isDrawing = true
    await A.waitForTimeout(PUSH_WAIT); // the held pixel's POST lands remotely
    // Now a DIFFERENT, strictly-newer remote appears mid-drag.
    remoteStore = {
      grid: (() => {
        const g = emptyGrid();
        g[40][40] = "#FF6B6B";
        return g;
      })(),
      pixelCount: 1,
      updatedAt: 8888888888888, // far-future revision => unambiguously "newer"
    };
    await A.waitForTimeout(POLL_WAIT); // a poll fires while still holding
    assert(
      "poll skipped while drawing (no mid-drag clobber)",
      (await cellOf(A, 40, 40)) === null && (await cellOf(A, 1, 1)) === "#6FEDD6",
      `c4040=${await cellOf(A, 40, 40)}`
    );

    await A.mouse.up(); // isDrawing = false
    await A.waitForTimeout(POLL_WAIT); // next poll now adopts the newer remote
    assert("after releasing, poll adopts newer remote", (await cellOf(A, 40, 40)) === "#FF6B6B", `c4040=${await cellOf(A, 40, 40)}`);

    // ---- Case 5: backgrounded tab catches up immediately on becoming visible ----
    // B is on the old board; push a new remote, then fire visibility -> immediate pull.
    remoteStore = {
      grid: (() => {
        const g = emptyGrid();
        g[2][2] = "#F4D35E";
        return g;
      })(),
      pixelCount: 1,
      updatedAt: 9999999999999,
    };
    await B.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await B.waitForTimeout(1200); // well under the 4s poll: only the immediate pull can explain it
    assert("visibility regain triggers an immediate catch-up pull", (await cellOf(B, 2, 2)) === "#F4D35E", `c22=${await cellOf(B, 2, 2)}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log("");
  if (failures.length) {
    console.error(`${failures.length} test(s) FAILED: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("All pixel board sync tests passed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
