(function () {
  'use strict';

  // ──────────────────────────────────────────
  // Seeded 2D Perlin noise
  // ──────────────────────────────────────────

  function Noise(seed) {
    this.p = new Uint8Array(512);
    var perm = [];
    for (var i = 0; i < 256; i++) perm[i] = i;
    var s = seed | 0;
    for (var i = 255; i > 0; i--) {
      s = ((s * 1103515245) + 12345) & 0x7fffffff;
      var j = s % (i + 1);
      var tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
    }
    for (var i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }

  Noise.prototype.noise2D = function (x, y) {
    var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    var v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    var p = this.p;
    var aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1];
    var ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
    function g(hash, hx, hy) {
      var h = hash & 3;
      return ((h & 1) ? -hx : hx) + ((h & 2) ? -hy : hy);
    }
    function mix(t, a, b) { return a + t * (b - a); }
    return mix(v,
      mix(u, g(aa, xf, yf), g(ba, xf - 1, yf)),
      mix(u, g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1))
    );
  };

  // ──────────────────────────────────────────
  // Theme helpers
  // ──────────────────────────────────────────

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function canvasBg() {
    return isDark() ? '#0b0e17' : '#eaeaf1';
  }

  function canvasBgRgba(alpha) {
    return isDark()
      ? 'rgba(11,14,23,' + alpha + ')'
      : 'rgba(234,234,241,' + alpha + ')';
  }

  function gridColor() {
    return isDark()
      ? 'rgba(255,255,255,0.018)'
      : 'rgba(0,0,0,0.03)';
  }

  function hintColor() {
    return isDark()
      ? 'rgba(148,163,184,0.25)'
      : 'rgba(0,0,0,0.22)';
  }

  // ──────────────────────────────────────────
  // Shared helpers
  // ──────────────────────────────────────────

  var palettes = [
    ['#06b6d4', '#22d3ee', '#a78bfa', '#c4b5fd', '#67e8f9'],
    ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7'],
    ['#34d399', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'],
    ['#ec4899', '#f43f5e', '#f59e0b', '#06b6d4', '#a855f7'],
    ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f0abfc']
  ];
  var paletteIdx = Math.floor(Math.random() * palettes.length);

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  // ──────────────────────────────────────────
  // 01 — Flow Field Generator
  // ──────────────────────────────────────────

  var flowAnim = null;

  function initFlowField() {
    var canvas = document.getElementById('pg-flow-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentElement;

    function resize() {
      canvas.width = wrap.clientWidth;
      canvas.height = Math.max(320, Math.min(480, wrap.clientWidth * 0.48));
    }

    function generate() {
      if (flowAnim) cancelAnimationFrame(flowAnim);
      resize();

      var w = canvas.width, h = canvas.height;
      var bg = canvasBg();
      var trailAlpha = isDark() ? 0.012 : 0.018;
      var noise = new Noise(Date.now());
      var palette = palettes[paletteIdx];
      paletteIdx = (paletteIdx + 1) % palettes.length;

      var scale = 0.002 + Math.random() * 0.005;
      var zOff = Math.random() * 1000;
      var count = Math.min(1400, Math.floor(w * h / 250));

      var px = new Float32Array(count);
      var py = new Float32Array(count);
      var pSpeed = new Float32Array(count);
      var pLife = new Int16Array(count);
      var pMax = new Int16Array(count);
      var pR = new Uint8Array(count);
      var pG = new Uint8Array(count);
      var pB = new Uint8Array(count);

      for (var i = 0; i < count; i++) {
        px[i] = Math.random() * w;
        py[i] = Math.random() * h;
        pSpeed[i] = 0.3 + Math.random() * 1.4;
        pLife[i] = 0;
        pMax[i] = 80 + Math.floor(Math.random() * 220);
        var c = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
        pR[i] = c.r; pG[i] = c.g; pB[i] = c.b;
      }

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      var frame = 0, maxFrames = 380;

      function step() {
        if (frame >= maxFrames) { flowAnim = null; return; }

        ctx.fillStyle = canvasBgRgba(trailAlpha);
        ctx.fillRect(0, 0, w, h);

        for (var i = 0; i < count; i++) {
          var angle = noise.noise2D(px[i] * scale + zOff, py[i] * scale + zOff) * Math.PI * 4;
          px[i] += Math.cos(angle) * pSpeed[i];
          py[i] += Math.sin(angle) * pSpeed[i];
          pLife[i]++;

          if (px[i] < -10) px[i] = w + 10;
          if (px[i] > w + 10) px[i] = -10;
          if (py[i] < -10) py[i] = h + 10;
          if (py[i] > h + 10) py[i] = -10;

          if (pLife[i] > pMax[i]) {
            px[i] = Math.random() * w;
            py[i] = Math.random() * h;
            pLife[i] = 0;
          }

          var a = Math.min(pLife[i] / 15, 1) * Math.min((pMax[i] - pLife[i]) / 30, 1) * 0.65;
          ctx.fillStyle = 'rgba(' + pR[i] + ',' + pG[i] + ',' + pB[i] + ',' + a + ')';
          ctx.fillRect(px[i], py[i], 1.5, 1.5);
        }

        frame++;
        flowAnim = requestAnimationFrame(step);
      }

      flowAnim = requestAnimationFrame(step);
    }

    generate();

    var btn = document.getElementById('pg-flow-regen');
    if (btn) btn.addEventListener('click', generate);

    var saveBtn = document.getElementById('pg-flow-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var link = document.createElement('a');
      link.download = 'flow-field-' + Date.now() + '.png';
      link.href = canvas.toDataURL();
      link.click();
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(generate, 400);
    });

    return { regenerate: generate };
  }

  // ──────────────────────────────────────────
  // 02 — Particle Garden
  // ──────────────────────────────────────────

  function initParticleGarden() {
    var canvas = document.getElementById('pg-particle-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentElement;

    function fitCanvas() {
      canvas.width = wrap.clientWidth;
      canvas.height = Math.max(280, Math.min(420, wrap.clientWidth * 0.42));
    }
    fitCanvas();

    var particles = [];
    var isDown = false;
    var mx = -1, my = -1;
    var gravity = 0.12;
    var friction = 0.992;
    var bounce = 0.55;
    var w = canvas.width, h = canvas.height;

    var colorSets = [
      ['#06b6d4', '#22d3ee', '#67e8f9'],
      ['#a78bfa', '#c4b5fd', '#e0e7ff'],
      ['#f59e0b', '#fbbf24', '#fde68a'],
      ['#ec4899', '#f472b6', '#fbcfe8'],
      ['#34d399', '#6ee7b7', '#a7f3d0']
    ];
    var csIdx = 0;

    function burst(x, y, n) {
      var colors = colorSets[csIdx];
      for (var i = 0; i < n; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 1.5 + Math.random() * 5;
        var c = colors[Math.floor(Math.random() * colors.length)];
        var rgb = hexToRgb(c);
        particles.push({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          life: 1,
          decay: 0.003 + Math.random() * 0.009,
          r: rgb.r, g: rgb.g, b: rgb.b,
          size: 2 + Math.random() * 5
        });
      }
      csIdx = (csIdx + 1) % colorSets.length;
    }

    function stream(x, y) {
      var colors = colorSets[csIdx % colorSets.length];
      for (var i = 0; i < 3; i++) {
        var angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        var speed = 1 + Math.random() * 3;
        var c = colors[Math.floor(Math.random() * colors.length)];
        var rgb = hexToRgb(c);
        particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.006 + Math.random() * 0.012,
          r: rgb.r, g: rgb.g, b: rgb.b,
          size: 1.5 + Math.random() * 3.5
        });
      }
    }

    function getPos(e) {
      var rect = canvas.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    canvas.addEventListener('mousedown', function (e) {
      isDown = true;
      var p = getPos(e);
      burst(p.x, p.y, 35);
    });
    canvas.addEventListener('mouseup', function () { isDown = false; });
    canvas.addEventListener('mouseleave', function () { isDown = false; mx = -1; });
    canvas.addEventListener('mousemove', function (e) {
      var p = getPos(e);
      mx = p.x; my = p.y;
      if (isDown) stream(mx, my);
    });
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      isDown = true;
      var p = getPos(e);
      burst(p.x, p.y, 35);
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var p = getPos(e);
      mx = p.x; my = p.y;
      if (isDown) stream(mx, my);
    }, { passive: false });
    canvas.addEventListener('touchend', function () { isDown = false; });

    function drawGrid() {
      ctx.strokeStyle = gridColor();
      ctx.lineWidth = 1;
      for (var x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (var y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    function drawHint() {
      if (particles.length > 0) return;
      ctx.fillStyle = hintColor();
      ctx.font = '13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('click or drag to plant particles', w / 2, h / 2);
      ctx.textAlign = 'start';
    }

    function clearCanvas() {
      ctx.fillStyle = canvasBg();
      ctx.fillRect(0, 0, w, h);
      drawGrid();
    }

    clearCanvas();
    drawHint();

    function animate() {
      ctx.fillStyle = canvasBgRgba(0.14);
      ctx.fillRect(0, 0, w, h);
      drawGrid();

      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.vy += gravity;
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.x < 0)  { p.x = 0; p.vx *= -bounce; }
        if (p.x > w)  { p.x = w; p.vx *= -bounce; }
        if (p.y > h)  { p.y = h; p.vy *= -bounce; }
        if (p.y < 0)  { p.y = 0; p.vy *= -bounce; }

        if (p.life <= 0) { particles.splice(i, 1); continue; }

        ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (p.life * 0.8) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      drawHint();
      requestAnimationFrame(animate);
    }

    animate();

    var clearBtn = document.getElementById('pg-particle-clear');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      particles.length = 0;
      csIdx = 0;
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        fitCanvas();
        w = canvas.width; h = canvas.height;
        particles.length = 0;
      }, 400);
    });

    return {
      reset: function () {
        particles.length = 0;
        csIdx = 0;
        fitCanvas();
        w = canvas.width; h = canvas.height;
        clearCanvas();
      }
    };
  }

  // ──────────────────────────────────────────
  // Boot + theme change listener
  // ──────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var flow = initFlowField();
    var garden = initParticleGarden();

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'data-theme') {
          if (flow) flow.regenerate();
          if (garden) garden.reset();
          break;
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
  });
})();
