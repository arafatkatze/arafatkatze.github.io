/**
 * scroll-to-fly replica engine (original code).
 *
 * The whole page is one flat "wafer". Sections are pinned to it at fixed
 * world positions + rotations. A camera of four numbers — cx, cy (where it
 * looks), w (how wide it sees), r (roll) — is the only thing that moves;
 * every frame we write ONE transform onto #world.
 *
 * Scrolling scrubs an arc-length s along a precomputed path of legs.
 * Each leg between stops is walked in phases: LIFT (zoom out until both
 * stops fit), TWIST (roll to the next stop's bearing), GLIDE (pan across
 * the wafer), DIVE (zoom back in). That phase grammar — not a circle —
 * is what gives fab2.com's tour its "flying somewhere" feel.
 *
 * Pinch / ctrl+wheel / +/- buttons leave the tour into a free view;
 * scrubbing again (or tapping a stop) flies you back to the nearest stop.
 */
(function () {
  "use strict";

  var worldEl = document.getElementById("world");
  if (!worldEl) return;

  var frames = Array.prototype.slice.call(worldEl.querySelectorAll(".frame"));
  var stopEls = Array.prototype.slice.call(worldEl.querySelectorAll(".stop"));
  var navEl = document.getElementById("stopnav");
  var dotsEl = document.getElementById("dots");
  var hintEl = document.getElementById("flyhint");
  var hintTouchEl = document.getElementById("flyhint-touch");

  /* ------------------------------------------------------------ tuning */

  var ZOOM_RHO = 2.4;   // perceptual distance per e-fold of view width
  var PAN_GAIN = 2.6;   // stretches the glide so it reads, not teleports
  var TWIST_W = 0.8;    // s-length of a 90 degree twist
  var FIT_PAD = 1.12;   // landing view = stop rect * this much air
  var W_MIN = 220;      // closest the camera may dive
  var W_MAX = 14000;    // farthest it may lift (whole wafer + air)
  var SCRUB_WHEEL = 0.0030; // s per wheel px
  var SCRUB_TOUCH = 0.0060; // s per swipe px
  var LIFT_OFF = 0.10;      // leg fraction after which the magnet carries you on
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------- utilities */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function easeInOut(p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); }
  function shortAngle(d) { return ((d + 180) % 360 + 360) % 360 - 180; }

  /* ----------------------------------------------------- place frames */

  var vpW = innerWidth;
  var vpH = innerHeight;
  var isPortrait = false;

  function frameSize(el) {
    // portrait screens use the frame's data-m-w/h variant when it has one,
    // so a stop still fills the view instead of shrinking to a sliver
    if (isPortrait && el.dataset.mW) {
      return { w: parseFloat(el.dataset.mW), h: parseFloat(el.dataset.mH) };
    }
    return { w: parseFloat(el.dataset.w), h: parseFloat(el.dataset.h) };
  }

  function placeFrames() {
    frames.forEach(function (el) {
      var sz = frameSize(el);
      var x = parseFloat(el.dataset.x);
      var y = parseFloat(el.dataset.y);
      var rot = parseFloat(el.dataset.rot || 0);
      el.style.width = sz.w + "px";
      el.style.height = sz.h + "px";
      el.style.transform =
        "translate(" + x + "px," + y + "px) rotate(" + rot + "deg) " +
        "translate(" + (-sz.w / 2) + "px," + (-sz.h / 2) + "px)";
    });
  }

  /* ------------------------------------------------------------- stops */

  var stops = stopEls.map(function (el) {
    return {
      el: el,
      id: el.dataset.stop,
      label: el.dataset.label || el.dataset.stop,
      cx: parseFloat(el.dataset.x),
      cy: parseFloat(el.dataset.y),
      fw: 0,
      fh: 0,
      r: parseFloat(el.dataset.rot || 0),
      w: 0 // landing view width, set by measure()
    };
  });

  function measure() {
    vpW = innerWidth;
    vpH = innerHeight;
    isPortrait = vpW / vpH < 0.8;
    document.body.classList.toggle("m", isPortrait);
    placeFrames();
    stops.forEach(function (s) {
      var sz = frameSize(s.el);
      s.fw = sz.w;
      s.fh = sz.h;
      // view width so the stop's rect fits the viewport with FIT_PAD air
      s.w = clamp(
        Math.max(s.fw * FIT_PAD, s.fh * FIT_PAD * (vpW / vpH)),
        W_MIN, W_MAX
      );
    });
  }

  /* --------------------------------------------- a leg between 2 views */

  function makeLeg(a, b) {
    var dx = b.cx - a.cx;
    var dy = b.cy - a.cy;
    var d = Math.hypot(dx, dy);
    var dr = shortAngle((b.r || 0) - (a.r || 0));
    // lift until both endpoints comfortably fit under the camera
    var peak = clamp(Math.max(a.w, b.w, d * 1.15) * 1.25, a.w, W_MAX);

    var lnUp = Math.log(peak / a.w);        // >= 0
    var lnDn = Math.log(b.w / peak);        // <= 0

    var phases = [];
    function add(len, fn) {
      if (len > 1e-6) phases.push({ S: len, s0: 0, fn: fn });
    }

    /* 1 LIFT  */ add(lnUp / ZOOM_RHO, function (f) {
      return { cx: a.cx, cy: a.cy, w: a.w * Math.exp(lnUp * f), r: a.r };
    });
    /* 2 TWIST */ add(Math.abs(dr) / 90 * TWIST_W, function (f) {
      return { cx: a.cx, cy: a.cy, w: peak, r: a.r + dr * f };
    });
    /* 3 GLIDE */ add(d / peak * PAN_GAIN, function (f) {
      return { cx: a.cx + dx * f, cy: a.cy + dy * f, w: peak, r: a.r + dr };
    });
    /* 4 DIVE  */ add(-lnDn / ZOOM_RHO, function (f) {
      return { cx: b.cx, cy: b.cy, w: peak * Math.exp(lnDn * f), r: b.r };
    });

    var acc = 0;
    phases.forEach(function (p) { p.s0 = acc; acc += p.S; });
    var S = Math.max(acc, 1e-6);

    return {
      S: S,
      eval: function (s) {
        if (s <= 0) return { cx: a.cx, cy: a.cy, w: a.w, r: a.r };
        if (s >= S) return { cx: b.cx, cy: b.cy, w: b.w, r: b.r };
        var ph = phases[phases.length - 1];
        for (var i = 0; i < phases.length; i++) {
          if (s < phases[i].s0 + phases[i].S) { ph = phases[i]; break; }
        }
        return ph.fn(easeInOut(clamp01((s - ph.s0) / ph.S)));
      }
    };
  }

  /* ------------------------------------------------------ the tour path */

  var legs = [];
  var cum = [];     // s position of each stop along the tour
  var S_TOTAL = 0;

  function rebuildPath() {
    legs = [];
    cum = [0];
    for (var i = 0; i < stops.length - 1; i++) {
      var leg = makeLeg(stops[i], stops[i + 1]);
      legs.push(leg);
      cum.push(cum[i] + leg.S);
    }
    S_TOTAL = cum[cum.length - 1];
  }

  function evalPath(s) {
    s = clamp(s, 0, S_TOTAL);
    for (var i = 0; i < legs.length; i++) {
      if (s <= cum[i + 1] || i === legs.length - 1) {
        return legs[i].eval(s - cum[i]);
      }
    }
    return { cx: stops[0].cx, cy: stops[0].cy, w: stops[0].w, r: stops[0].r };
  }

  function nearestStopS(s) {
    var best = 0;
    for (var i = 1; i < cum.length; i++) {
      if (Math.abs(cum[i] - s) < Math.abs(cum[best] - s)) best = i;
    }
    return best;
  }

  function magnetStop() {
    // which leg is sTarget on, and how far into it?
    var i = 0;
    while (i < legs.length - 1 && sTarget > cum[i + 1]) i++;
    var p = (sTarget - cum[i]) / legs[i].S;
    if (scrubDir > 0) return p > LIFT_OFF ? i + 1 : i;
    if (scrubDir < 0) return p < 1 - LIFT_OFF ? i : i + 1;
    return nearestStopS(sTarget);
  }

  function nearestStopWorld(c) {
    var best = 0;
    var bd = Infinity;
    for (var i = 0; i < stops.length; i++) {
      var d = Math.hypot(stops[i].cx - c.cx, stops[i].cy - c.cy);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /* ------------------------------------------------------------- state */

  // mode: "tour" (camera on the path) | "fly" (animated leg) | "free"
  var mode = "tour";
  var s = 0;             // current arc position (tour)
  var sTarget = 0;
  var cam = null;        // current camera (always kept up to date)
  var freeCam = null;    // camera while in free mode
  var flight = null;     // { leg, t0, dur, toStop } while mode === "fly"
  var lastScrub = 0;
  var scrubDir = 0;      // +1 flying forward, -1 backward
  var interacted = false;

  /* ------------------------------------------------------------ render */

  function render(c) {
    cam = c;
    var scale = vpW / c.w;
    worldEl.style.transform =
      "translate(" + (vpW / 2) + "px," + (vpH / 2) + "px) " +
      "rotate(" + (-c.r).toFixed(4) + "deg) " +
      "scale(" + scale.toFixed(6) + ") " +
      "translate(" + (-c.cx).toFixed(3) + "px," + (-c.cy).toFixed(3) + "px)";
  }

  function screenToWorld(px, py) {
    var scale = vpW / cam.w;
    var dx = (px - vpW / 2) / scale;
    var dy = (py - vpH / 2) / scale;
    var rad = cam.r * Math.PI / 180;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    return {
      x: cam.cx + dx * cos - dy * sin,
      y: cam.cy + dx * sin + dy * cos
    };
  }

  /* ------------------------------------------------------------ flying */

  function flyToStop(k) {
    k = clamp(k, 0, stops.length - 1);
    var to = { cx: stops[k].cx, cy: stops[k].cy, w: stops[k].w, r: stops[k].r };
    var from = { cx: cam.cx, cy: cam.cy, w: cam.w, r: cam.r };
    if (Math.abs(from.cx - to.cx) < 1 && Math.abs(from.cy - to.cy) < 1 &&
        Math.abs(Math.log(from.w / to.w)) < 0.01) {
      arrive(k);
      return;
    }
    var leg = makeLeg(from, to);
    flight = {
      leg: leg,
      t0: performance.now(),
      dur: reducedMotion ? 0 : clamp(leg.S * 520, 700, 2600),
      toStop: k
    };
    mode = "fly";
  }

  function arrive(k) {
    mode = "tour";
    flight = null;
    freeCam = null;
    s = sTarget = cum[k];
    render(evalPath(s));
    markStop(k);
  }

  /* --------------------------------------------------------- main loop */

  var rafId = null;

  function frame(now) {
    rafId = requestAnimationFrame(frame);

    if (mode === "fly" && flight) {
      var t = flight.dur ? clamp01((now - flight.t0) / flight.dur) : 1;
      render(flight.leg.eval(flight.leg.S * t));
      if (t >= 1) arrive(flight.toStop);
      return;
    }

    if (mode === "free" && freeCam) {
      render(freeCam);
      return;
    }

    // tour: chase the scrub target, then magnet onto a stop. The magnet is
    // DIRECTIONAL: once you have lifted off a stop, it carries you on to
    // the next one instead of snapping back — one wheel burst, one leg.
    if (now - lastScrub > 260) {
      var k = magnetStop();
      sTarget += (cum[k] - sTarget) * 0.075;
      if (Math.abs(cum[k] - sTarget) < 0.002) { sTarget = cum[k]; scrubDir = 0; }
    }
    s += (sTarget - s) * (reducedMotion ? 1 : 0.11);
    render(evalPath(s));
    markStop(nearestStopS(s));
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (rafId === null) {
      rafId = requestAnimationFrame(frame);
    }
  });

  /* --------------------------------------------------------------- hud */

  var navBtns = [];
  var dotEls = [];
  var hereIdx = -1;

  stops.forEach(function (st, i) {
    if (navEl) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = st.label;
      b.setAttribute("data-ui", "");
      b.addEventListener("click", function () { touch(); flyToStop(i); });
      navEl.appendChild(b);
      navBtns.push(b);
    }
    if (dotsEl) {
      var d = document.createElement("i");
      dotsEl.appendChild(d);
      dotEls.push(d);
    }
  });

  function markStop(k) {
    if (k === hereIdx) return;
    hereIdx = k;
    navBtns.forEach(function (b, i) { b.classList.toggle("is-here", i === k); });
    dotEls.forEach(function (d, i) { d.classList.toggle("is-here", i === k); });
  }

  function touch() {
    lastScrub = performance.now();
    if (!interacted) {
      interacted = true;
      setTimeout(function () {
        if (hintEl) hintEl.classList.add("is-faded");
        if (hintTouchEl) hintTouchEl.classList.add("is-faded");
      }, 2600);
    }
  }

  /* -------------------------------------------------------- scrubbing */

  function scrub(ds) {
    touch();
    if (mode === "fly") return;
    if (mode === "free") {
      // leave the free view: fly home to the nearest stop, tour resumes
      flyToStop(nearestStopWorld(freeCam));
      return;
    }
    if (ds) scrubDir = ds > 0 ? 1 : -1;
    sTarget = clamp(sTarget + ds, 0, S_TOTAL);
  }

  /* ------------------------------------------------------- free zoom */

  function enterFree() {
    if (mode === "fly") return false;
    if (mode !== "free") {
      freeCam = { cx: cam.cx, cy: cam.cy, w: cam.w, r: cam.r };
      mode = "free";
    }
    return true;
  }

  function freeZoomAt(px, py, factor) {
    if (!enterFree()) return;
    touch();
    var before = screenToWorld(px, py);
    freeCam.w = clamp(freeCam.w / factor, W_MIN, W_MAX);
    render(freeCam);
    var after = screenToWorld(px, py);
    freeCam.cx += before.x - after.x;
    freeCam.cy += before.y - after.y;
  }

  var zoomInBtn = document.getElementById("zoom-in");
  var zoomOutBtn = document.getElementById("zoom-out");
  if (zoomInBtn) zoomInBtn.addEventListener("click", function () {
    freeZoomAt(vpW / 2, vpH / 2, 1.45);
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () {
    freeZoomAt(vpW / 2, vpH / 2, 1 / 1.45);
  });

  /* ------------------------------------------------------------ wheel */

  document.addEventListener("wheel", function (e) {
    if (e.target.closest("[data-ui]")) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      freeZoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0024));
    } else {
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      scrub(d * SCRUB_WHEEL);
    }
  }, { passive: false });

  /* ---------------------------------------------------------- pointers */

  var pointers = [];
  var pinch0 = 0;
  var pinchW0 = 0;
  var moved = 0;

  function findPtr(id) {
    for (var i = 0; i < pointers.length; i++) {
      if (pointers[i].id === id) return i;
    }
    return -1;
  }

  document.addEventListener("pointerdown", function (e) {
    if (e.target.closest("[data-ui], [data-fly], button, a")) return;
    touch();
    pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    moved = 0;
    document.body.classList.add("is-dragging");
    if (pointers.length === 2) {
      pinch0 = pinchDist();
      pinchW0 = (mode === "free" && freeCam ? freeCam.w : cam.w);
    }
  });

  document.addEventListener("pointermove", function (e) {
    var idx = findPtr(e.pointerId);
    if (idx === -1) return;
    var dx = e.clientX - pointers[idx].x;
    var dy = e.clientY - pointers[idx].y;
    pointers[idx].x = e.clientX;
    pointers[idx].y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);

    if (pointers.length === 2) {
      var dNow = pinchDist();
      if (pinch0 > 0 && dNow > 0) {
        var mid = pinchMid();
        if (!enterFree()) return;
        touch();
        var before = screenToWorld(mid.x, mid.y);
        freeCam.w = clamp(pinchW0 * (pinch0 / dNow), W_MIN, W_MAX);
        render(freeCam);
        var after = screenToWorld(mid.x, mid.y);
        freeCam.cx += before.x - after.x;
        freeCam.cy += before.y - after.y;
      }
      return;
    }
    if (pointers.length !== 1) return;

    if (mode === "free" && freeCam) {
      // free view: one finger pans the wafer
      touch();
      var scale = vpW / freeCam.w;
      var rad = freeCam.r * Math.PI / 180;
      var cos = Math.cos(rad);
      var sin = Math.sin(rad);
      freeCam.cx -= (dx * cos - dy * sin) / scale;
      freeCam.cy -= (dx * sin + dy * cos) / scale;
    } else {
      // tour: dragging scrubs the flight, dominant axis wins
      var d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      scrub(-d * SCRUB_TOUCH);
    }
  });

  function releasePtr(e) {
    var idx = findPtr(e.pointerId);
    if (idx !== -1) pointers.splice(idx, 1);
    if (pointers.length === 0) document.body.classList.remove("is-dragging");
    if (pointers.length === 1) pinch0 = 0;
  }

  document.addEventListener("pointerup", releasePtr);
  document.addEventListener("pointercancel", releasePtr);

  function pinchDist() {
    var dx = pointers[0].x - pointers[1].x;
    var dy = pointers[0].y - pointers[1].y;
    return Math.hypot(dx, dy);
  }

  function pinchMid() {
    return {
      x: (pointers[0].x + pointers[1].x) / 2,
      y: (pointers[0].y + pointers[1].y) / 2
    };
  }

  /* --------------------------------------------------------- keyboard */

  document.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
      case "PageDown":
        touch();
        if (mode === "tour") flyToStop(nearestStopS(sTarget) + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
      case "PageUp":
        touch();
        if (mode === "tour") flyToStop(nearestStopS(sTarget) - 1);
        break;
      case "+":
      case "=":
        freeZoomAt(vpW / 2, vpH / 2, 1.45);
        break;
      case "-":
      case "_":
        freeZoomAt(vpW / 2, vpH / 2, 1 / 1.45);
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  /* ------------------------------------------------- fly-to-x buttons */

  document.querySelectorAll("[data-fly]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-fly");
      for (var i = 0; i < stops.length; i++) {
        if (stops[i].id === id) { touch(); flyToStop(i); return; }
      }
    });
  });

  /* ------------------------------------------------------------ resize */

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var k = hereIdx >= 0 ? hereIdx : 0;
      measure();
      rebuildPath();
      if (mode === "tour") {
        s = sTarget = cum[nearestStopS(s)];
        render(evalPath(s));
      } else if (mode === "free" && freeCam) {
        render(freeCam);
      } else {
        arrive(k);
      }
    }, 120);
  });

  /* -------------------------------------------------------------- boot */

  measure();
  rebuildPath();

  // opening shot: hang over the whole wafer, then dive into home
  cam = { cx: 5000, cy: 5100, w: Math.min(11000, W_MAX), r: 0 };
  render(cam);
  markStop(0);
  rafId = requestAnimationFrame(frame);
  setTimeout(function () { flyToStop(0); }, reducedMotion ? 0 : 450);
})();
