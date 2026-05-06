/* /sketch/ — a shared freehand drawing canvas, persisted to pantry.cloud.
 * One stroke per "drag" — when you lift, it joins the shared sheet.
 * Colour rotates gently with the time of day.
 */
(function () {
  'use strict';

  var PANTRY_URL =
    'https://getpantry.cloud/apiv1/pantry/1fe0a904-31b9-467b-9667-7d46e6ab5773/basket/sketch';

  var MAX_STROKES        = 600;       // bounded basket
  var MAX_POINTS_PER_STK = 200;       // sample-cap a single stroke
  var POLL_MS            = 30 * 1000; // gentle background poll
  var SAVE_DEBOUNCE_MS   = 350;       // batch saves a tick
  var STORAGE_MINE       = 'sketch-mine';     // ids of strokes I've drawn
  var STORAGE_LAST       = 'sketch-last';     // last submit timestamp

  var canvas = document.getElementById('sketch-canvas');
  var ctx    = canvas.getContext('2d');
  var hint   = document.getElementById('sketch-hint');
  var meta   = document.getElementById('sketch-meta');
  var undoBtn = document.getElementById('sketch-undo');
  var downloadEl = document.getElementById('sketch-download');
  var afterEl = document.getElementById('sketch-after');
  if (!canvas || !ctx) return;

  var strokes = [];        // [{ id, color, width, pts: [[x,y],...] }, ...]
  var drawing = false;
  var current = null;      // in-progress stroke
  var saveTimer = null;
  var dirty = false;

  // ── Colour: rotate gently with the time of day ──
  function colorForNow() {
    var palette = [
      '#1a1a1f',  // ink
      '#c9485b',  // brand rose
      '#3a5d8a',  // cool dusk
      '#a86c2c',  // copper
      '#3d7857',  // mossy green
      '#7a4f8a',  // plum
      '#2c6a73'   // teal
    ];
    var hour = new Date().getHours();
    return palette[hour % palette.length];
  }

  function getMine() {
    try { return JSON.parse(localStorage.getItem(STORAGE_MINE) || '[]'); }
    catch (e) { return []; }
  }
  function rememberMine(id) {
    var mine = getMine();
    mine.push(id);
    if (mine.length > 100) mine = mine.slice(-100);
    try { localStorage.setItem(STORAGE_MINE, JSON.stringify(mine)); } catch (e) {}
    refreshUndoBtn();
  }
  function forgetMine(id) {
    var mine = getMine().filter(function (m) { return m !== id; });
    try { localStorage.setItem(STORAGE_MINE, JSON.stringify(mine)); } catch (e) {}
    refreshUndoBtn();
  }
  function refreshUndoBtn() {
    var mine = getMine();
    var present = mine.some(function (id) { return strokes.some(function (s) { return s.id === id; }); });
    undoBtn.disabled = !present;
  }

  // ── Drawing helpers ──
  function fitCanvas() {
    var ratio = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }

  function clear() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    // soft paper background
    ctx.fillStyle = '#fbf6ec';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  function drawStroke(s) {
    if (!s || !s.pts || s.pts.length === 0) return;
    var rect = canvas.getBoundingClientRect();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width || 2.5;
    ctx.beginPath();
    var first = s.pts[0];
    ctx.moveTo(first[0] * rect.width, first[1] * rect.height);
    for (var i = 1; i < s.pts.length; i++) {
      ctx.lineTo(s.pts[i][0] * rect.width, s.pts[i][1] * rect.height);
    }
    if (s.pts.length === 1) {
      // single-tap: draw a dot
      ctx.lineTo(first[0] * rect.width + 0.1, first[1] * rect.height + 0.1);
    }
    ctx.stroke();
  }

  function redraw() {
    clear();
    strokes.forEach(drawStroke);
  }

  // ── Pointer events (mouse + touch + pen via Pointer Events) ──
  function pointerPos(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width;
    var y = (e.clientY - rect.top)  / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    if (hint) hint.classList.add('sketch-stage__hint--hide');
    current = {
      id: 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      color: colorForNow(),
      width: e.pointerType === 'pen' ? 2.2 : 2.6,
      pts: [pointerPos(e)]
    };
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!drawing || !current) return;
    var p = pointerPos(e);
    var pts = current.pts;
    var last = pts[pts.length - 1];
    // skip near-duplicates
    var dx = (p[0] - last[0]) * canvas.width;
    var dy = (p[1] - last[1]) * canvas.height;
    if (dx * dx + dy * dy < 1.6) return;
    pts.push(p);
    if (pts.length > MAX_POINTS_PER_STK) {
      // sample down: keep every other point past the cap
      pts.splice(MAX_POINTS_PER_STK / 2, 1);
    }
    // incremental render — just the latest segment
    var rect = canvas.getBoundingClientRect();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = current.color;
    ctx.lineWidth = current.width;
    ctx.beginPath();
    ctx.moveTo(last[0] * rect.width, last[1] * rect.height);
    ctx.lineTo(p[0]    * rect.width, p[1]    * rect.height);
    ctx.stroke();
  });

  function endStroke(e) {
    if (!drawing || !current) return;
    drawing = false;
    var s = current;
    current = null;
    // discard meaningless taps unless it's a single dot
    if (s.pts.length < 2 && Math.random() < 0.5) {
      // 50% accept dots so people can place a single mark, 50% drop accidental taps
      // — actually just always accept a single tap; people meant to draw it.
    }
    strokes.push(s);
    rememberMine(s.id);
    bumpMeta();
    schedule();
  }

  canvas.addEventListener('pointerup',     endStroke);
  canvas.addEventListener('pointerleave',  endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  // Touch fallback: prevent scroll while drawing
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove',  function (e) { e.preventDefault(); }, { passive: false });

  // ── Persistence ──
  function bumpMeta() {
    if (meta) meta.textContent = strokes.length + (strokes.length === 1 ? ' stroke' : ' strokes') + ' on the sheet';
  }

  function schedule() {
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS);
  }

  function save() {
    if (!dirty) return;
    dirty = false;
    var bounded = strokes.slice(-MAX_STROKES);
    fetch(PANTRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strokes: bounded })
    }).then(function () {
      if (afterEl) afterEl.textContent = 'saved.';
    }).catch(function () {
      if (afterEl) afterEl.textContent = "couldn't save — your stroke is local for now";
    });
  }

  function load() {
    return fetch(PANTRY_URL, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && Array.isArray(data.strokes)) {
          strokes = data.strokes;
          redraw();
          bumpMeta();
          refreshUndoBtn();
        } else {
          strokes = [];
          bumpMeta();
        }
      })
      .catch(function () {
        if (meta) meta.textContent = "couldn't reach the sheet — your strokes will only be local";
      });
  }

  // Background poll so other people's strokes appear gently
  function poll() {
    // Don't clobber if we're in the middle of drawing or pending save
    if (drawing || dirty) return;
    fetch(PANTRY_URL, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && Array.isArray(data.strokes) && data.strokes.length !== strokes.length) {
          strokes = data.strokes;
          redraw();
          bumpMeta();
          refreshUndoBtn();
        }
      })
      .catch(function () {});
  }

  // ── Undo my last ──
  undoBtn.addEventListener('click', function () {
    var mine = getMine();
    for (var i = mine.length - 1; i >= 0; i--) {
      var id = mine[i];
      var idx = -1;
      for (var j = strokes.length - 1; j >= 0; j--) {
        if (strokes[j].id === id) { idx = j; break; }
      }
      if (idx !== -1) {
        strokes.splice(idx, 1);
        forgetMine(id);
        redraw();
        bumpMeta();
        schedule();
        return;
      }
    }
    forgetMine(mine[mine.length - 1]); // none of mine present, clean up
  });

  // ── Download as PNG ──
  downloadEl.addEventListener('click', function () {
    try {
      downloadEl.href = canvas.toDataURL('image/png');
    } catch (err) {
      // tainted canvas? nothing else to do
    }
  });

  // Init
  fitCanvas();
  load();
  setInterval(poll, POLL_MS);
  window.addEventListener('resize', fitCanvas);
})();
