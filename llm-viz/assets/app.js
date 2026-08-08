/**
 * llm-viz application core.
 *
 * Owns the scene, the camera, the per-frame instance buffers, hit testing and
 * the HTML label overlay. The walkthrough and the chrome talk to the model
 * through the small API at the bottom of this file.
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});
  var M = LV.math;
  var FPB = 32; // floats per block instance
  var FPBEAM = 12;

  function App(opts) {
    this.canvas = opts.canvas;
    this.labelLayer = opts.labelLayer;
    this.renderer = new LV.Renderer(this.canvas);
    this.camera = new LV.Camera({ target: [0, -900, 0], yaw: 0.55, pitch: 0.28, dist: 2100 });
    this.camTarget = null; // pose we are gliding toward
    this.camBlend = 0;
    this.time = 0;
    this.hover = null;
    this.pinned = null;
    this.focus = null; // {ids: Set, strength}
    this.highlights = {};
    this.beamPulse = {};
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.quality = 1;
    this.labelEls = [];
    this.needsUpload = false;
    this.listeners = {};
    this.showLabels = true;
    this.autoSpin = false;
    this._bindInput();
  }

  App.prototype.on = function (name, fn) {
    (this.listeners[name] = this.listeners[name] || []).push(fn);
  };
  App.prototype.emit = function (name, arg) {
    (this.listeners[name] || []).forEach(function (f) {
      f(arg);
    });
  };

  // ------------------------------------------------------------- scene setup

  App.prototype.setScene = function (scene, cfgMeta) {
    this.scene = scene;
    this.cfgMeta = cfgMeta || {};
    LV.packValues(scene);
    this.renderer.uploadValues(scene.pool);
    this.blockData = new Float32Array(scene.blocks.length * FPB);
    this.beamData = new Float32Array(Math.max(1, scene.beams.length) * FPBEAM);
    scene.blocks.forEach(function (b) {
      b.dim = 0;
      b.dimTarget = 0;
      b.emph = 0;
      b.emphTarget = 0;
    });
    this.labelScale = Math.max(1, (scene.height || 2000) / 2200);
    this._buildLabels();
    this.emit("scene", scene);
  };

  /** Recompute values in place (after the prompt changes) without relayout. */
  App.prototype.refreshValues = function () {
    LV.packValues(this.scene);
    this.renderer.uploadValues(this.scene.pool);
  };

  // ---------------------------------------------------------------- labels

  App.prototype._buildLabels = function () {
    var layer = this.labelLayer;
    layer.innerHTML = "";
    this.labelEls = this.scene.labels.map(function (l) {
      var el = document.createElement("div");
      el.className = "lv-label " + (l.cls || "");
      el.textContent = l.text;
      layer.appendChild(el);
      return { el: el, def: l, vis: 0 };
    });
  };

  // how far away each tier of label stays legible, in world units
  var LABEL_RANGE = [7000, 1300, 330];

  App.prototype._updateLabels = function (vp, w, h) {
    var show = this.showLabels;
    var scale = this.labelScale || 1;
    for (var i = 0; i < this.labelEls.length; i++) {
      var L = this.labelEls[i];
      var p = M.projectPoint(vp, L.def.pos);
      if (!show || p[3] <= 0.001) {
        if (L.vis !== 0) {
          L.el.style.opacity = "0";
          L.vis = 0;
        }
        continue;
      }
      var x = ((p[0] / p[3]) * 0.5 + 0.5) * w;
      var y = (0.5 - (p[1] / p[3]) * 0.5) * h;
      var range = LABEL_RANGE[L.def.tier || 0] * scale;
      var a = M.clamp((range / p[3] - 1) * 1.4, 0, 1);
      if (a < 0.02) {
        if (L.vis !== 0) {
          L.el.style.opacity = "0";
          L.vis = 0;
        }
        continue;
      }
      L.el.style.transform = "translate(-50%,-50%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      L.el.style.opacity = a.toFixed(3);
      L.vis = a;
    }
  };

  // ---------------------------------------------------------------- camera

  /** Frame a set of blocks (or an explicit box) with an optional angle. */
  App.prototype.poseFor = function (ids, opts) {
    opts = opts || {};
    var min = [1e18, 1e18, 1e18],
      max = [-1e18, -1e18, -1e18];
    var found = false;
    var scene = this.scene;
    (ids || []).forEach(function (id) {
      var b = scene.byId[id];
      if (!b) return;
      found = true;
      for (var i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], b.pos[i]);
        max[i] = Math.max(max[i], b.pos[i] + b.size[i]);
      }
    });
    if (!found) {
      min = scene.min.slice();
      max = scene.max.slice();
    }
    var center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    var wide = Math.max(max[0] - min[0], max[2] - min[2]);
    var tall = max[1] - min[1];
    var aspect = this.canvas.width / Math.max(1, this.canvas.height);

    // Anything much taller than it is wide (the whole tower, a stack of
    // blocks) is framed by looking down its length instead of side on, so it
    // recedes into the distance rather than becoming a sliver.
    var longRun = (this.scene.height || 1) * 0.2;
    if (tall > wide * 2.5 && tall > longRun && !opts.flat) {
      var fitW = wide / (2 * Math.tan(this.camera.fov / 2)) / Math.min(1, aspect * 0.85);
      return {
        target: center,
        yaw: opts.yaw !== undefined ? opts.yaw : 0.55,
        pitch: opts.pitch !== undefined ? opts.pitch : 0.68,
        dist: Math.max(12, Math.max(fitW * 1.3, tall * 0.66) * (opts.pad || 1)),
      };
    }
    // slabs lie flat, so the default look is from above rather than edge on
    var span = Math.max(wide, tall * 1.15, max[2] - min[2]);
    var fit = span / (2 * Math.tan(this.camera.fov / 2)) / Math.min(1, aspect * 0.85);
    return {
      target: center,
      yaw: opts.yaw !== undefined ? opts.yaw : 0.42,
      pitch: opts.pitch !== undefined ? opts.pitch : 0.52,
      dist: Math.max(12, fit * (opts.pad || 1.35)),
    };
  };

  App.prototype.flyTo = function (pose, speed) {
    this.camTarget = pose;
    this.camSpeed = speed || 2.2;
  };

  App.prototype.frame = function (ids, opts) {
    this.flyTo(this.poseFor(ids, opts), opts && opts.speed);
  };

  // ----------------------------------------------------------------- input

  App.prototype._bindInput = function () {
    var self = this;
    var c = this.canvas;
    var dragging = null;
    var last = [0, 0];
    var moved = 0;

    function panScale() {
      return (self.camera.dist * 2 * Math.tan(self.camera.fov / 2)) / self.canvas.clientHeight;
    }

    c.addEventListener("pointerdown", function (e) {
      c.setPointerCapture(e.pointerId);
      dragging = e.shiftKey || e.button === 1 || e.button === 2 ? "pan" : "orbit";
      last = [e.clientX, e.clientY];
      moved = 0;
      self.camTarget = null;
      self.autoSpin = false;
      self.emit("interact");
    });
    c.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    c.addEventListener("pointermove", function (e) {
      var rect = c.getBoundingClientRect();
      self.pointer = [
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ];
      self.pointerPx = [e.clientX - rect.left, e.clientY - rect.top];
      if (!dragging) return;
      var dx = e.clientX - last[0],
        dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      moved += Math.abs(dx) + Math.abs(dy);
      if (dragging === "orbit") {
        self.camera.yaw -= dx * 0.005;
        self.camera.pitch = M.clamp(self.camera.pitch + dy * 0.005, -1.45, 1.45);
      } else {
        var cam = self.camera;
        var right = M.norm3(M.cross3([0, 1, 0], M.sub3(cam.eye, cam.target)));
        var up = M.norm3(M.cross3(M.sub3(cam.eye, cam.target), right));
        var s = panScale();
        cam.target = M.add3(cam.target, M.add3(M.scale3(right, -dx * s), M.scale3(up, dy * s)));
      }
    });
    function endDrag(e) {
      if (dragging && moved < 4) self.click();
      dragging = null;
    }
    c.addEventListener("pointerup", endDrag);
    c.addEventListener("pointercancel", function () {
      dragging = null;
    });
    c.addEventListener("pointerleave", function () {
      self.pointer = null;
    });
    c.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        self.camTarget = null;
        self.autoSpin = false;
        var delta = M.clamp(e.deltaY, -260, 260);
        // The model is one tall column, so a bare wheel travels down it the way
        // a page scrolls. Zooming stays on a modifier (and on pinch).
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
          self.camera.dist = M.clamp(self.camera.dist * Math.exp(delta * 0.0016), 3, 400000);
        } else {
          self.travel(delta * 2.4);
        }
        self.emit("interact");
      },
      { passive: false }
    );

    // touch: two fingers pinch to zoom, drag to pan
    var pinch = null;
    c.addEventListener(
      "touchmove",
      function (e) {
        if (e.touches.length !== 2) return;
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var d = Math.sqrt(dx * dx + dy * dy);
        var mid = [
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
        ];
        if (pinch) {
          self.camera.dist = M.clamp(self.camera.dist * (pinch.d / d), 3, 400000);
          var cam = self.camera;
          var right = M.norm3(M.cross3([0, 1, 0], M.sub3(cam.eye, cam.target)));
          var up = M.norm3(M.cross3(M.sub3(cam.eye, cam.target), right));
          var s = panScale();
          cam.target = M.add3(
            cam.target,
            M.add3(
              M.scale3(right, -(mid[0] - pinch.mid[0]) * s),
              M.scale3(up, (mid[1] - pinch.mid[1]) * s)
            )
          );
        }
        pinch = { d: d, mid: mid };
        self.camTarget = null;
      },
      { passive: false }
    );
    c.addEventListener("touchend", function () {
      pinch = null;
    });
  };

  /**
   * Travel up or down the model. `pixels` is in screen units, so a scroll
   * covers the same amount of tower whether you are zoomed in on one slab or
   * looking at the whole thing. Travel is bounded to the model plus a margin
   * so you cannot scroll off into empty space.
   */
  App.prototype.travel = function (pixels) {
    if (!this.scene) return;
    var worldPerPixel =
      (this.camera.dist * 2 * Math.tan(this.camera.fov / 2)) /
      Math.max(1, this.canvas.clientHeight);
    this.setDepthY(this.camera.target[1] - pixels * worldPerPixel);
  };

  /** Move the camera to an absolute height, clamped to the model's extent. */
  App.prototype.setDepthY = function (y) {
    var range = this.depthRange();
    this.camTarget = null;
    this.autoSpin = false;
    this.camera.target[1] = M.clamp(y, range.min, range.max);
  };

  App.prototype.depthRange = function () {
    var s = this.scene;
    // just enough overscroll to see the first and last slab clear of the edge
    var margin = Math.max(10, (s.max[1] - s.min[1]) * 0.02);
    return { min: s.min[1] - margin, max: s.max[1] + margin };
  };

  /** Where the camera currently sits along the model: 0 at the top, 1 at the bottom. */
  App.prototype.depthFraction = function () {
    var range = this.depthRange();
    var span = range.max - range.min;
    if (span < 1e-6) return 0;
    return M.clamp((range.max - this.camera.target[1]) / span, 0, 1);
  };

  App.prototype.click = function () {
    if (this.hover) {
      this.pinned = this.pinned && this.pinned.block.id === this.hover.block.id ? null : this.hover;
    } else {
      this.pinned = null;
    }
    this.emit("pick", this.pinned);
  };

  // ------------------------------------------------------------- hit testing

  App.prototype.pick = function () {
    if (!this.pointer || !this.scene) return null;
    var aspect = this.canvas.width / Math.max(1, this.canvas.height);
    var r = this.camera.ray(this.pointer[0], this.pointer[1], aspect);
    var best = null,
      bestT = Infinity;
    var blocks = this.scene.blocks;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var max = [b.pos[0] + b.size[0], b.pos[1] + b.size[1], b.pos[2] + b.size[2]];
      var t = M.rayBox(r.origin, r.dir, b.pos, max);
      if (t >= 0 && t < bestT) {
        bestT = t;
        best = b;
      }
    }
    if (!best) return null;
    var hit = M.add3(r.origin, M.scale3(r.dir, bestT));
    var local = [
      (hit[0] - best.pos[0]) / best.size[0],
      (hit[1] - best.pos[1]) / best.size[1],
      (hit[2] - best.pos[2]) / best.size[2],
    ];
    // which face did we land on?
    var eps = 1e-3;
    var normal = [0, 1, 0];
    if (local[1] > 1 - eps) normal = [0, 1, 0];
    else if (local[1] < eps) normal = [0, -1, 0];
    else if (local[0] > 1 - eps) normal = [1, 0, 0];
    else if (local[0] < eps) normal = [-1, 0, 0];
    else if (local[2] > 1 - eps) normal = [0, 0, 1];
    else normal = [0, 0, -1];

    var nx = best.cells[0],
      ny = best.cells[1],
      nz = best.cells[2];
    var cell;
    if (Math.abs(normal[1]) > 0.5) {
      cell = [
        Math.floor(local[0] * nx),
        normal[1] > 0 ? 0 : ny - 1,
        Math.floor(local[2] * nz),
      ];
    } else if (Math.abs(normal[0]) > 0.5) {
      cell = [
        normal[0] > 0 ? nx - 1 : 0,
        Math.floor((1 - local[1]) * ny),
        Math.floor(local[2] * nz),
      ];
    } else {
      cell = [
        Math.floor(local[0] * nx),
        Math.floor((1 - local[1]) * ny),
        normal[2] > 0 ? 0 : nz - 1,
      ];
    }
    cell = [
      M.clamp(cell[0], 0, nx - 1),
      M.clamp(cell[1], 0, ny - 1),
      M.clamp(cell[2], 0, nz - 1),
    ];
    return { block: best, cell: cell, point: hit };
  };

  // --------------------------------------------------------------- frame loop

  App.prototype.resizeCanvas = function () {
    var c = this.canvas;
    var w = Math.max(1, Math.round(c.clientWidth * this.dpr * this.quality));
    var h = Math.max(1, Math.round(c.clientHeight * this.dpr * this.quality));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  };

  App.prototype.tick = function (dt) {
    if (!this.scene) return;
    this.time += dt;
    this.resizeCanvas();

    if (this.camTarget) {
      this.camera.blendTo(this.camTarget, 1 - Math.exp(-this.camSpeed * dt));
      var d = M.len3(M.sub3(this.camera.target, this.camTarget.target));
      if (d < this.camera.dist * 0.002 && Math.abs(this.camera.dist - this.camTarget.dist) < this.camTarget.dist * 0.01) {
        this.camTarget = null;
      }
    }
    if (this.autoSpin) this.camera.yaw += dt * 0.06;

    var aspect = this.canvas.width / Math.max(1, this.canvas.height);
    var vp = this.camera.update(aspect);

    var hit = this.pick();
    this.hover = hit;
    var active = this.pinned || hit;
    var hl = {};
    if (active) {
      hl = LV.provenance(this.scene, active.block, active.cell);
    }
    Object.keys(this.highlights).forEach(function (k) {
      if (!hl[k]) hl[k] = this.highlights[k];
    }, this);

    this._writeInstances(hl, dt);
    this.renderer.draw({
      viewProj: vp,
      eye: this.camera.eye,
      time: this.time,
      blockData: this.blockData,
      blockCount: this.scene.blocks.length,
      beamData: this.beamData,
      beamCount: this.scene.beams.length,
      bgTop: [0.043, 0.055, 0.082],
      bgBottom: [0.015, 0.019, 0.031],
      fog: [0.055, 0.065, 0.095],
    });
    this._updateLabels(vp, this.canvas.clientWidth, this.canvas.clientHeight);
    this.emit("frame", active);
  };

  App.prototype._writeInstances = function (hl, dt) {
    var d = this.blockData;
    var blocks = this.scene.blocks;
    var focus = this.focus;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var o = i * FPB;
      var dimT = 0,
        emphT = 0;
      if (focus) {
        if (focus.ids[b.id]) {
          emphT = focus.strength || 0.5;
        } else if (focus.soft && focus.soft[b.id]) {
          dimT = 0.25;
        } else {
          dimT = focus.dim === undefined ? 0.84 : focus.dim;
        }
      }
      b.dim = M.approach(b.dim, dimT, 6, dt);
      b.emph = M.approach(b.emph, emphT, 6, dt);

      d[o] = b.pos[0];
      d[o + 1] = b.pos[1];
      d[o + 2] = b.pos[2];
      d[o + 3] = b.dataOffset;
      d[o + 4] = b.size[0];
      d[o + 5] = b.size[1];
      d[o + 6] = b.size[2];
      d[o + 7] = b.valueScale;
      d[o + 8] = b.cells[0];
      d[o + 9] = b.cells[1];
      d[o + 10] = b.cells[2];
      d[o + 11] = b.rowsUsed === undefined ? b.cells[2] : b.rowsUsed;
      d[o + 12] = b.color[0];
      d[o + 13] = b.color[1];
      d[o + 14] = b.color[2];
      d[o + 15] = b.dim;
      var h = hl[b.id];
      if (h) {
        d[o + 16] = h.a ? h.a[0] : 0;
        d[o + 17] = h.a ? h.a[1] : 0;
        d[o + 18] = h.a ? h.a[2] : 0;
        d[o + 19] = h.a ? (h.a[3] === undefined ? 1 : h.a[3]) : 0;
        d[o + 20] = h.b ? h.b[0] : 0;
        d[o + 21] = h.b ? h.b[1] : 0;
        d[o + 22] = h.b ? h.b[2] : 0;
        d[o + 23] = h.b ? (h.b[3] === undefined ? 1 : h.b[3]) : 0;
        d[o + 25] = h.mode === "and" ? 1 : 0;
      } else {
        d[o + 16] = d[o + 17] = d[o + 18] = d[o + 19] = 0;
        d[o + 20] = d[o + 21] = d[o + 22] = d[o + 23] = 0;
        d[o + 25] = 0;
      }
      d[o + 24] = b.emph;
      d[o + 26] = 0;
      d[o + 27] = i * 0.137;
      var div = b.dividers;
      d[o + 28] = div && div.xMajor ? div.xMajor : 0;
      d[o + 29] = div && div.xMinor ? div.xMinor : 0;
      d[o + 30] = div && div.yMajor ? div.yMajor : 0;
      d[o + 31] = div && div.yMinor ? div.yMinor : 0;
    }

    var beams = this.scene.beams;
    var bd = this.beamData;
    for (i = 0; i < beams.length; i++) {
      var bm = beams[i];
      var q = i * FPBEAM;
      var alpha = 0.5;
      if (focus) {
        alpha = focus.sections && focus.sections[bm.section] ? 0.85 : 0.12;
      }
      bd[q] = bm.from[0];
      bd[q + 1] = bm.from[1];
      bd[q + 2] = bm.from[2];
      bd[q + 3] = bm.width * this.dpr * this.quality;
      bd[q + 4] = bm.to[0];
      bd[q + 5] = bm.to[1];
      bd[q + 6] = bm.to[2];
      bd[q + 7] = 0.35;
      bd[q + 8] = bm.color[0];
      bd[q + 9] = bm.color[1];
      bd[q + 10] = bm.color[2];
      bd[q + 11] = alpha;
    }
  };

  LV.App = App;
})(window);
