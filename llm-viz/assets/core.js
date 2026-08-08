/**
 * llm-viz core: small linear-algebra helpers, a WebGL2 wrapper and the
 * orbit camera. Everything here is deliberately allocation-light because it
 * runs inside the render loop.
 *
 * Conventions: right-handed, Y up. Matrices are column-major Float32Array(16)
 * so they can be handed straight to uniformMatrix4fv.
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});

  // ---------------------------------------------------------------- vectors

  function v3(x, y, z) {
    return [x || 0, y || 0, z || 0];
  }
  function add3(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }
  function sub3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function scale3(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
  }
  function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
  function len3(a) {
    return Math.sqrt(dot3(a, a));
  }
  function norm3(a) {
    var l = len3(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function lerp3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  // --------------------------------------------------------------- matrices

  function mat4() {
    var m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  function perspective(out, fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  }

  function lookAt(out, eye, center, up) {
    var z = norm3(sub3(eye, center));
    var x = norm3(cross3(up, z));
    var y = cross3(z, x);
    out[0] = x[0];
    out[1] = y[0];
    out[2] = z[0];
    out[3] = 0;
    out[4] = x[1];
    out[5] = y[1];
    out[6] = z[1];
    out[7] = 0;
    out[8] = x[2];
    out[9] = y[2];
    out[10] = z[2];
    out[11] = 0;
    out[12] = -dot3(x, eye);
    out[13] = -dot3(y, eye);
    out[14] = -dot3(z, eye);
    out[15] = 1;
    return out;
  }

  function mulMat4(out, a, b) {
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4],
        b1 = b[c * 4 + 1],
        b2 = b[c * 4 + 2],
        b3 = b[c * 4 + 3];
      for (var r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
      }
    }
    return out;
  }

  /** Project a world point to normalized device coords; w<=0 means behind. */
  function projectPoint(m, p) {
    var x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    var y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    var z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
    var w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [x, y, z, w];
  }

  // ---------------------------------------------------------------- easings

  function easeInOut(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function easeOut(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }
  /** Frame-rate independent exponential approach. */
  function approach(cur, target, rate, dt) {
    return cur + (target - cur) * (1 - Math.exp(-rate * dt));
  }

  // ----------------------------------------------------------------- camera

  /**
   * Orbit camera. `dist` is the distance from `target`; `yaw` sweeps around
   * the Y axis and `pitch` tilts up/down. All walkthrough camera moves are
   * expressed in the same four numbers so they interpolate cleanly.
   */
  function Camera(state) {
    this.target = state.target.slice();
    this.yaw = state.yaw;
    this.pitch = state.pitch;
    this.dist = state.dist;
    this.fov = state.fov || 0.62;
    this.view = mat4();
    this.proj = mat4();
    this.viewProj = mat4();
    this.eye = v3();
  }

  Camera.prototype.snapshot = function () {
    return {
      target: this.target.slice(),
      yaw: this.yaw,
      pitch: this.pitch,
      dist: this.dist,
    };
  };

  Camera.prototype.applySnapshot = function (s) {
    this.target = s.target.slice();
    this.yaw = s.yaw;
    this.pitch = s.pitch;
    this.dist = s.dist;
  };

  /** Move a fraction of the way toward another camera pose. */
  Camera.prototype.blendTo = function (s, t) {
    this.target = lerp3(this.target, s.target, t);
    this.yaw = lerp(this.yaw, shortestAngle(this.yaw, s.yaw), t);
    this.pitch = lerp(this.pitch, s.pitch, t);
    // interpolate distance geometrically so zooms feel even at any scale
    this.dist = Math.exp(lerp(Math.log(this.dist), Math.log(s.dist), t));
  };

  function shortestAngle(from, to) {
    var d = ((to - from + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return from + d;
  }

  Camera.prototype.update = function (aspect) {
    var cp = Math.cos(this.pitch),
      sp = Math.sin(this.pitch);
    var cy = Math.cos(this.yaw),
      sy = Math.sin(this.yaw);
    var dir = [cp * sy, sp, cp * cy];
    this.eye = add3(this.target, scale3(dir, this.dist));
    var near = Math.max(0.05, this.dist * 0.002);
    var far = this.dist * 40 + 5000;
    perspective(this.proj, this.fov, aspect, near, far);
    lookAt(this.view, this.eye, this.target, [0, 1, 0]);
    mulMat4(this.viewProj, this.proj, this.view);
    return this.viewProj;
  };

  /** Build a world-space ray through a normalized (-1..1) screen point. */
  Camera.prototype.ray = function (ndcX, ndcY, aspect) {
    var cp = Math.cos(this.pitch),
      sp = Math.sin(this.pitch);
    var cy = Math.cos(this.yaw),
      sy = Math.sin(this.yaw);
    var back = [cp * sy, sp, cp * cy]; // camera -> target is -back
    var fwd = scale3(back, -1);
    var right = norm3(cross3([0, 1, 0], back));
    var up = cross3(back, right);
    var th = Math.tan(this.fov / 2);
    var dir = norm3(
      add3(fwd, add3(scale3(right, ndcX * th * aspect), scale3(up, ndcY * th)))
    );
    return { origin: this.eye.slice(), dir: dir };
  };

  // ------------------------------------------------------------ gl plumbing

  function compile(gl, type, src, label) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(label + " shader: " + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function program(gl, vsSrc, fsSrc, label) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc, label + " vertex"));
    gl.attachShader(
      p,
      compile(gl, gl.FRAGMENT_SHADER, fsSrc, label + " fragment")
    );
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(label + " link: " + gl.getProgramInfoLog(p));
    }
    var uniforms = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, "");
      uniforms[name] = gl.getUniformLocation(p, name);
    }
    return { prog: p, u: uniforms };
  }

  /** Intersect a ray with an axis-aligned box; returns entry distance or -1. */
  function rayBox(origin, dir, min, max) {
    var tmin = -Infinity,
      tmax = Infinity;
    for (var i = 0; i < 3; i++) {
      if (Math.abs(dir[i]) < 1e-9) {
        if (origin[i] < min[i] || origin[i] > max[i]) return -1;
        continue;
      }
      var t1 = (min[i] - origin[i]) / dir[i];
      var t2 = (max[i] - origin[i]) / dir[i];
      if (t1 > t2) {
        var tt = t1;
        t1 = t2;
        t2 = tt;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    return tmax < 0 ? -1 : tmin > 0 ? tmin : 0;
  }

  LV.math = {
    v3: v3,
    add3: add3,
    sub3: sub3,
    scale3: scale3,
    dot3: dot3,
    cross3: cross3,
    len3: len3,
    norm3: norm3,
    lerp: lerp,
    lerp3: lerp3,
    clamp: clamp,
    mat4: mat4,
    perspective: perspective,
    lookAt: lookAt,
    mulMat4: mulMat4,
    projectPoint: projectPoint,
    easeInOut: easeInOut,
    easeOut: easeOut,
    approach: approach,
    rayBox: rayBox,
  };
  LV.Camera = Camera;
  LV.gl = { program: program };
})(window);
