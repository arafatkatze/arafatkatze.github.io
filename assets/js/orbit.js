/**
 * the orbit — a 3D circular project gallery.
 *
 * fab2.com-inspired interaction model:
 *   - the whole ring rotates continuously (drag / swipe / scroll to spin)
 *   - zoom in & out (pinch, ctrl+wheel / trackpad pinch, +/- buttons, keys)
 *   - works on phones: pointer events + dvh + transform-only animation
 *
 * Pure CSS 3D transforms, no WebGL — a single rAF loop writes three
 * transforms (camera dolly+tilt, ring spin, per-card shade).
 */
(function () {
  "use strict";

  var scene = document.getElementById("orbit-scene");
  var camera = document.getElementById("orbit-camera");
  var ring = document.getElementById("orbit-ring");
  var hint = document.getElementById("orbit-hint");
  var dock = document.getElementById("orbit-dock");
  var dockCat = document.getElementById("orbit-dock-cat");
  var dockTitle = document.getElementById("orbit-dock-title");
  var dockDesc = document.getElementById("orbit-dock-desc");
  var zoomInBtn = document.getElementById("orbit-zoom-in");
  var zoomOutBtn = document.getElementById("orbit-zoom-out");
  var starCanvas = document.getElementById("orbit-stars");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".orbit-card"));

  if (!scene || !ring || cards.length === 0) return;

  var N = cards.length;
  var STEP = 360 / N;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------- state */

  var spin = 0;            // ring rotation (deg)
  var spinVel = 0;         // deg / frame
  var spinTarget = null;   // snap-to-card target (deg) or null
  var radius = 480;        // px, computed from card width + count
  var zoom = 0;            // camera dolly (px)
  var zoomTarget = 0;
  var zoomMin = -1200;
  var zoomMax = 400;
  var dragTilt = 0;        // extra tilt from vertical drag (deg)
  var lastInteraction = performance.now();
  var frontIndex = -1;
  var interacted = false;

  var AUTO_SPEED = reducedMotion ? 0 : -0.028; // deg / frame, slow drift
  var IDLE_MS = 2600;

  /* ------------------------------------------------------------ layout */

  function layout() {
    var cardW = cards[0].offsetWidth || 250;
    // ring radius so neighbouring cards keep a comfortable gap
    radius = Math.max((cardW / 2) / Math.tan(Math.PI / N) * 1.28, cardW * 1.6);

    for (var i = 0; i < N; i++) {
      cards[i].style.transform =
        "rotateY(" + (i * STEP) + "deg) translateZ(" + radius + "px)";
    }

    var perspective = parseFloat(getComputedStyle(scene).perspective) || 1200;
    // far enough out to see the whole ring; close enough that the front
    // card reads ~2.6x its rest size without crossing the viewer plane
    zoomMin = -(radius * 2.35);
    zoomMax = Math.max(perspective - radius - perspective / 2.6, 0);

    if (zoomTarget === 0 && zoom === 0) {
      // opening shot: pulled back so the whole ring reads at once
      zoomTarget = -(radius * 0.85);
      zoom = zoomMin - radius * 0.4; // fly in from deep space on load
    }
    zoomTarget = clamp(zoomTarget, zoomMin, zoomMax);
    sizeStars();
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  /* --------------------------------------------------------- starfield */

  var starCtx = starCanvas ? starCanvas.getContext("2d") : null;
  var stars = [];
  var dpr = 1;

  function sizeStars() {
    if (!starCtx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    starCanvas.width = Math.round(innerWidth * dpr);
    starCanvas.height = Math.round(innerHeight * dpr);
    var count = Math.min(210, Math.round((innerWidth * innerHeight) / 7000));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.3,
        base: 0.25 + Math.random() * 0.5,
        amp: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0004 + Math.random() * 0.001,
        depth: 0.15 + Math.random() * 0.85 // parallax factor
      });
    }
  }

  function drawStars(now) {
    if (!starCtx) return;
    var w = starCanvas.width;
    var h = starCanvas.height;
    starCtx.clearRect(0, 0, w, h);
    // stars drift opposite the ring spin for cheap parallax
    var shift = (spin / 360) * 0.22;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = reducedMotion ? s.base : s.base + Math.sin(now * s.speed + s.phase) * s.amp;
      var x = mod(s.x + shift * s.depth, 1) * w;
      var y = s.y * h;
      starCtx.globalAlpha = a;
      starCtx.fillStyle = i % 9 === 0 ? "#ffd9a8" : "#dfe6ff";
      starCtx.beginPath();
      starCtx.arc(x, y, s.r * dpr, 0, Math.PI * 2);
      starCtx.fill();
    }
    starCtx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------- focusing */

  function angleFromFront(i) {
    // signed degrees between card i and the camera-facing direction
    var a = mod(spin + i * STEP, 360);
    return a > 180 ? a - 360 : a;
  }

  function updateFocus() {
    var best = 0;
    var bestAbs = 1e9;
    for (var i = 0; i < N; i++) {
      var abs = Math.abs(angleFromFront(i));
      if (abs < bestAbs) {
        bestAbs = abs;
        best = i;
      }
      var shade = Math.min(0.74, (abs / 180) * 1.05);
      cards[i].style.setProperty("--shade", shade.toFixed(3));
      // cards on the far hemisphere must not steal taps from the front card
      // (DOM hit-testing can pick them through the ring)
      cards[i].classList.toggle("is-away", abs > 90);
    }
    if (best !== frontIndex) {
      if (frontIndex >= 0) cards[frontIndex].classList.remove("is-front");
      cards[best].classList.add("is-front");
      frontIndex = best;
      swapDock(cards[best]);
    }
  }

  var dockSwapTimer = null;

  function swapDock(card) {
    if (!dock) return;
    dock.classList.add("is-swapping");
    clearTimeout(dockSwapTimer);
    dockSwapTimer = setTimeout(function () {
      dockCat.textContent = card.getAttribute("data-category") || "";
      dockTitle.textContent = card.getAttribute("data-title") || "";
      dockDesc.textContent = card.getAttribute("data-description") || "";
      dock.classList.remove("is-swapping");
    }, 130);
  }

  /* -------------------------------------------------------- main loop */

  var rafId = null;

  function frame(now) {
    rafId = requestAnimationFrame(frame);

    if (spinTarget !== null) {
      var d = spinTarget - spin;
      spin += d * 0.09;
      spinVel = 0;
      if (Math.abs(d) < 0.05) {
        spin = spinTarget;
        spinTarget = null;
      }
    } else {
      spin += spinVel;
      spinVel *= 0.94;
      if (Math.abs(spinVel) < 0.0005) spinVel = 0;
      // gentle auto-drift once the visitor has been idle for a moment
      if (now - lastInteraction > IDLE_MS && !pointers.length) {
        spinVel += (AUTO_SPEED - spinVel) * 0.02;
      }
    }

    zoom += (zoomTarget - zoom) * 0.085;
    dragTilt *= pointers.length ? 1 : 0.9; // spring back after release

    // pulled out = bird's-eye tilt, zoomed in = level with the ring
    var zoomFrac = (zoom - zoomMin) / (zoomMax - zoomMin); // 0 far … 1 near
    var tilt = (1 - zoomFrac) * 13 + dragTilt;

    camera.style.transform = "translateZ(" + zoom.toFixed(2) + "px) rotateX(" + tilt.toFixed(3) + "deg)";
    ring.style.transform = "rotateY(" + spin.toFixed(3) + "deg)";

    updateFocus();
    drawStars(now);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (rafId === null) {
      rafId = requestAnimationFrame(frame);
    }
  });

  /* ------------------------------------------------------ interaction */

  function touch() {
    lastInteraction = performance.now();
    if (!interacted) {
      interacted = true;
      setTimeout(function () {
        if (hint) hint.classList.add("is-faded");
      }, 3200);
    }
  }

  var pointers = [];       // active pointers for drag / pinch
  var pinchStartDist = 0;
  var pinchStartZoom = 0;
  var dragMoved = 0;       // px travelled since pointerdown (click vs drag)
  var lastX = 0;
  var lastY = 0;
  var lastMoveT = 0;
  var velSample = 0;
  var downCard = null;     // card under the finger at pointerdown

  function findPointer(id) {
    for (var i = 0; i < pointers.length; i++) {
      if (pointers[i].id === id) return i;
    }
    return -1;
  }

  scene.addEventListener("pointerdown", function (e) {
    touch();
    scene.setPointerCapture(e.pointerId);
    pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    if (pointers.length === 1) {
      downCard = e.target.closest ? e.target.closest(".orbit-card") : null;
      spinTarget = null;
      spinVel = 0;
      dragMoved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveT = performance.now();
      velSample = 0;
      scene.classList.add("is-dragging");
    } else if (pointers.length === 2) {
      pinchStartDist = pinchDist();
      pinchStartZoom = zoomTarget;
    }
  });

  scene.addEventListener("pointermove", function (e) {
    var idx = findPointer(e.pointerId);
    if (idx === -1) return;
    touch();
    pointers[idx].x = e.clientX;
    pointers[idx].y = e.clientY;

    if (pointers.length === 2) {
      var d = pinchDist();
      if (pinchStartDist > 0) {
        zoomTarget = clamp(pinchStartZoom + (d - pinchStartDist) * 2.4, zoomMin, zoomMax);
      }
      return;
    }
    if (pointers.length !== 1) return;

    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    dragMoved += Math.abs(dx) + Math.abs(dy);

    var degPerPx = 200 / Math.max(innerWidth, 480);
    spin += dx * degPerPx;
    dragTilt = clamp(dragTilt - dy * 0.04, -9, 9);

    var now = performance.now();
    var dt = Math.max(now - lastMoveT, 1);
    lastMoveT = now;
    velSample = velSample * 0.6 + (dx * degPerPx / dt) * 16.7 * 0.4;
  });

  function releasePointer(e) {
    var idx = findPointer(e.pointerId);
    if (idx !== -1) pointers.splice(idx, 1);
    if (pointers.length === 0) {
      scene.classList.remove("is-dragging");
      if (Math.abs(velSample) > 0.05 && dragMoved > 6) {
        spinVel = clamp(velSample, -7, 7); // fling inertia
      } else if (e.type === "pointerup" && dragMoved < 8 && downCard) {
        // a tap, not a drag: pointer capture retargets the native click to
        // the scene, so open / rotate-to-front is handled here instead
        tapCard(downCard);
      }
      downCard = null;
    } else if (pointers.length === 1) {
      // pinch ended with one finger down: restart the drag from it
      lastX = pointers[0].x;
      lastY = pointers[0].y;
      pinchStartDist = 0;
    }
  }

  scene.addEventListener("pointerup", releasePointer);
  scene.addEventListener("pointercancel", releasePointer);

  function pinchDist() {
    var dx = pointers[0].x - pointers[1].x;
    var dy = pointers[0].y - pointers[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // scroll to fly: wheel spins the ring; ctrl+wheel (trackpad pinch) zooms
  scene.addEventListener("wheel", function (e) {
    e.preventDefault();
    touch();
    if (e.ctrlKey || e.metaKey) {
      zoomTarget = clamp(zoomTarget - e.deltaY * 2.2, zoomMin, zoomMax);
    } else {
      spinTarget = null;
      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      spinVel = clamp(spinVel + delta * 0.006, -7, 7);
    }
  }, { passive: false });

  function zoomBy(amount) {
    touch();
    zoomTarget = clamp(zoomTarget + amount, zoomMin, zoomMax);
  }

  if (zoomInBtn) zoomInBtn.addEventListener("click", function () { zoomBy(radius * 0.45); });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { zoomBy(-radius * 0.45); });

  document.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowLeft":
        touch();
        spinTarget = Math.round(spin / STEP) * STEP + STEP;
        break;
      case "ArrowRight":
        touch();
        spinTarget = Math.round(spin / STEP) * STEP - STEP;
        break;
      case "+":
      case "=":
        zoomBy(radius * 0.35);
        break;
      case "-":
      case "_":
        zoomBy(-radius * 0.35);
        break;
      case "Enter":
        if (frontIndex >= 0 && document.activeElement === document.body) {
          tapCard(cards[frontIndex]);
        }
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  // card taps: a drag never navigates; a side card rotates to the front
  // first; only the focused front card opens its project
  function tapCard(card) {
    var i = cards.indexOf(card);
    if (i === -1) return;
    touch();
    if (i === frontIndex && Math.abs(angleFromFront(i)) < STEP * 0.45) {
      window.location.href = card.href;
    } else {
      // rotate the shortest way so card i lands at the front
      spinTarget = spin - angleFromFront(i);
    }
  }

  // native clicks are suppressed: pointer capture retargets them to the
  // scene inconsistently across browsers, so pointerup drives taps instead
  cards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      if (e.detail === 0) tapCard(card); // keyboard (Tab + Enter) activation
    });
  });

  /* ------------------------------------------------------------- boot */

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  layout();
  updateFocus();
  rafId = requestAnimationFrame(frame);
})();
