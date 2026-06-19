import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

const ROOT = "/workspace/_site";
const PORT = 18080;
const GRID_SIZE = 50;
const STORAGE_KEY = "pixel-board-state";
const SYNC_URL =
  "https://getpantry.cloud/apiv1/pantry/1fe0a904-31b9-467b-9667-7d46e6ab5773/basket/pixelboard";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
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

function emptyGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

function placePixel(grid, x, y, color) {
  const next = grid.map((row) => row.slice());
  next[y][x] = color;
  return next;
}

async function waitForBoard(page) {
  await page.waitForSelector("#pixel-canvas");
  await page.waitForFunction(() => {
    const count = document.getElementById("pixel-count");
    return count && count.textContent;
  });
}

async function drawAt(page, x, y) {
  const canvas = page.locator("#pixel-canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("canvas not visible");
  }
  const cell = box.width / GRID_SIZE;
  await page.mouse.click(box.x + (x + 0.5) * cell, box.y + (y + 0.5) * cell);
}

async function readStoredState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function readPixelCount(page) {
  const text = await page.locator("#pixel-count").textContent();
  const match = text.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function run() {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const baseUrl = `http://127.0.0.1:${PORT}/pixels/`;
  const failures = [];

  function assert(name, condition, detail = "") {
    if (!condition) {
      failures.push(`${name}${detail ? `: ${detail}` : ""}`);
      console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    } else {
      console.log(`PASS ${name}`);
    }
  }

  try {
    // 1) Basic draw + reload persistence
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForBoard(page);
    await drawAt(page, 5, 5);
    await drawAt(page, 6, 5);
    await page.waitForTimeout(700);

    const afterDraw = await readStoredState(page);
    assert("save includes updatedAt", Boolean(afterDraw?.updatedAt));
    assert("local pixel count after draw", (await readPixelCount(page)) >= 2);

    await page.reload({ waitUntil: "networkidle" });
    await waitForBoard(page);
    await page.waitForTimeout(700);
    assert(
      "pixels survive reload",
      (await readPixelCount(page)) >= 2,
      `count=${await readPixelCount(page)}`
    );

    // 2) Stale remote must not clobber newer local state
    const freshLocal = {
      grid: placePixel(placePixel(emptyGrid(), 10, 10, "#FF6B6B"), 11, 10, "#FF6B6B"),
      pixelCount: 2,
      updatedAt: Date.now(),
    };

    await context.clearCookies();
    await page.evaluate(
      ({ key, value }) => {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: STORAGE_KEY, value: freshLocal }
    );

    await page.route(`**${SYNC_URL}**`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            grid: emptyGrid(),
            pixelCount: 0,
            updatedAt: 1,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForBoard(page);
    await page.waitForTimeout(700);

    const afterStaleRemote = await readStoredState(page);
    assert(
      "newer local beats stale remote",
      afterStaleRemote?.pixelCount === 2 && afterStaleRemote?.grid?.[10]?.[10] === "#FF6B6B",
      JSON.stringify({
        pixelCount: afterStaleRemote?.pixelCount,
        sample: afterStaleRemote?.grid?.[10]?.[10],
      })
    );

    // 3) Drawing before remote fetch completes should not be wiped
    await page.unroute(`**${SYNC_URL}**`);
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    let releaseRemote;
    const remoteGate = new Promise((resolve) => {
      releaseRemote = resolve;
    });

    await page.route(`**${SYNC_URL}**`, async (route) => {
      if (route.request().method() === "GET") {
        await remoteGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            grid: emptyGrid(),
            pixelCount: 0,
            updatedAt: 1,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await waitForBoard(page);
    await drawAt(page, 20, 20);
    await drawAt(page, 21, 20);
    releaseRemote();
    await page.waitForTimeout(700);

    assert(
      "draw-before-fetch survives delayed remote",
      (await readPixelCount(page)) >= 2,
      `count=${await readPixelCount(page)}`
    );

    const racedState = await readStoredState(page);
    assert(
      "delayed remote did not erase raced pixels",
      racedState?.grid?.[20]?.[20] && racedState?.grid?.[20]?.[21],
      JSON.stringify({
        a: racedState?.grid?.[20]?.[20],
        b: racedState?.grid?.[20]?.[21],
      })
    );
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    console.error(`\n${failures.length} test(s) failed`);
    process.exit(1);
  }

  console.log("\nAll pixel board persistence tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
