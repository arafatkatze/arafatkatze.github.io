// End-to-end test for the 3D Reading Map (/reading-highlights/).
//
// Strategy: serve the real page, script, style and map data straight out of the
// repository, then drive the camera the way a visitor would and check that the
// view actually changed. The WebGL canvas cannot be read back reliably after
// compositing, so every assertion looks at the 2-D overlay canvas instead — it
// carries the theme labels and hover rings, and it is redrawn with the exact
// projection the GPU uses, so a camera move always shows up there.
//
// Software WebGL (SwiftShader) is requested so this passes on headless CI. If a
// machine has no WebGL at all the page falls back to drawing points on the
// overlay, and the same assertions still hold.

import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = 18097;
const MAP_URL = `http://127.0.0.1:${PORT}/reading-highlights/`;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".gz": "application/octet-stream", // served raw: the page inflates it itself
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = req.url.split("?")[0];
      let filePath = join(ROOT, urlPath === "/" ? "index.html" : urlPath);
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

/** Cheap fingerprint of the overlay canvas: identical views hash the same. */
function overlayState(page) {
  return page.evaluate(() => {
    const c = document.getElementById("overlay");
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let hash = 2166136261;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      lit++;
      hash = Math.imul(hash ^ (i + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7), 16777619) >>> 0;
    }
    return { hash, lit };
  });
}

async function openMap(browser, { webgl = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(String(e.message)));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  if (!webgl) {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        if (/webgl/i.test(kind)) return null;
        return original.call(this, kind, ...rest);
      };
    });
  }
  await page.goto(MAP_URL, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("countLabel").textContent !== "…", { timeout: 60000 });
  await page.waitForTimeout(2000);
  return { page, problems };
}

async function run() {
  const server = await startStaticServer();
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
  });
  const failures = [];

  function assert(name, condition, detail = "") {
    if (condition) {
      console.log(`PASS ${name}`);
    } else {
      failures.push(`${name}${detail ? `: ${detail}` : ""}`);
      console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    }
  }

  try {
    // 1) The map data really is three-dimensional.
    {
      const map = JSON.parse(readFileSync(join(ROOT, "reading-highlights/map.json"), "utf8"));
      const spread = (a) => Math.max(...a) - Math.min(...a);
      assert("map.json declares 3 dimensions", map.dims === 3, `dims=${map.dims}`);
      assert("every point has a depth", Array.isArray(map.z) && map.z.length === map.n, `z=${map.z && map.z.length} n=${map.n}`);
      assert(
        "depth is not degenerate",
        spread(map.z) > 0.15 * spread(map.x),
        `z spread=${spread(map.z).toFixed(1)} x spread=${spread(map.x).toFixed(1)}`
      );
      assert(
        "every theme has a depth centroid",
        map.clusters.every((c) => typeof c.cz === "number"),
        JSON.stringify(map.clusters.map((c) => c.cz))
      );
    }

    // 2) The galaxy renders, and dragging orbits it.
    {
      const { page, problems } = await openMap(browser);
      assert("all highlights are counted in the banner", (await page.textContent("#countLabel")) === "10,950", await page.textContent("#countLabel"));

      const painted = await overlayState(page);
      assert("theme labels are painted over the cloud", painted.lit > 500, `lit=${painted.lit}`);

      // stop the idle orbit so any later change is provably the user's doing
      await page.click("#spin");
      await page.waitForTimeout(1200);
      assert("the orbit button reports being paused", (await page.getAttribute("#spin", "aria-pressed")) === "false");

      const still = await overlayState(page);
      await page.waitForTimeout(700);
      const stillAgain = await overlayState(page);
      assert("a paused map holds its pose", still.hash === stillAgain.hash);

      await page.mouse.move(620, 470);
      await page.mouse.down();
      for (let i = 1; i <= 16; i++) await page.mouse.move(620 + i * 14, 470 - i * 5);
      await page.mouse.up();
      await page.waitForTimeout(900);
      const rotated = await overlayState(page);
      assert("dragging rotates the galaxy", rotated.hash !== stillAgain.hash);

      // shift-drag pans instead of rotating
      await page.keyboard.down("Shift");
      await page.mouse.move(620, 470);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(620 - i * 12, 470 + i * 6);
      await page.mouse.up();
      await page.keyboard.up("Shift");
      await page.waitForTimeout(600);
      const panned = await overlayState(page);
      assert("shift-drag pans the galaxy", panned.hash !== rotated.hash);

      // the arrow keys drive the same camera
      for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(700);
      const keyed = await overlayState(page);
      assert("arrow keys rotate the galaxy", keyed.hash !== panned.hash);

      // resuming the orbit animates it again
      await page.click("#spin");
      assert("the orbit button reports spinning", (await page.getAttribute("#spin", "aria-pressed")) === "true");
      const spin1 = await overlayState(page);
      await page.waitForTimeout(900);
      const spin2 = await overlayState(page);
      assert("the idle orbit keeps turning", spin1.hash !== spin2.hash);

      assert("no console errors while orbiting", problems.length === 0, problems.join(" | "));
      await page.close();
    }

    // 3) Zooming, hovering a star, and flattening back to the flat map.
    {
      const { page, problems } = await openMap(browser);
      await page.click("#spin"); // pause the idle orbit
      await page.waitForTimeout(1000);
      const framed = await overlayState(page);

      await page.click("#zoomIn");
      await page.waitForTimeout(500);
      assert("the zoom button moves the camera in", (await overlayState(page)).hash !== framed.hash);

      await page.click("#reset");
      await page.waitForTimeout(1400);

      // hunt across the dense middle of the cloud until a star answers
      let tip = null;
      for (let y = 320; y <= 560 && !tip; y += 16) {
        for (let x = 480; x <= 800 && !tip; x += 16) {
          await page.mouse.move(x, y);
          tip = await page.evaluate(() => {
            if (document.getElementById("tip").hidden) return null;
            return {
              quote: document.getElementById("tipQuote").textContent,
              book: document.getElementById("tipBook").textContent,
              theme: document.getElementById("tipTheme").textContent,
            };
          });
        }
      }
      assert("hovering a star shows its quote", !!tip && tip.quote.length > 4, JSON.stringify(tip));
      assert("the quote names its book and theme", !!tip && tip.book.length > 0 && tip.theme.length > 0, JSON.stringify(tip));

      await page.click("#flatten");
      await page.waitForTimeout(1800);
      assert("the 2D button reports being on", (await page.getAttribute("#flatten", "aria-pressed")) === "true");
      assert("the 2D button offers the way back", (await page.textContent("#flattenText")) === "3D");
      const flatState = await overlayState(page);
      assert("flattening reaches a different view", flatState.hash !== framed.hash);
      assert("flattening leaves the labels drawn", flatState.lit > 500, `lit=${flatState.lit}`);

      await page.click("#flatten");
      await page.waitForTimeout(1800);
      assert("the 3D button restores the galaxy", (await page.getAttribute("#flatten", "aria-pressed")) === "false");

      assert("no console errors while exploring", problems.length === 0, problems.join(" | "));
      await page.close();
    }

    // 4) A theme can be isolated from the legend, and reset clears it.
    {
      const { page, problems } = await openMap(browser);
      const item = page.locator(".legend-item").first();
      const name = await item.locator(".legend-label").textContent();
      await item.click();
      await page.waitForTimeout(1600);

      assert(`clicking "${name}" marks it active`, (await item.getAttribute("class")).includes("active"));
      const dimmed = await page.locator(".legend-item.dim").count();
      assert("the other themes are dimmed", dimmed === (await page.locator(".legend-item").count()) - 1, `dim=${dimmed}`);

      await page.click("#reset");
      await page.waitForTimeout(1600);
      assert("reset clears the isolated theme", (await page.locator(".legend-item.active").count()) === 0);
      assert("no console errors while isolating a theme", problems.length === 0, problems.join(" | "));
      await page.close();
    }

    // 5) Without WebGL the map still draws and still turns.
    {
      const { page, problems } = await openMap(browser, { webgl: false });
      assert("the page notices the missing WebGL", await page.evaluate(() => document.body.classList.contains("no-webgl")));
      const fallback = await overlayState(page);
      assert("points are drawn on the 2D canvas instead", fallback.lit > 3000, `lit=${fallback.lit}`);

      await page.click("#spin");
      await page.waitForTimeout(1000);
      const before = await overlayState(page);
      await page.mouse.move(620, 470);
      await page.mouse.down();
      for (let i = 1; i <= 16; i++) await page.mouse.move(620 + i * 14, 470 - i * 5);
      await page.mouse.up();
      await page.waitForTimeout(800);
      assert("the fallback rotates too", (await overlayState(page)).hash !== before.hash);
      assert("no console errors without WebGL", problems.length === 0, problems.join(" | "));
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
  console.log("\nAll 3D Reading Map tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
