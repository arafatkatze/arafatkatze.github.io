/* ============================================================
   The Reading Map — fast Canvas galaxy of highlights
   ============================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  const canvas = $("map");
  const ctx = canvas.getContext("2d");
  const tip = $("tip");

  let MAP = null;      // {clusters, x[], y[], c[], n}
  let HL = null;       // highlights payload (for tooltip text)
  let colorOf = [];    // cluster id -> color
  let labelOf = [];    // cluster id -> display label

  // view transform (data -> screen, CSS px):  s = d*scale + t
  let scale = 1, tx = 0, ty = 0, fitScale = 1;
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let W = 0, H = 0;

  let grid = null, cell = 24; // spatial index in data space
  let hoverI = -1, selI = -1, focusCluster = -1, focusPreview = -1;
  let needsDraw = false;

  // ---------- load ----------
  Promise.resolve()
    .then(() => loadGz("map.json.gz", "map.json"))
    .then((m) => {
      MAP = m;
      colorOf = MAP.clusters.map((c) => c.color);
      labelOf = MAP.clusters.map((c) => titleize(c.label));
      $("countLabel").textContent = MAP.n.toLocaleString();
      setup();
      $("loading").classList.add("done");
    })
    .catch((e) => { $("loading").innerHTML = "<p>could not load the map</p>"; console.error(e); });

  // tooltip text loads in parallel; map is interactive before it arrives
  loadGz("../reading-quotes/highlights.json.gz", "../reading-quotes/highlights.json")
    .then((d) => { HL = d; })
    .catch((e) => console.warn("tooltip text unavailable", e));

  async function loadGz(gzUrl, plainUrl) {
    if (typeof DecompressionStream !== "undefined") {
      try {
        const r = await fetch(gzUrl);
        if (r.ok && r.body) {
          const s = r.body.pipeThrough(new DecompressionStream("gzip"));
          return JSON.parse(await new Response(s).text());
        }
      } catch (e) { /* fall through */ }
    }
    return (await fetch(plainUrl)).json();
  }

  // ---------- setup ----------
  function setup() {
    resize();
    buildGrid();
    buildLegend();
    fitView();
    bind();
    requestDraw();
    setTimeout(() => $("stageHint") && $("stageHint").classList.add("hide"), 5200);
  }

  function resize() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function dataBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const { x, y } = MAP;
    for (let i = 0; i < MAP.n; i++) {
      if (x[i] < minX) minX = x[i]; if (x[i] > maxX) maxX = x[i];
      if (y[i] < minY) minY = y[i]; if (y[i] > maxY) maxY = y[i];
    }
    return { minX, minY, maxX, maxY };
  }

  function fitView() {
    const b = dataBounds();
    const spanX = Math.max(1, b.maxX - b.minX), spanY = Math.max(1, b.maxY - b.minY);
    const pad = 46;
    fitScale = Math.min((W - pad * 2) / spanX, (H - pad * 2 - 70) / spanY);
    scale = fitScale;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    tx = W / 2 - cx * scale;
    ty = (H / 2 + 20) - cy * scale;
    requestDraw();
  }

  // ---------- spatial grid ----------
  function buildGrid() {
    grid = new Map();
    const { x, y } = MAP;
    for (let i = 0; i < MAP.n; i++) {
      const key = ((x[i] / cell) | 0) + "," + ((y[i] / cell) | 0);
      let a = grid.get(key); if (!a) grid.set(key, (a = [])); a.push(i);
    }
  }

  function pointAt(sx, sy) {
    // screen -> data
    const dx = (sx - tx) / scale, dy = (sy - ty) / scale;
    const gx = (dx / cell) | 0, gy = (dy / cell) | 0;
    let best = -1, bestD = 12 * 12; // px^2 threshold
    for (let ox = -1; ox <= 1; ox++)
      for (let oy = -1; oy <= 1; oy++) {
        const a = grid.get((gx + ox) + "," + (gy + oy));
        if (!a) continue;
        for (const i of a) {
          const px = MAP.x[i] * scale + tx, py = MAP.y[i] * scale + ty;
          const d = (px - sx) * (px - sx) + (py - sy) * (py - sy);
          if (d < bestD) { bestD = d; best = i; }
        }
      }
    return best;
  }

  // ---------- draw ----------
  function requestDraw() { if (!needsDraw) { needsDraw = true; requestAnimationFrame(draw); } }

  function pointRadius() {
    return Math.max(1.1, Math.min(7, 1.5 * Math.pow(scale / fitScale, 0.42)));
  }

  function draw() {
    needsDraw = false;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const r = pointRadius();
    const { x, y, c } = MAP;
    // batch points by cluster to minimize state changes
    const paths = MAP.clusters.map(() => new Path2D());
    for (let i = 0; i < MAP.n; i++) {
      const sx = x[i] * scale + tx, sy = y[i] * scale + ty;
      if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;
      const p = paths[c[i]];
      p.moveTo(sx + r, sy);
      p.arc(sx, sy, r, 0, 6.2832);
    }
    const eff = focusCluster >= 0 ? focusCluster : focusPreview;
    const baseAlpha = document.body.dataset.theme === "day" ? 0.9 : 0.82;
    for (let k = 0; k < paths.length; k++) {
      const dim = eff >= 0 && eff !== k;
      ctx.globalAlpha = dim ? 0.06 : baseAlpha;
      ctx.fillStyle = colorOf[k];
      ctx.fill(paths[k]);
    }
    ctx.globalAlpha = 1;

    drawLabels(eff);
    if (selI >= 0) drawRing(selI, true);
    if (hoverI >= 0 && hoverI !== selI) drawRing(hoverI, false);
    ctx.restore();
  }

  function drawLabels(eff) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const night = document.body.dataset.theme !== "day";
    // biggest themes first; skip labels that would collide with a placed one,
    // so the view stays legible and more labels reveal themselves on zoom-in.
    const order = MAP.clusters.map((c, k) => k).sort((a, b) => MAP.clusters[b].count - MAP.clusters[a].count);
    const placed = [];
    for (const k of order) {
      if (eff >= 0 && eff !== k) continue;
      const cl = MAP.clusters[k];
      const sx = cl.cx * scale + tx, sy = cl.cy * scale + ty;
      if (sx < -60 || sx > W + 60 || sy < -30 || sy > H + 30) continue;
      const size = Math.max(13, Math.min(22, 13 + Math.log2(cl.count) - 6 + (scale / fitScale - 1) * 2.2));
      ctx.font = `600 ${size}px "Fraunces", Georgia, serif`;
      const txt = labelOf[k];
      const w = ctx.measureText(txt).width + 12, h = size + 8;
      const box = { x: sx - w / 2, y: sy - h / 2, w, h };
      let clash = false;
      if (eff < 0) {
        for (const p of placed) {
          if (box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y) { clash = true; break; }
        }
      }
      if (clash) continue;
      placed.push(box);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = night ? "rgba(8,10,18,0.9)" : "rgba(246,240,226,0.92)";
      ctx.strokeText(txt, sx, sy);
      ctx.fillStyle = colorOf[k];
      ctx.fillText(txt, sx, sy);
    }
  }

  function drawRing(i, selected) {
    const sx = MAP.x[i] * scale + tx, sy = MAP.y[i] * scale + ty;
    const r = pointRadius();
    ctx.beginPath();
    ctx.arc(sx, sy, r + (selected ? 6 : 4), 0, 6.2832);
    ctx.lineWidth = selected ? 2.5 : 1.8;
    ctx.strokeStyle = colorOf[MAP.c[i]];
    ctx.globalAlpha = 1;
    ctx.stroke();
    // bright center
    ctx.beginPath();
    ctx.arc(sx, sy, r + 0.5, 0, 6.2832);
    ctx.fillStyle = document.body.dataset.theme === "day" ? "#fff" : "#fff";
    ctx.fill();
    ctx.fillStyle = colorOf[MAP.c[i]];
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill();
  }

  // ---------- tooltip ----------
  function showTip(i, clientX, clientY) {
    if (i < 0) { tip.hidden = true; return; }
    if (!HL) return; // text not loaded yet
    const h = HL.highlights[i];
    const b = HL.books[h[1]];
    const author = HL.authors[b[1]] || "";
    $("tipQuote").textContent = truncate(h[0], 320);
    $("tipBook").textContent = b[0];
    $("tipAuthor").textContent = author;
    $("tipTheme").textContent = labelOf[MAP.c[i]];
    tip.style.setProperty("--tip-color", colorOf[MAP.c[i]]);
    tip.hidden = false;
    positionTip(clientX, clientY);
  }
  function positionTip(clientX, clientY) {
    if (tip.hidden) return;
    if (window.innerWidth <= 720) return; // bottom sheet on mobile
    const rect = tip.getBoundingClientRect();
    let x = clientX + 16, y = clientY + 16;
    if (x + rect.width > window.innerWidth - 8) x = clientX - rect.width - 16;
    if (y + rect.height > window.innerHeight - 8) y = clientY - rect.height - 16;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }

  // ---------- interaction ----------
  function bind() {
    window.addEventListener("resize", () => { resize(); requestDraw(); });

    // hover (mouse only)
    canvas.addEventListener("mousemove", (e) => {
      const i = pointAt(e.clientX, e.clientY - canvas.getBoundingClientRect().top);
      if (i !== hoverI) { hoverI = i; requestDraw(); }
      if (i >= 0) { showTip(i, e.clientX, e.clientY); canvas.style.cursor = "pointer"; }
      else if (!dragging) { tip.hidden = selI < 0; canvas.style.cursor = "grab"; if (selI < 0) hoverI = -1; }
      if (i >= 0) positionTip(e.clientX, e.clientY);
    });
    canvas.addEventListener("mouseleave", () => { if (selI < 0) { hoverI = -1; tip.hidden = true; requestDraw(); } });

    // wheel zoom
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const top = canvas.getBoundingClientRect().top;
      zoomAt(e.clientX, e.clientY - top, Math.pow(1.0015, -e.deltaY));
    }, { passive: false });

    // pointer pan / pinch / tap
    const pts = new Map();
    let last = null, pinchDist = 0, moved = 0;
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      last = { x: e.clientX, y: e.clientY }; moved = 0;
      dragging = true; canvas.classList.add("grabbing");
      if (pts.size === 2) pinchDist = twoDist(pts);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const top = canvas.getBoundingClientRect().top;
      if (pts.size === 2) {
        const d = twoDist(pts), mid = twoMid(pts);
        if (pinchDist > 0) zoomAt(mid.x, mid.y - top, d / pinchDist);
        pinchDist = d;
      } else if (last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        tx += dx; ty += dy; requestDraw();
        if (!tip.hidden && selI < 0) tip.hidden = true;
      }
      last = { x: e.clientX, y: e.clientY };
    });
    const up = (e) => {
      if (pts.size === 1 && moved < 6) {
        // tap: select nearest
        const top = canvas.getBoundingClientRect().top;
        const i = pointAt(e.clientX, e.clientY - top);
        selI = i; hoverI = i;
        if (i >= 0) showTip(i, e.clientX, e.clientY); else tip.hidden = true;
        requestDraw();
      }
      pts.delete(e.pointerId);
      if (pts.size < 2) pinchDist = 0;
      if (pts.size === 0) { dragging = false; last = null; canvas.classList.remove("grabbing"); }
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    $("zoomIn").addEventListener("click", () => zoomAt(W / 2, H / 2, 1.4));
    $("zoomOut").addEventListener("click", () => zoomAt(W / 2, H / 2, 1 / 1.4));
    $("reset").addEventListener("click", () => { focusCluster = -1; selI = -1; tip.hidden = true; syncLegend(); fitView(); });
    $("themeToggle").addEventListener("click", toggleTheme);
    $("legendToggle").addEventListener("click", () => {
      const l = $("legend"); l.classList.toggle("collapsed");
      $("legendToggle").textContent = l.classList.contains("collapsed") ? "+" : "–";
    });
    restoreTheme();
  }

  let dragging = false;
  function twoDist(pts) { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  function twoMid(pts) { const a = [...pts.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }

  function zoomAt(sx, sy, factor) {
    const ns = Math.max(fitScale * 0.5, Math.min(fitScale * 60, scale * factor));
    const k = ns / scale;
    tx = sx - (sx - tx) * k;
    ty = sy - (sy - ty) * k;
    scale = ns;
    requestDraw();
  }

  // ---------- legend ----------
  function buildLegend() {
    const body = $("legendBody");
    body.innerHTML = "";
    MAP.clusters.slice().sort((a, b) => b.count - a.count).forEach((cl) => {
      const item = document.createElement("div");
      item.className = "legend-item";
      item.dataset.cluster = cl.id;
      item.innerHTML =
        `<span class="legend-dot" style="background:${cl.color};color:${cl.color}"></span>` +
        `<span class="legend-label">${escapeHTML(titleize(cl.label))}</span>` +
        `<span class="legend-count">${cl.count}</span>`;
      item.addEventListener("mouseenter", () => { if (focusCluster < 0) { hoverCluster(cl.id); } });
      item.addEventListener("mouseleave", () => { if (focusCluster < 0) { hoverClusterOff(); } });
      item.addEventListener("click", () => {
        focusCluster = focusCluster === cl.id ? -1 : cl.id;
        selI = -1; tip.hidden = true; syncLegend(); requestDraw();
      });
      body.appendChild(item);
    });
  }
  function hoverCluster(id) { focusPreview = id; requestDraw(); }
  function hoverClusterOff() { focusPreview = -1; requestDraw(); }
  function syncLegend() {
    $("legendBody").querySelectorAll(".legend-item").forEach((el) => {
      const id = +el.dataset.cluster;
      el.classList.toggle("active", focusCluster === id);
      el.classList.toggle("dim", focusCluster >= 0 && focusCluster !== id);
    });
  }

  // ---------- theme ----------
  function toggleTheme() {
    const day = document.body.dataset.theme === "day";
    document.body.dataset.theme = day ? "night" : "day";
    $("themeToggle").textContent = day ? "☀" : "☾";
    try { localStorage.setItem("rm-theme", document.body.dataset.theme); } catch (e) {}
    requestDraw();
  }
  function restoreTheme() {
    try {
      const t = localStorage.getItem("rm-theme");
      if (t) { document.body.dataset.theme = t; }
    } catch (e) {}
    $("themeToggle").textContent = document.body.dataset.theme === "day" ? "☾" : "☀";
  }

  // ---------- utils ----------
  function titleize(s) {
    return String(s || "").split(" · ").map((w) =>
      w.replace(/\b([a-z])/g, (m, c) => c.toUpperCase())).join(" · ");
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
})();
