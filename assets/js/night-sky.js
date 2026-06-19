/* eslint-disable */
// ─────────────────────────────────────────────────────────────────────────────
// Stories from my night sky.
//
// Reads people + (optional) constellations from the JSON island in
// nightsky.md. Paints a layered sky:
//   • faint dust stars        (tier 1)
//   • mid-bright field stars  (tier 2)
//   • bright field stars      (tier 3, with halos and spikes)
//   • Density biased along a diagonal "Milky Way" band.
//   • Occasional shooting stars.
//   • The named "people" stars on top, with bigger halos, diffraction
//     spikes, and bloom.
// Hover/focus shows a tooltip; click/Enter opens a modal with the full
// story. ESC, ✕, and overlay click close the modal.
//
// The board is full-bleed and can be any shape. Rather than a fixed
// viewBox we measure the stage's pixel size and set the viewBox to match
// it 1:1 — so circles stay round, stars spread to the full width, and
// nothing letterboxes whatever the aspect ratio. On resize we re-measure
// and rebuild.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  // Sky dimensions, measured from the stage at runtime (see measure()).
  // Defaults are only used until the first measurement.
  let VB_W = 1600;
  let VB_H = 640;

  // Star counts scale with the sky's area so a wide full-bleed board stays
  // dense and a small mobile board doesn't get noisy. Tuned per ~960k px².
  function tierCounts() {
    const area = VB_W * VB_H;
    const scale = area / (1600 * 640);
    return {
      t1: Math.round(640 * scale), // dust
      t2: Math.round(150 * scale), // field
      t3: Math.max(10, Math.round(28 * scale)), // bright field with spikes
    };
  }

  const AMBIENT_MIN_DIST_FROM_NAMED = 26;
  const NAMED_PROXIMITY_WARN = 60;

  // Star color palette (mostly cool white, with a few yellow + blue accents).
  const COLOR_COOL  = "#eef2ff";
  const COLOR_WARM  = "#fff1d2";
  const COLOR_BLUE  = "#bdd0ff";
  const COLOR_AMBER = "#ffd9a8";

  // ── Tiny seeded PRNG ──────────────────────────────────────────────────
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── DOM helpers ───────────────────────────────────────────────────────
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
      }
    }
    if (children) children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function initials(name) {
    if (!name) return "·";
    const parts = name.trim().split(/\s+/);
    return ((parts[0] || "")[0] || "").toUpperCase()
      + ((parts[1] || "")[0] || "").toUpperCase();
  }

  function paragraphs(story) {
    if (!story) return [];
    return String(story).trim().split(/\n\s*\n/).map(function (p) { return p.trim(); });
  }

  // Distance from point (px, py) to the diagonal Milky-Way band line.
  // Band line goes from (0, 0.78*H) → (W, 0.22*H) (115° feel).
  function bandDistance(px, py) {
    const x1 = 0,    y1 = VB_H * 0.78;
    const x2 = VB_W, y2 = VB_H * 0.22;
    const dx = x2 - x1, dy = y2 - y1;
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const tx = x1 + dx * t, ty = y1 + dy * t;
    return Math.hypot(px - tx, py - ty);
  }

  // Probability multiplier so dust + field stars cluster around the band.
  function bandWeight(px, py, halfWidth) {
    const d = bandDistance(px, py);
    if (d > halfWidth) return 0.35; // sparse outside band
    return 1 - (d / halfWidth) * 0.5;
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    const dataEl = document.getElementById("nightsky-data");
    if (!dataEl) return;

    let raw;
    try { raw = JSON.parse(dataEl.textContent); }
    catch (err) { console.warn("[nightsky] could not parse data island", err); return; }

    const people = Array.isArray(raw.people) ? raw.people : [];
    const constellations = Array.isArray(raw.constellations) ? raw.constellations : [];
    const showConstellations = !!raw.show_constellations;
    if (!people.length) return;

    const stage     = document.getElementById("nightsky-stage");
    const svg       = document.getElementById("nightsky-svg");
    const tooltip   = document.getElementById("nightsky-tooltip");
    const resetBtn  = document.getElementById("nightsky-reset");
    const modal     = document.getElementById("nightsky-modal");
    const modalCard = document.getElementById("nightsky-modal-card");
    if (!stage || !svg) return;

    let seed = 1138;
    let enriched = [];
    let scatter = null; // [{fx, fy}] organic blue-noise positions, computed once

    // Layer groups (recreated by buildSky, kept here so renderAmbient /
    // shooting stars can reach the current ones after a rebuild).
    let defs, ambientT1, ambientT2, ambientT3, constellationG, shootingG, namedGroup;

    // ── Measure the stage and lock the viewBox to its pixel size 1:1 ─────
    function measure() {
      const rect = stage.getBoundingClientRect();
      VB_W = Math.max(320, Math.round(rect.width));
      VB_H = Math.max(320, Math.round(rect.height));
      svg.setAttribute("viewBox", "0 0 " + VB_W + " " + VB_H);
    }

    // ── Organic, non-grid placement (blue-noise / Poisson-disk) ─────────
    // The named stars must NOT read as a grid and should hide among the
    // ambient field. We reject candidates that land too close to an
    // already-placed star, which yields an even-but-irregular scatter.
    // Computed once (fixed seed) and stored as fractions so the layout is
    // stable across resizes and unaffected by the reshuffle button.
    function computeScatter() {
      const rand = mulberry32(0x5EED5);
      const n = people.length;
      const margX = 0.045, margY = 0.09;
      const usableW = VB_W * (1 - 2 * margX);
      const usableH = VB_H * (1 - 2 * margY);
      let minD = 0.46 * Math.sqrt((usableW * usableH) / n);
      const pts = [];
      let guard = 0;
      while (pts.length < n && guard < n * 600) {
        guard++;
        if (guard % (n * 30) === 0) minD *= 0.9; // relax if it can't all fit
        const cx = VB_W * margX + rand() * usableW;
        const cy = VB_H * margY + rand() * usableH;
        let ok = true;
        for (let k = 0; k < pts.length; k++) {
          if (Math.hypot(cx - pts[k][0], cy - pts[k][1]) < minD) { ok = false; break; }
        }
        if (ok) pts.push([cx, cy]);
      }
      scatter = pts.map(function (p) { return { fx: p[0] / VB_W, fy: p[1] / VB_H }; });
    }

    // ── Resolve each person's SVG-space center for the current size ──────
    function computeEnriched() {
      if (!scatter) computeScatter();
      enriched = people.map(function (p, i) {
        const pos = scatter[i] || { fx: 0.5, fy: 0.5 };
        return Object.assign({}, p, {
          cx: pos.fx * VB_W,
          cy: pos.fy * VB_H,
          magnitude: clamp(toNum(p.magnitude, 0.85), 0.3, 1.2),
          color: p.color || COLOR_WARM,
        });
      });
    }

    function farFromNamed(cx, cy) {
      for (let j = 0; j < enriched.length; j++) {
        if (Math.hypot(cx - enriched[j].cx, cy - enriched[j].cy) < AMBIENT_MIN_DIST_FROM_NAMED) {
          return false;
        }
      }
      return true;
    }

    function pickColor(rand) {
      const r = rand();
      if (r < 0.78) return COLOR_COOL;
      if (r < 0.90) return COLOR_WARM;
      if (r < 0.97) return COLOR_BLUE;
      return COLOR_AMBER;
    }

    // ── Render ambient stars (seeded; reshuffled by the reset button) ───
    function renderAmbient() {
      if (!ambientT1) return;
      [ambientT1, ambientT2, ambientT3].forEach(function (layer) {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
      });

      const counts = tierCounts();
      const rand = mulberry32(seed);

      // ── Tier 1: dust (band-biased, plain dots) ────────────────────────
      const T1_BAND_HALF = Math.max(180, VB_H * 0.36);
      let placed = 0, attempts = 0;
      while (placed < counts.t1 && attempts < counts.t1 * 4) {
        attempts++;
        const cx = rand() * VB_W;
        const cy = rand() * VB_H;
        if (rand() > bandWeight(cx, cy, T1_BAND_HALF)) continue;
        if (!farFromNamed(cx, cy)) continue;
        const r = 0.25 + rand() * 0.55;
        const op = 0.18 + rand() * 0.5;
        const dur = 3.5 + rand() * 5.5;
        const delay = -rand() * dur;
        const c = svgEl("circle", {
          class: "ns-ambient",
          cx: cx.toFixed(2), cy: cy.toFixed(2), r: r.toFixed(2),
          fill: pickColor(rand),
        });
        c.style.setProperty("--ns-op", op.toFixed(2));
        c.style.opacity = op.toFixed(2);
        c.style.animationDuration = dur.toFixed(2) + "s";
        c.style.animationDelay    = delay.toFixed(2) + "s";
        ambientT1.appendChild(c);
        placed++;
      }

      // ── Tier 2: field stars (mid brightness, slight twinkle) ──────────
      const T2_BAND_HALF = Math.max(210, VB_H * 0.42);
      placed = 0; attempts = 0;
      while (placed < counts.t2 && attempts < counts.t2 * 4) {
        attempts++;
        const cx = rand() * VB_W;
        const cy = rand() * VB_H;
        if (rand() > bandWeight(cx, cy, T2_BAND_HALF) * 1.05) continue;
        if (!farFromNamed(cx, cy)) continue;
        const r = 0.7 + rand() * 0.9;
        const op = 0.55 + rand() * 0.4;
        const dur = 3 + rand() * 5;
        const delay = -rand() * dur;
        const c = svgEl("circle", {
          class: "ns-ambient",
          cx: cx.toFixed(2), cy: cy.toFixed(2), r: r.toFixed(2),
          fill: pickColor(rand),
        });
        c.style.setProperty("--ns-op", op.toFixed(2));
        c.style.opacity = op.toFixed(2);
        c.style.animationDuration = dur.toFixed(2) + "s";
        c.style.animationDelay    = delay.toFixed(2) + "s";
        ambientT2.appendChild(c);
        placed++;
      }

      // ── Tier 3: bright field stars (halo + diffraction spike) ─────────
      placed = 0; attempts = 0;
      const placedT3 = [];
      while (placed < counts.t3 && attempts < counts.t3 * 8) {
        attempts++;
        const cx = rand() * VB_W;
        const cy = rand() * VB_H;
        if (!farFromNamed(cx, cy)) continue;
        // Avoid clustering bright field stars.
        let tooClose = false;
        for (let i = 0; i < placedT3.length; i++) {
          if (Math.hypot(cx - placedT3[i][0], cy - placedT3[i][1]) < 70) { tooClose = true; break; }
        }
        if (tooClose) continue;
        placedT3.push([cx, cy]);

        const r = 1.2 + rand() * 1.0;
        const haloR = 8 + rand() * 6;
        const spikeLen = 14 + rand() * 12;
        const op = 0.85 + rand() * 0.15;
        const fill = pickColor(rand);

        const g = svgEl("g", {
          class: "ns-field-bright",
          transform: "translate(" + cx.toFixed(2) + "," + cy.toFixed(2) + ")",
        });
        // Halo
        g.appendChild(svgEl("circle", {
          class: "ns-field-halo",
          cx: 0, cy: 0, r: haloR.toFixed(2),
          fill: "url(#ns-field-glow)",
          opacity: (0.4 + rand() * 0.4).toFixed(2),
        }));
        // Diffraction spikes
        const sg = svgEl("g", { class: "ns-spike" });
        sg.appendChild(svgEl("line", {
          class: "ns-spike-line",
          x1: -spikeLen.toFixed(1), y1: 0, x2: spikeLen.toFixed(1), y2: 0,
          stroke: "url(#ns-spike-h)", "stroke-width": "0.6",
        }));
        sg.appendChild(svgEl("line", {
          class: "ns-spike-line",
          x1: 0, y1: -spikeLen.toFixed(1), x2: 0, y2: spikeLen.toFixed(1),
          stroke: "url(#ns-spike-v)", "stroke-width": "0.6",
        }));
        sg.style.opacity = (0.55 + rand() * 0.35).toFixed(2);
        g.appendChild(sg);
        // Core
        g.appendChild(svgEl("circle", {
          cx: 0, cy: 0, r: r.toFixed(2), fill: fill,
        }));
        g.style.opacity = op.toFixed(2);
        ambientT3.appendChild(g);
        placed++;
      }
    }

    // ── (Re)build the whole sky for the current size ────────────────────
    function buildSky() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      defs           = svgEl("defs");
      ambientT1      = svgEl("g", { class: "ns-ambient-layer ns-tier-1" });
      ambientT2      = svgEl("g", { class: "ns-ambient-layer ns-tier-2" });
      ambientT3      = svgEl("g", { class: "ns-ambient-layer ns-tier-3" });
      constellationG = svgEl("g", { class: "ns-constellation-layer" });
      shootingG      = svgEl("g", { class: "ns-shooting-layer" });
      namedGroup     = svgEl("g", { class: "ns-named-layer" });

      svg.appendChild(defs);
      svg.appendChild(ambientT1);
      svg.appendChild(ambientT2);
      svg.appendChild(ambientT3);
      svg.appendChild(constellationG);
      svg.appendChild(shootingG);
      svg.appendChild(namedGroup);

      // ── Reusable defs ─────────────────────────────────────────────────
      // Named-star bloom filter
      {
        const f = svgEl("filter", { id: "ns-bloom", x: "-50%", y: "-50%", width: "200%", height: "200%" });
        f.appendChild(svgEl("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "2.6", result: "blur" }));
        const merge = svgEl("feMerge");
        merge.appendChild(svgEl("feMergeNode", { in: "blur" }));
        merge.appendChild(svgEl("feMergeNode", { in: "SourceGraphic" }));
        f.appendChild(merge);
        defs.appendChild(f);
      }

      // Generic horizontal & vertical spike gradients (white → transparent ends)
      function spikeGrad(id, x1, y1, x2, y2) {
        const g = svgEl("linearGradient", { id: id, x1: x1, y1: y1, x2: x2, y2: y2, gradientUnits: "objectBoundingBox" });
        g.appendChild(svgEl("stop", { offset: "0%",   "stop-color": "#ffffff", "stop-opacity": "0"   }));
        g.appendChild(svgEl("stop", { offset: "50%",  "stop-color": "#ffffff", "stop-opacity": "0.95"}));
        g.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#ffffff", "stop-opacity": "0"   }));
        return g;
      }
      defs.appendChild(spikeGrad("ns-spike-h", "0%", "50%", "100%", "50%"));
      defs.appendChild(spikeGrad("ns-spike-v", "50%", "0%", "50%", "100%"));

      // Generic small-star halo gradient (white → transparent)
      {
        const g = svgEl("radialGradient", { id: "ns-field-glow", cx: "50%", cy: "50%", r: "50%" });
        g.appendChild(svgEl("stop", { offset: "0%",   "stop-color": "#ffffff", "stop-opacity": "0.85" }));
        g.appendChild(svgEl("stop", { offset: "60%",  "stop-color": "#ffffff", "stop-opacity": "0.18" }));
        g.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#ffffff", "stop-opacity": "0"    }));
        defs.appendChild(g);
      }

      // Per-named-star tinted halos
      enriched.forEach(function (p) {
        const grad = svgEl("radialGradient", {
          id: "ns-glow-" + safeId(p.id),
          cx: "50%", cy: "50%", r: "50%",
        });
        grad.appendChild(svgEl("stop", { offset: "0%",   "stop-color": "#ffffff", "stop-opacity": "0.95" }));
        grad.appendChild(svgEl("stop", { offset: "30%",  "stop-color": p.color,    "stop-opacity": "0.55" }));
        grad.appendChild(svgEl("stop", { offset: "70%",  "stop-color": p.color,    "stop-opacity": "0.18" }));
        grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": p.color,    "stop-opacity": "0" }));
        defs.appendChild(grad);
      });

      renderAmbient();

      // ── Constellations (only if explicitly opted in) ─────────────────
      if (showConstellations) {
        const byId = {};
        enriched.forEach(function (p) { byId[p.id] = p; });
        constellations.forEach(function (group) {
          if (!Array.isArray(group) || group.length < 2) return;
          const pts = [];
          for (let i = 0; i < group.length; i++) {
            const p = byId[group[i]];
            if (p) pts.push(p.cx.toFixed(1) + "," + p.cy.toFixed(1));
          }
          if (pts.length < 2) return;
          constellationG.appendChild(svgEl("polyline", {
            class: "ns-constellation",
            points: pts.join(" "),
          }));
        });
      }

      // ── Named stars ───────────────────────────────────────────────────
      // At rest they render as modest points of light (small core, the big
      // tinted halo shrunk down by CSS) so they blend into the field. The
      // halo blooms, spikes extend and the label appears only on hover.
      const namedRand = mulberry32(0x1357);
      enriched.forEach(function (p) {
        const haloR  = 22 + p.magnitude * 18;
        const coreR  = 1.5 + p.magnitude * 1.6;
        const spikeLen = 32 + p.magnitude * 22;

        const g = svgEl("g", { class: "ns-named", "data-id": p.id });

        const halo = svgEl("circle", {
          class: "ns-halo",
          cx: p.cx, cy: p.cy, r: haloR,
          fill: "url(#ns-glow-" + safeId(p.id) + ")",
          filter: "url(#ns-bloom)",
        });

        const spike = svgEl("g", { class: "ns-spike",
          transform: "translate(" + p.cx + "," + p.cy + ")" });
        spike.appendChild(svgEl("line", {
          class: "ns-spike-line",
          x1: -spikeLen.toFixed(1), y1: 0, x2: spikeLen.toFixed(1), y2: 0,
          stroke: "url(#ns-spike-h)", "stroke-width": "0.9",
        }));
        spike.appendChild(svgEl("line", {
          class: "ns-spike-line",
          x1: 0, y1: -spikeLen.toFixed(1), x2: 0, y2: spikeLen.toFixed(1),
          stroke: "url(#ns-spike-v)", "stroke-width": "0.9",
        }));

        const core = svgEl("circle", {
          class: "ns-core",
          cx: p.cx, cy: p.cy, r: coreR,
        });
        // Vary each star's twinkle so they don't pulse in unison.
        const tdur = 4 + namedRand() * 4;
        core.style.animationDuration = tdur.toFixed(2) + "s";
        core.style.animationDelay    = (-namedRand() * tdur).toFixed(2) + "s";

        const labelOnLeft = p.cx > VB_W * 0.62;
        const label = svgEl("text", {
          class: "ns-label",
          x: p.cx + (labelOnLeft ? -(haloR + 8) : (haloR + 8)),
          y: p.cy + 4,
          "text-anchor": labelOnLeft ? "end" : "start",
        });
        label.textContent = p.name || p.id;

        const hit = svgEl("circle", {
          class: "ns-hit",
          cx: p.cx, cy: p.cy, r: 26,
          tabindex: "0",
          role: "button",
          "aria-label": "Read story of " + (p.name || p.id),
        });

        g.appendChild(halo);
        g.appendChild(spike);
        g.appendChild(core);
        g.appendChild(label);
        g.appendChild(hit);
        namedGroup.appendChild(g);

        function activate() {
          document.querySelectorAll(".ns-named.is-active").forEach(function (n) {
            if (n !== g) n.classList.remove("is-active");
          });
          g.classList.add("is-active");
          stage.classList.add("ns-stage-hover");
          showTooltip(p);
        }
        function deactivate() {
          g.classList.remove("is-active");
          stage.classList.remove("ns-stage-hover");
          hideTooltip();
        }

        hit.addEventListener("mouseenter", activate);
        hit.addEventListener("mouseleave", deactivate);
        hit.addEventListener("focus", activate);
        hit.addEventListener("blur",  deactivate);
        hit.addEventListener("click", function () { openModal(p); });
        hit.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal(p);
          }
        });
      });
    }

    // ── Shooting stars ─────────────────────────────────────────────────
    let shootingTimer = null;
    function scheduleShootingStar() {
      const delay = 7000 + Math.random() * 14000; // 7–21s
      shootingTimer = setTimeout(function () {
        spawnShootingStar();
        scheduleShootingStar();
      }, delay);
    }

    function spawnShootingStar() {
      if (!shootingG) return;
      // Bias the streaks roughly along the milky-way direction (115° feel),
      // so they feel like they belong to the scene.
      const angle = (-25 + (Math.random() * 50)) * (Math.PI / 180); // ~ -25° to +25° from horizontal
      const len = 90 + Math.random() * 70;

      // Random start point on the upper-left half of the sky.
      const startX = Math.random() * VB_W * 0.65;
      const startY = Math.random() * VB_H * 0.55;
      const endX = startX + Math.cos(angle) * len;
      const endY = startY + Math.sin(angle) * len + (len * 0.35); // slight downward slope

      const line = svgEl("line", {
        class: "ns-shooting",
        x1: startX.toFixed(1), y1: startY.toFixed(1),
        x2: startX.toFixed(1), y2: startY.toFixed(1),
      });
      const layer = shootingG;
      layer.appendChild(line);

      const start = performance.now();
      const dur = 800 + Math.random() * 400; // ms

      function step(now) {
        const t = Math.min(1, (now - start) / dur);
        // Ease out
        const ease = 1 - Math.pow(1 - t, 3);
        const cx = startX + (endX - startX) * ease;
        const cy = startY + (endY - startY) * ease;
        const tailLen = 30 + 50 * Math.min(1, ease * 1.3);
        const tx = cx - Math.cos(angle) * tailLen;
        const ty = cy - Math.sin(angle) * tailLen - (tailLen * 0.35);
        line.setAttribute("x1", tx.toFixed(1));
        line.setAttribute("y1", ty.toFixed(1));
        line.setAttribute("x2", cx.toFixed(1));
        line.setAttribute("y2", cy.toFixed(1));
        // Fade in then out
        const alpha = t < 0.2 ? (t / 0.2) : (1 - (t - 0.2) / 0.8);
        line.setAttribute("stroke", "rgba(255,255,255," + Math.max(0, alpha).toFixed(2) + ")");
        if (t < 1) {
          requestAnimationFrame(step);
        } else if (line.parentNode) {
          line.parentNode.removeChild(line);
        }
      }
      requestAnimationFrame(step);
    }

    // ── Tooltip ────────────────────────────────────────────────────────
    function showTooltip(p) {
      if (!tooltip) return;

      tooltip.innerHTML = "";
      const head = el("div", { class: "ns-tt-row" });
      head.appendChild(avatar(p, "ns-tt-avatar", "ns-tt-avatar-placeholder"));
      const heading = el("div");
      heading.appendChild(el("p", { class: "ns-tt-name", text: p.name || p.id }));
      const metaBits = [];
      if (p.since) metaBits.push("since " + p.since);
      if (metaBits.length) heading.appendChild(el("p", { class: "ns-tt-meta", text: metaBits.join(" · ") }));
      head.appendChild(heading);
      tooltip.appendChild(head);

      if (p.role) tooltip.appendChild(el("p", { class: "ns-tt-role", text: p.role }));
      if (p.story) {
        const firstPara = paragraphs(p.story)[0] || "";
        tooltip.appendChild(el("p", { class: "ns-tt-story", text: firstPara }));
      }
      tooltip.appendChild(el("p", { class: "ns-tt-hint", text: "click to read more" }));

      // Use getScreenCTM so we get the *real* screen position of the star
      // even when the SVG is letterboxed inside a non-matching stage
      // aspect-ratio (which happens on mobile / tablet sizes).
      const stageRect = stage.getBoundingClientRect();
      const ctm = svg.getScreenCTM();
      let sx, sy;
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = p.cx;
        pt.y = p.cy;
        const s = pt.matrixTransform(ctm);
        sx = s.x - stageRect.left;
        sy = s.y - stageRect.top;
      } else {
        sx = (p.cx / VB_W) * stageRect.width;
        sy = (p.cy / VB_H) * stageRect.height;
      }

      tooltip.setAttribute("data-visible", "true");
      tooltip.setAttribute("aria-hidden", "false");
      const ttRect = tooltip.getBoundingClientRect();
      const ttW = ttRect.width;
      const ttH = ttRect.height;

      const margin = 12;
      let top = sy - ttH - 18;
      if (top < margin) top = sy + 22;
      let left = sx - ttW / 2;
      if (left < margin) left = margin;
      if (left + ttW > stageRect.width - margin) left = stageRect.width - ttW - margin;

      tooltip.style.transform = "none";
      tooltip.style.left = left.toFixed(1) + "px";
      tooltip.style.top  = top.toFixed(1)  + "px";
    }

    function hideTooltip() {
      if (!tooltip) return;
      tooltip.removeAttribute("data-visible");
      tooltip.setAttribute("aria-hidden", "true");
    }

    // ── Modal ──────────────────────────────────────────────────────────
    let lastFocused = null;

    function openModal(p) {
      if (!modal || !modalCard) return;
      lastFocused = document.activeElement;

      modalCard.innerHTML = "";

      const closeBtn = el("button", {
        class: "ns-modal-close",
        type: "button",
        "aria-label": "Close",
        text: "✕",
      });
      closeBtn.addEventListener("click", closeModal);
      modalCard.appendChild(closeBtn);

      const head = el("div", { class: "ns-modal-head" });
      head.appendChild(avatar(p, "ns-modal-avatar", "ns-modal-avatar-placeholder"));
      const heading = el("div");
      heading.appendChild(el("h2", {
        class: "ns-modal-name",
        id: "nightsky-modal-title",
        text: p.name || p.id,
      }));
      if (p.role)  heading.appendChild(el("p", { class: "ns-modal-role", text: p.role }));
      const metaBits = [];
      if (p.star_meaning) metaBits.push(p.star_meaning);
      if (p.since) metaBits.push("since " + p.since);
      if (metaBits.length) heading.appendChild(el("p", { class: "ns-modal-meta", text: metaBits.join(" · ") }));
      head.appendChild(heading);
      modalCard.appendChild(head);

      const story = el("div", { class: "ns-modal-story" });
      paragraphs(p.story).forEach(function (text) {
        story.appendChild(el("p", { text: text }));
      });
      modalCard.appendChild(story);

      if (p.link) {
        const linkEl = el("a", {
          class: "ns-modal-link",
          href: p.link,
          text: "more about " + (p.name || p.id),
        });
        modalCard.appendChild(linkEl);
      }

      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      setTimeout(function () { modalCard.focus(); }, 30);
    }

    function closeModal() {
      if (!modal) return;
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    if (modal) {
      modal.querySelectorAll("[data-nightsky-close]").forEach(function (n) {
        n.addEventListener("click", closeModal);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") closeModal();
      });
    }

    // ── Reset reshuffles ambient layer (named stars stay put) ──────────
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        seed = (seed + 0x9E3779B1) >>> 0;
        renderAmbient();
      });
    }

    // ── First paint ─────────────────────────────────────────────────────
    measure();
    computeEnriched();
    buildSky();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scheduleShootingStar();
    }

    // ── Resize: re-measure and rebuild only when the size really changed ─
    let resizeTimer = null;
    window.addEventListener("resize", function () {
      hideTooltip();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        const prevW = VB_W, prevH = VB_H;
        measure();
        if (Math.abs(VB_W - prevW) > 2 || Math.abs(VB_H - prevH) > 2) {
          computeEnriched();
          buildSky();
        }
      }, 180);
    });

    window.addEventListener("scroll", hideTooltip, { passive: true });
  });

  // ── Helpers ─────────────────────────────────────────────────────────
  function avatar(p, imgClass, phClass) {
    if (p.image) {
      const img = document.createElement("img");
      img.className = imgClass;
      img.alt = p.name || p.id || "";
      img.loading = "lazy";
      img.src = p.image;
      return img;
    }
    const ph = document.createElement("div");
    ph.className = phClass;
    ph.textContent = initials(p.name || p.id);
    return ph;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function toNum(n, fallback) {
    const v = Number(n);
    return Number.isFinite(v) ? v : fallback;
  }
  function safeId(id) { return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "_"); }
})();
