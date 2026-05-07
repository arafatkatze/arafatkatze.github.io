/* eslint-disable */
// ─────────────────────────────────────────────────────────────────────────────
// Stories from my night sky.
//
// Reads people + constellations from the JSON island in nightsky.md, draws
// an SVG sky with ambient twinkling stars + named "people" stars, handles
// hover/focus/click → modal, and renders a card list as the no-JS / mobile
// fallback.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VB_W = 1000;
  const VB_H = 600;
  const AMBIENT_COUNT = 170;
  const AMBIENT_MIN_DIST_FROM_NAMED = 38; // SVG units
  const NAMED_PROXIMITY_WARN = 60;        // SVG units

  // ── Tiny seeded PRNG (mulberry32) ─────────────────────────────────────────
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────
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
    if (children) {
      children.forEach(function (c) { if (c) node.appendChild(c); });
    }
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

  // ── Boot ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    const dataEl = document.getElementById("nightsky-data");
    if (!dataEl) return;

    let raw;
    try { raw = JSON.parse(dataEl.textContent); }
    catch (err) { console.warn("[nightsky] could not parse data island", err); return; }

    const people = Array.isArray(raw.people) ? raw.people : [];
    const constellations = Array.isArray(raw.constellations) ? raw.constellations : [];
    if (!people.length) return;

    const stage    = document.getElementById("nightsky-stage");
    const svg      = document.getElementById("nightsky-svg");
    const tooltip  = document.getElementById("nightsky-tooltip");
    const resetBtn = document.getElementById("nightsky-reset");
    const listGrid = document.getElementById("nightsky-list-grid");
    const modal    = document.getElementById("nightsky-modal");
    const modalCard = document.getElementById("nightsky-modal-card");
    if (!stage || !svg) return;

    // Resolve each person's SVG-space center once.
    const enriched = people.map(function (p) {
      const x = clamp(toNum(p.x, 50), 0, 100);
      const y = clamp(toNum(p.y, 50), 0, 100);
      return Object.assign({}, p, {
        cx: x * (VB_W / 100),
        cy: y * (VB_H / 100),
        magnitude: clamp(toNum(p.magnitude, 0.8), 0.3, 1.2),
        color: p.color || "#fff5d6",
      });
    });

    // Friendly warning for overlapping placements.
    for (let i = 0; i < enriched.length; i++) {
      for (let j = i + 1; j < enriched.length; j++) {
        const dx = enriched[i].cx - enriched[j].cx;
        const dy = enriched[i].cy - enriched[j].cy;
        if (Math.hypot(dx, dy) < NAMED_PROXIMITY_WARN) {
          console.warn(
            "[nightsky] Stars '" + enriched[i].id + "' and '" + enriched[j].id +
            "' are very close — consider spacing them apart in _data/nightsky.yml"
          );
        }
      }
    }

    // Layer groups — order matters (later = on top).
    const defs           = svgEl("defs");
    const ambientGroup   = svgEl("g", { class: "ns-ambient-layer" });
    const constellationG = svgEl("g", { class: "ns-constellation-layer" });
    const namedGroup     = svgEl("g", { class: "ns-named-layer" });

    svg.appendChild(defs);
    svg.appendChild(ambientGroup);
    svg.appendChild(constellationG);
    svg.appendChild(namedGroup);

    // ── Per-star radial gradients ─────────────────────────────────────────
    enriched.forEach(function (p) {
      const grad = svgEl("radialGradient", {
        id: "ns-glow-" + safeId(p.id),
        cx: "50%", cy: "50%", r: "50%",
      });
      grad.appendChild(svgEl("stop", { offset: "0%",   "stop-color": "#ffffff", "stop-opacity": "0.9" }));
      grad.appendChild(svgEl("stop", { offset: "35%",  "stop-color": p.color,    "stop-opacity": "0.5" }));
      grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": p.color,    "stop-opacity": "0" }));
      defs.appendChild(grad);
    });

    // ── Render ambient stars (seeded for stability) ───────────────────────
    let seed = 1138;
    function renderAmbient() {
      while (ambientGroup.firstChild) ambientGroup.removeChild(ambientGroup.firstChild);
      const rand = mulberry32(seed);
      for (let i = 0; i < AMBIENT_COUNT; i++) {
        const cx = rand() * VB_W;
        const cy = rand() * VB_H;

        // Skip if too close to a named star.
        let tooClose = false;
        for (let j = 0; j < enriched.length; j++) {
          if (Math.hypot(cx - enriched[j].cx, cy - enriched[j].cy) < AMBIENT_MIN_DIST_FROM_NAMED) {
            tooClose = true; break;
          }
        }
        if (tooClose) continue;

        const r = 0.4 + rand() * 1.4;
        const op = 0.3 + rand() * 0.65;
        const dur = 2.8 + rand() * 4.5;
        const delay = -rand() * dur;

        const c = svgEl("circle", {
          class: "ns-ambient",
          cx: cx.toFixed(2),
          cy: cy.toFixed(2),
          r: r.toFixed(2),
        });
        c.style.setProperty("--ns-op", op.toFixed(2));
        c.style.opacity = op.toFixed(2);
        c.style.animationDuration = dur.toFixed(2) + "s";
        c.style.animationDelay    = delay.toFixed(2) + "s";
        ambientGroup.appendChild(c);
      }
    }
    renderAmbient();

    // ── Constellations (faint polylines through named stars) ──────────────
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

    // ── Named stars ───────────────────────────────────────────────────────
    enriched.forEach(function (p) {
      const haloR = 16 + p.magnitude * 14;
      const coreR = 1.8 + p.magnitude * 2.6;

      const g = svgEl("g", { class: "ns-named", "data-id": p.id });

      const halo = svgEl("circle", {
        class: "ns-halo",
        cx: p.cx, cy: p.cy, r: haloR,
        fill: "url(#ns-glow-" + safeId(p.id) + ")",
      });
      const core = svgEl("circle", {
        class: "ns-core",
        cx: p.cx, cy: p.cy, r: coreR,
      });

      // Label position: flip side based on x.
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
        cx: p.cx, cy: p.cy, r: 24,
        tabindex: "0",
        role: "button",
        "aria-label": "Read story of " + (p.name || p.id),
      });

      g.appendChild(halo);
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

    // ── Tooltip ───────────────────────────────────────────────────────────
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

      // Position tooltip relative to the stage in CSS pixels.
      const stageRect = stage.getBoundingClientRect();
      const sx = (p.cx / VB_W) * stageRect.width;
      const sy = (p.cy / VB_H) * stageRect.height;

      // Set visible first so we can measure its size.
      tooltip.setAttribute("data-visible", "true");
      tooltip.setAttribute("aria-hidden", "false");
      const ttRect = tooltip.getBoundingClientRect();
      const ttW = ttRect.width;
      const ttH = ttRect.height;

      const margin = 12;
      // Prefer tooltip above the star; fall back to below if not enough room.
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

    // ── Modal ─────────────────────────────────────────────────────────────
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
        const linkEl = el("a", { class: "ns-modal-link", href: p.link, text: "more about " + (p.name || p.id) });
        modalCard.appendChild(linkEl);
      }

      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      // Focus management.
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

    // ── Card list (no-JS-friendly fallback / mobile alt) ──────────────────
    if (listGrid) {
      enriched.forEach(function (p) {
        const li = el("li");
        const btn = el("button", {
          class: "ns-card",
          type: "button",
          "aria-label": "Read story of " + (p.name || p.id),
        });
        btn.appendChild(el("p", { class: "ns-card-name", text: p.name || p.id }));
        if (p.role) btn.appendChild(el("p", { class: "ns-card-role", text: p.role }));
        if (p.since) btn.appendChild(el("p", { class: "ns-card-meta", text: "since " + p.since }));
        btn.appendChild(el("span", { class: "ns-card-cta", text: "read story" }));
        btn.addEventListener("click", function () { openModal(p); });
        li.appendChild(btn);
        listGrid.appendChild(li);
      });
    }

    // ── Reset reshuffles ambient layer (named stars stay put) ─────────────
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        seed = (seed + 0x9E3779B1) >>> 0;
        renderAmbient();
      });
    }

    // Hide tooltip on scroll/resize (positions would otherwise drift).
    window.addEventListener("scroll", hideTooltip, { passive: true });
    window.addEventListener("resize", hideTooltip);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
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
