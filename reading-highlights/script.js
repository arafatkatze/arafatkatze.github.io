/* ============================================================
   The Reading Map — a rotatable 3D galaxy of highlights

   Points live in a 3-D UMAP embedding (map.json: x, y, z) and are drawn as
   glowing sprites by a small hand-rolled WebGL renderer, so the page stays
   dependency-free. A 2-D overlay canvas paints theme labels and hover rings
   on top, using the same projection as the GPU.
   ============================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const glCanvas = $("map");
  const ov = $("overlay");
  const octx = ov.getContext("2d");
  const tip = $("tip");

  const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const FOV = (46 * Math.PI) / 180;
  const SPIN_SPEED = 0.055; // radians / second

  let MAP = null; // {clusters, x[], y[], z[], c[], n}
  let HL = null; // highlights payload (tooltip text)
  let colorOf = []; // cluster id -> css color
  let labelOf = []; // cluster id -> display label

  let N = 0;
  let POS = null; // Float32Array(N*3), centred on the origin
  let clusterAt = []; // cluster id -> [x, y, z] centred like POS
  let dataR = 1; // framing radius of the cloud (98th percentile)
  let dataMax = 1; // radius that still contains the stragglers

  // orbit camera: eye = target + radius * (sinθcosφ, sinφ, cosθcosφ)
  const cam = { theta: -0.62, phi: 0.3, radius: 1, target: [0, 0, 0] };
  let fitRadius = 1;
  let vTheta = 0,
    vPhi = 0; // rotation inertia
  let flat = 0, // 0 = full depth, 1 = flattened to the old 2D map
    flatTarget = 0;
  let spinning = !REDUCED;
  let tween = null;

  let W = 0,
    H = 0,
    dpr = 1;
  let hoverI = -1,
    selI = -1,
    focusCluster = -1,
    focusPreview = -1;
  let dragging = false;
  let dirty = true;
  const mark = () => (dirty = true);

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
    .catch((e) => {
      $("loading").innerHTML = "<p>could not load the map</p>";
      console.error(e);
    });

  // tooltip text loads in parallel; the map is interactive before it arrives
  loadGz("../reading-quotes/highlights.json.gz", "../reading-quotes/highlights.json")
    .then((d) => {
      HL = d;
    })
    .catch((e) => console.warn("tooltip text unavailable", e));

  async function loadGz(gzUrl, plainUrl) {
    if (typeof DecompressionStream !== "undefined") {
      try {
        const r = await fetch(gzUrl);
        if (r.ok && r.body) {
          const s = r.body.pipeThrough(new DecompressionStream("gzip"));
          return JSON.parse(await new Response(s).text());
        }
      } catch (e) {
        /* fall through to the plain file */
      }
    }
    return (await fetch(plainUrl)).json();
  }

  /* ============================================================
     geometry
     ============================================================ */
  function buildPoints() {
    N = MAP.n;
    const x = MAP.x,
      y = MAP.y,
      z = MAP.z || null;
    let cx = 0,
      cy = 0,
      cz = 0;
    for (let i = 0; i < N; i++) {
      cx += x[i];
      cy += y[i];
      cz += z ? z[i] : 0;
    }
    cx /= N;
    cy /= N;
    cz /= N;

    POS = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      POS[i * 3] = x[i] - cx;
      POS[i * 3 + 1] = -(y[i] - cy); // screen-style y, so the flat view matches the old map
      POS[i * 3 + 2] = z ? z[i] - cz : 0;
    }

    // a handful of stragglers sit far outside the cloud, so the framing radius
    // is the 98th percentile: they drift off-frame instead of shrinking everything
    const radii = new Float32Array(N);
    for (let i = 0; i < N; i++) radii[i] = Math.hypot(POS[i * 3], POS[i * 3 + 1], POS[i * 3 + 2]);
    const sorted = Float32Array.prototype.slice.call(radii).sort();
    dataR = Math.max(1, sorted[Math.floor(N * 0.98)]);
    dataMax = Math.max(dataR, sorted[N - 1]);

    clusterAt = MAP.clusters.map((cl) => [cl.cx - cx, -(cl.cy - cy), (cl.cz || 0) - cz]);
  }

  /* ============================================================
     matrix helpers (column-major, WebGL order)
     ============================================================ */
  const MVP = new Float32Array(16);
  const _proj = new Float32Array(16);
  const _view = new Float32Array(16);

  function perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
  }

  function lookAt(out, eye, center, up) {
    let zx = eye[0] - center[0],
      zy = eye[1] - center[1],
      zz = eye[2] - center[2];
    let l = Math.hypot(zx, zy, zz) || 1;
    zx /= l;
    zy /= l;
    zz /= l;
    let xx = up[1] * zz - up[2] * zy,
      xy = up[2] * zx - up[0] * zz,
      xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1;
    xx /= l;
    xy /= l;
    xz /= l;
    const yx = zy * xz - zz * xy,
      yy = zz * xx - zx * xz,
      yz = zx * xy - zy * xx;
    out[0] = xx;
    out[1] = yx;
    out[2] = zx;
    out[3] = 0;
    out[4] = xy;
    out[5] = yy;
    out[6] = zy;
    out[7] = 0;
    out[8] = xz;
    out[9] = yz;
    out[10] = zz;
    out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
  }

  function multiply(out, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4],
        b1 = b[c * 4 + 1],
        b2 = b[c * 4 + 2],
        b3 = b[c * 4 + 3];
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
      }
    }
  }

  // camera basis + matrices for the current frame
  const eye = [0, 0, 0],
    fwd = [0, 0, 0],
    right = [0, 0, 0],
    upv = [0, 0, 0];

  function updateCamera() {
    const st = Math.sin(cam.theta),
      ct = Math.cos(cam.theta),
      sp = Math.sin(cam.phi),
      cp = Math.cos(cam.phi);
    eye[0] = cam.target[0] + cam.radius * st * cp;
    eye[1] = cam.target[1] + cam.radius * sp;
    eye[2] = cam.target[2] + cam.radius * ct * cp;
    fwd[0] = -st * cp;
    fwd[1] = -sp;
    fwd[2] = -ct * cp;
    right[0] = ct;
    right[1] = 0;
    right[2] = -st;
    upv[0] = -st * sp;
    upv[1] = cp;
    upv[2] = -ct * sp;

    const aspect = Math.max(0.2, W / Math.max(1, H));
    const near = Math.max(dataR * 0.004, cam.radius - dataMax * 1.05);
    const far = cam.radius + dataMax * 1.6;
    perspective(_proj, FOV, aspect, near, far);
    lookAt(_view, eye, cam.target, [0, 1, 0]);
    multiply(MVP, _proj, _view);
  }

  const _p = [0, 0];
  function project(x, y, z) {
    const m = MVP;
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 1e-4) return false;
    _p[0] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / cw / 2 + 0.5) * W;
    _p[1] = (0.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw / 2) * H;
    return true;
  }

  function depthOf(x, y, z) {
    return (x - eye[0]) * fwd[0] + (y - eye[1]) * fwd[1] + (z - eye[2]) * fwd[2];
  }

  function fitView(animate) {
    const aspect = Math.max(0.2, W / Math.max(1, H));
    const halfV = FOV / 2;
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    fitRadius = (dataR / Math.sin(Math.min(halfV, halfH))) * 1.04;
    const to = { theta: -0.62, phi: 0.3, radius: fitRadius, target: [0, 0, 0] };
    if (animate) flyTo(to);
    else {
      cam.theta = to.theta;
      cam.phi = to.phi;
      cam.radius = to.radius;
      cam.target = [0, 0, 0];
    }
  }

  function flyTo(to, ms) {
    mark();
    tween = {
      t0: performance.now(),
      ms: REDUCED ? 1 : ms || 780,
      from: { theta: cam.theta, phi: cam.phi, radius: cam.radius, target: cam.target.slice() },
      to: {
        theta: to.theta !== undefined ? to.theta : cam.theta,
        phi: to.phi !== undefined ? to.phi : cam.phi,
        radius: to.radius !== undefined ? to.radius : cam.radius,
        target: to.target || cam.target.slice(),
      },
    };
  }

  function stepTween(now) {
    if (!tween) return;
    const k = clamp((now - tween.t0) / tween.ms, 0, 1);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
    const f = tween.from,
      t = tween.to;
    cam.theta = f.theta + (t.theta - f.theta) * e;
    cam.phi = f.phi + (t.phi - f.phi) * e;
    cam.radius = f.radius + (t.radius - f.radius) * e;
    for (let i = 0; i < 3; i++) cam.target[i] = f.target[i] + (t.target[i] - f.target[i]) * e;
    if (k >= 1) tween = null;
  }

  /* ============================================================
     WebGL
     ============================================================ */
  let gl = null;
  let pointProg = null,
    glowProg = null;
  let bufPos, bufColor, bufCluster, bufDust, bufGlow;
  let dustCount = 0;

  const POINT_VS = `
    attribute vec3 aPos;
    attribute vec3 aColor;
    attribute float aCluster;
    uniform mat4 uMVP;
    uniform vec3 uEye;
    uniform vec3 uFwd;
    uniform float uFlat, uSize, uRefDist, uNear, uFar, uFocus, uDim, uFog, uAlpha;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vFog;
    void main() {
      vec3 p = vec3(aPos.xy, aPos.z * (1.0 - uFlat));
      gl_Position = uMVP * vec4(p, 1.0);
      float dist = max(1e-3, dot(p - uEye, uFwd));
      gl_PointSize = clamp(uSize * pow(uRefDist / dist, 0.7), 0.7, 48.0);
      vFog = clamp((dist - uNear) / max(1e-3, uFar - uNear), 0.0, 1.0) * uFog;
      vAlpha = ((uFocus > -0.5 && abs(aCluster - uFocus) > 0.5) ? uDim : 1.0) * uAlpha;
      vColor = aColor;
    }`;

  const POINT_FS = `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vFog;
    uniform float uNight;
    uniform vec3 uFogColor;
    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float d2 = dot(uv, uv);
      if (d2 > 1.0) discard;
      if (uNight > 0.5) {
        // distance dims the stars
        float core = pow(1.0 - d2, 1.6);
        vec3 c = mix(vColor, vec3(1.0), pow(core, 9.0) * 0.65);
        gl_FragColor = vec4(c * (0.55 + 0.7 * core), core * vAlpha * mix(1.0, 0.18, vFog));
      } else {
        // on parchment, distance washes the ink toward the paper instead
        float a = 1.0 - smoothstep(0.55, 1.0, sqrt(d2));
        gl_FragColor = vec4(mix(vColor * 0.62, uFogColor, vFog * 0.55), a * vAlpha * mix(1.0, 0.62, vFog));
      }
    }`;

  const GLOW_VS = `
    attribute vec3 aCenter;
    attribute vec2 aCorner;
    attribute vec3 aColor;
    attribute float aCluster;
    uniform mat4 uMVP;
    uniform vec3 uRight, uUp;
    uniform float uFlat, uGlowSize, uFocus, uAlpha;
    varying vec2 vUV;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec3 c = vec3(aCenter.xy, aCenter.z * (1.0 - uFlat));
      vec3 p = c + (uRight * aCorner.x + uUp * aCorner.y) * uGlowSize;
      gl_Position = uMVP * vec4(p, 1.0);
      vUV = aCorner;
      vColor = aColor;
      vAlpha = (uFocus > -0.5 && abs(aCluster - uFocus) > 0.5) ? 0.0 : uAlpha;
    }`;

  const GLOW_FS = `
    precision mediump float;
    varying vec2 vUV;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float g = exp(-dot(vUV, vUV) * 3.2);
      gl_FragColor = vec4(vColor, g * vAlpha);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader failed");
    return s;
  }

  function program(vs, fs, attrs, uniforms) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link failed");
    const o = { p, a: {}, u: {} };
    attrs.forEach((n) => (o.a[n] = gl.getAttribLocation(p, n)));
    uniforms.forEach((n) => (o.u[n] = gl.getUniformLocation(p, n)));
    return o;
  }

  function initGL() {
    const opts = { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, powerPreference: "high-performance" };
    gl = glCanvas.getContext("webgl2", opts) || glCanvas.getContext("webgl", opts) || glCanvas.getContext("experimental-webgl", opts);
    if (!gl) return false;
    try {
      pointProg = program(
        POINT_VS,
        POINT_FS,
        ["aPos", "aColor", "aCluster"],
        ["uMVP", "uEye", "uFwd", "uFlat", "uSize", "uRefDist", "uNear", "uFar", "uFocus", "uDim", "uFog", "uAlpha", "uNight", "uFogColor"]
      );
      glowProg = program(
        GLOW_VS,
        GLOW_FS,
        ["aCenter", "aCorner", "aColor", "aCluster"],
        ["uMVP", "uRight", "uUp", "uFlat", "uGlowSize", "uFocus", "uAlpha"]
      );
    } catch (e) {
      console.warn("WebGL shaders unavailable", e);
      gl = null;
      return false;
    }

    // per-point colour + cluster id
    const col = new Float32Array(N * 3);
    const clu = new Float32Array(N);
    const rgb = MAP.clusters.map((c) => hexToRgb(c.color));
    for (let i = 0; i < N; i++) {
      const c = rgb[MAP.c[i]] || [1, 1, 1];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
      clu[i] = MAP.c[i];
    }
    bufPos = vbo(POS);
    bufColor = vbo(col);
    bufCluster = vbo(clu);

    // faint dust so the depth of the cloud reads while it turns
    const rnd = mulberry32(20240917);
    dustCount = 1500;
    const dust = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const u = rnd() * 2 - 1,
        a = rnd() * Math.PI * 2,
        s = Math.sqrt(1 - u * u);
      const r = dataR * (1.25 + 2.1 * Math.pow(rnd(), 0.6));
      dust[i * 3] = r * s * Math.cos(a);
      dust[i * 3 + 1] = r * u * 0.72;
      dust[i * 3 + 2] = r * s * Math.sin(a);
    }
    bufDust = vbo(dust);

    // one billboard quad per theme for the nebula haze
    const K = MAP.clusters.length;
    const quad = new Float32Array(K * 6 * 9); // center(3) corner(2) color(3) cluster(1)
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ];
    let o = 0;
    for (let k = 0; k < K; k++) {
      const c = clusterAt[k],
        rc = rgb[k];
      for (let v = 0; v < 6; v++) {
        quad[o++] = c[0];
        quad[o++] = c[1];
        quad[o++] = c[2];
        quad[o++] = corners[v][0];
        quad[o++] = corners[v][1];
        quad[o++] = rc[0];
        quad[o++] = rc[1];
        quad[o++] = rc[2];
        quad[o++] = k;
      }
    }
    bufGlow = vbo(quad);
    return true;
  }

  function vbo(arr) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    return b;
  }

  function attrib(loc, buf, size, stride, offset) {
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride || 0, offset || 0);
  }

  /* ============================================================
     draw
     ============================================================ */
  function basePointPx() {
    return clamp(2.4 * Math.pow(fitRadius / cam.radius, 0.42), 1.4, 11);
  }

  function isNight() {
    return document.body.dataset.theme !== "day";
  }

  function drawGL() {
    const night = isNight();
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if (night) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
    else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const eff = focusCluster >= 0 ? focusCluster : focusPreview;
    const near = Math.max(1e-3, cam.radius - dataR),
      far = cam.radius + dataR;

    if (night) {
      // nebula haze behind the stars
      const g = glowProg;
      gl.useProgram(g.p);
      gl.uniformMatrix4fv(g.u.uMVP, false, MVP);
      gl.uniform3fv(g.u.uRight, right);
      gl.uniform3fv(g.u.uUp, upv);
      gl.uniform1f(g.u.uFlat, flat);
      gl.uniform1f(g.u.uGlowSize, dataR * 0.6);
      gl.uniform1f(g.u.uFocus, eff);
      // the haze would swallow the stars once the camera flies inside it
      gl.uniform1f(g.u.uAlpha, 0.13 * clamp(cam.radius / fitRadius, 0, 1));
      const S = 9 * 4;
      attrib(g.a.aCenter, bufGlow, 3, S, 0);
      attrib(g.a.aCorner, bufGlow, 2, S, 12);
      attrib(g.a.aColor, bufGlow, 3, S, 20);
      attrib(g.a.aCluster, bufGlow, 1, S, 32);
      gl.drawArrays(gl.TRIANGLES, 0, MAP.clusters.length * 6);
    }

    const p = pointProg;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uMVP, false, MVP);
    gl.uniform3fv(p.u.uEye, eye);
    gl.uniform3fv(p.u.uFwd, fwd);
    gl.uniform1f(p.u.uFlat, flat);
    gl.uniform1f(p.u.uRefDist, cam.radius);
    gl.uniform1f(p.u.uNear, near);
    gl.uniform1f(p.u.uFar, far);
    gl.uniform1f(p.u.uDim, night ? 0.05 : 0.09);
    gl.uniform1f(p.u.uNight, night ? 1 : 0);
    gl.uniform3f(p.u.uFogColor, 0.925, 0.878, 0.784); // the parchment of the day theme

    if (night) {
      // dust first: it should never dim with a theme focus
      gl.uniform1f(p.u.uFocus, -1);
      gl.uniform1f(p.u.uSize, 1.15 * dpr);
      gl.uniform1f(p.u.uFog, 0.35);
      gl.uniform1f(p.u.uAlpha, 0.4);
      attrib(p.a.aPos, bufDust, 3, 0, 0);
      if (p.a.aColor >= 0) {
        gl.disableVertexAttribArray(p.a.aColor);
        gl.vertexAttrib3f(p.a.aColor, 0.62, 0.68, 0.86);
      }
      if (p.a.aCluster >= 0) {
        gl.disableVertexAttribArray(p.a.aCluster);
        gl.vertexAttrib1f(p.a.aCluster, -9);
      }
      gl.drawArrays(gl.POINTS, 0, dustCount);
    }

    gl.uniform1f(p.u.uFocus, eff);
    gl.uniform1f(p.u.uSize, basePointPx() * dpr);
    gl.uniform1f(p.u.uFog, 1);
    gl.uniform1f(p.u.uAlpha, 1);
    attrib(p.a.aPos, bufPos, 3, 0, 0);
    attrib(p.a.aColor, bufColor, 3, 0, 0);
    attrib(p.a.aCluster, bufCluster, 1, 0, 0);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  // canvas2d stand-in when WebGL is unavailable
  function drawPointsFallback() {
    const eff = focusCluster >= 0 ? focusCluster : focusPreview;
    const base = basePointPx();
    const paths = MAP.clusters.map(() => new Path2D());
    for (let i = 0; i < N; i++) {
      const x = POS[i * 3],
        y = POS[i * 3 + 1],
        z = POS[i * 3 + 2] * (1 - flat);
      if (!project(x, y, z)) continue;
      const sx = _p[0],
        sy = _p[1];
      if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;
      const r = clamp(base * Math.pow(cam.radius / Math.max(1e-3, depthOf(x, y, z)), 0.7), 0.5, 20);
      const pa = paths[MAP.c[i]];
      pa.moveTo(sx + r, sy);
      pa.arc(sx, sy, r, 0, 6.2832);
    }
    for (let k = 0; k < paths.length; k++) {
      octx.globalAlpha = eff >= 0 && eff !== k ? 0.06 : isNight() ? 0.85 : 0.9;
      octx.fillStyle = colorOf[k];
      octx.fill(paths[k]);
    }
    octx.globalAlpha = 1;
  }

  function drawOverlay() {
    octx.save();
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    if (!gl) drawPointsFallback();
    const eff = focusCluster >= 0 ? focusCluster : focusPreview;
    drawLabels(eff);
    if (selI >= 0) drawRing(selI, true);
    if (hoverI >= 0 && hoverI !== selI) drawRing(hoverI, false);
    octx.restore();
  }

  function drawLabels(eff) {
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    const night = isNight();
    // biggest themes first, skipping labels that would collide with a placed
    // one, so more of them reveal themselves as you zoom in
    const order = MAP.clusters.map((c, k) => k).sort((a, b) => MAP.clusters[b].count - MAP.clusters[a].count);
    const placed = [];
    for (const k of order) {
      if (eff >= 0 && eff !== k) continue;
      const c = clusterAt[k];
      const cz = c[2] * (1 - flat);
      if (!project(c[0], c[1], cz)) continue;
      const sx = _p[0],
        sy = _p[1];
      if (sx < -70 || sx > W + 70 || sy < -30 || sy > H + 30) continue;
      const dist = Math.max(1e-3, depthOf(c[0], c[1], cz));
      const persp = clamp(Math.pow(cam.radius / dist, 0.55), 0.62, 1.7);
      const cl = MAP.clusters[k];
      const size = clamp((13 + Math.log2(cl.count) - 6) * persp, 11, 30);
      octx.font = `600 ${size}px "Fraunces", Georgia, serif`;
      const txt = labelOf[k];
      const w = octx.measureText(txt).width + 12,
        h = size + 8;
      const box = { x: sx - w / 2, y: sy - h / 2, w, h };
      let clash = false;
      if (eff < 0) {
        for (const q of placed) {
          if (box.x < q.x + q.w && box.x + box.w > q.x && box.y < q.y + q.h && box.y + box.h > q.y) {
            clash = true;
            break;
          }
        }
      }
      if (clash) continue;
      placed.push(box);
      octx.globalAlpha = clamp(0.35 + 0.65 * persp, 0.4, 1);
      octx.lineWidth = 3.5;
      octx.strokeStyle = night ? "rgba(8,10,18,0.9)" : "rgba(246,240,226,0.92)";
      octx.strokeText(txt, sx, sy);
      octx.fillStyle = colorOf[k];
      octx.fillText(txt, sx, sy);
      octx.globalAlpha = 1;
    }
  }

  function drawRing(i, selected) {
    const x = POS[i * 3],
      y = POS[i * 3 + 1],
      z = POS[i * 3 + 2] * (1 - flat);
    if (!project(x, y, z)) return;
    const sx = _p[0],
      sy = _p[1];
    const r = clamp(basePointPx() * Math.pow(cam.radius / Math.max(1e-3, depthOf(x, y, z)), 0.7), 1.4, 20);
    const col = colorOf[MAP.c[i]];
    octx.globalAlpha = 1;
    octx.beginPath();
    octx.arc(sx, sy, r + (selected ? 7 : 5), 0, 6.2832);
    octx.lineWidth = selected ? 2.5 : 1.8;
    octx.strokeStyle = col;
    octx.stroke();
    octx.beginPath();
    octx.arc(sx, sy, r + 1.2, 0, 6.2832);
    octx.fillStyle = "#fff";
    octx.fill();
    octx.beginPath();
    octx.arc(sx, sy, r * 0.75, 0, 6.2832);
    octx.fillStyle = col;
    octx.fill();
  }

  /* ============================================================
     frame loop
     ============================================================ */
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // a quote on screen holds the idle orbit still, so it stays readable
    const drifting = spinning && hoverI < 0 && selI < 0;
    const animating = drifting || !!tween || vTheta !== 0 || vPhi !== 0 || Math.abs(flat - flatTarget) > 1e-4;
    if (!animating && !dirty) return;
    dirty = false;

    stepTween(now);

    if (!dragging && !tween) {
      if (drifting) cam.theta += SPIN_SPEED * dt;
      if (Math.abs(vTheta) > 1e-5 || Math.abs(vPhi) > 1e-5) {
        cam.theta += vTheta;
        cam.phi = clamp(cam.phi + vPhi, -1.45, 1.45);
        vTheta *= 0.9;
        vPhi *= 0.9;
        if (Math.abs(vTheta) < 1e-5) vTheta = 0;
        if (Math.abs(vPhi) < 1e-5) vPhi = 0;
      }
    }
    if (Math.abs(flat - flatTarget) > 1e-4) flat += (flatTarget - flat) * Math.min(1, dt * 5);
    else flat = flatTarget;

    updateCamera();
    if (gl) drawGL();
    drawOverlay();
  }

  /* ============================================================
     picking
     ============================================================ */
  function pointAt(sx, sy) {
    const eff = focusCluster;
    let best = -1,
      bestScore = Infinity;
    const thresh = 13 * 13;
    for (let i = 0; i < N; i++) {
      if (eff >= 0 && MAP.c[i] !== eff) continue;
      const x = POS[i * 3],
        y = POS[i * 3 + 1],
        z = POS[i * 3 + 2] * (1 - flat);
      if (!project(x, y, z)) continue;
      const dx = _p[0] - sx,
        dy = _p[1] - sy;
      const d2 = dx * dx + dy * dy;
      if (d2 > thresh) continue;
      // nearest to the pointer, using camera depth to break ties
      const score = d2 + depthOf(x, y, z) / (dataR * 40);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  /* ============================================================
     tooltip
     ============================================================ */
  function showTip(i, clientX, clientY) {
    if (i < 0) {
      tip.hidden = true;
      return;
    }
    if (!HL) return; // text not loaded yet
    const h = HL.highlights[i];
    const b = HL.books[h[1]];
    $("tipQuote").textContent = truncate(h[0], 320);
    $("tipBook").textContent = b[0];
    $("tipAuthor").textContent = HL.authors[b[1]] || "";
    $("tipTheme").textContent = labelOf[MAP.c[i]];
    tip.style.setProperty("--tip-color", colorOf[MAP.c[i]]);
    tip.hidden = false;
    positionTip(clientX, clientY);
  }
  function positionTip(clientX, clientY) {
    if (tip.hidden) return;
    if (window.innerWidth <= 720) return; // bottom sheet on mobile
    const rect = tip.getBoundingClientRect();
    let x = clientX + 16,
      y = clientY + 16;
    if (x + rect.width > window.innerWidth - 8) x = clientX - rect.width - 16;
    if (y + rect.height > window.innerHeight - 8) y = clientY - rect.height - 16;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }

  /* ============================================================
     setup + interaction
     ============================================================ */
  function setup() {
    buildPoints();
    resize();
    if (!initGL()) document.body.classList.add("no-webgl");
    buildLegend();
    fitView(false);
    bind();
    restoreTheme();
    restorePrefs();
    requestAnimationFrame(frame);
    setTimeout(() => $("stageHint") && $("stageHint").classList.add("hide"), 7200);
  }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = ov.clientWidth;
    H = ov.clientHeight;
    for (const c of [glCanvas, ov]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
  }

  function localXY(e) {
    const r = ov.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  // taking hold of the map stops the idle orbit; the button brings it back
  function userTook(stopSpin) {
    if (stopSpin && spinning) setSpin(false);
  }

  function bind() {
    window.addEventListener("resize", () => {
      resize();
      const keep = cam.radius / fitRadius;
      const aspect = Math.max(0.2, W / Math.max(1, H));
      const halfH = Math.atan(Math.tan(FOV / 2) * aspect);
      fitRadius = (dataR / Math.sin(Math.min(FOV / 2, halfH))) * 1.04;
      cam.radius = fitRadius * keep;
      mark();
    });

    ov.addEventListener("mousemove", (e) => {
      if (dragging) return;
      const [lx, ly] = localXY(e);
      const i = pointAt(lx, ly);
      if (i >= 0) {
        showTip(i, e.clientX, e.clientY);
        ov.style.cursor = "pointer";
      } else {
        ov.style.cursor = "grab";
        if (selI < 0) tip.hidden = true;
      }
      const next = i >= 0 ? i : selI;
      if (next !== hoverI) {
        hoverI = next;
        mark();
      }
    });
    ov.addEventListener("mouseleave", () => {
      if (selI < 0) {
        hoverI = -1;
        tip.hidden = true;
        mark();
      }
    });

    ov.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        userTook(false);
        dolly(Math.exp(e.deltaY * 0.0012));
      },
      { passive: false }
    );

    // pointer: drag to orbit, shift/right-drag to pan, two fingers to pinch
    const pts = new Map();
    let last = null,
      pinch = 0,
      moved = 0,
      panMode = false;

    ov.addEventListener("pointerdown", (e) => {
      ov.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      last = { x: e.clientX, y: e.clientY };
      moved = 0;
      dragging = true;
      panMode = e.shiftKey || e.button === 1 || e.button === 2;
      vTheta = vPhi = 0;
      tween = null;
      userTook(true);
      ov.classList.add("grabbing");
      if (pts.size === 2) pinch = twoDist(pts);
    });

    ov.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const d = twoDist(pts);
        if (pinch > 0 && d > 0) dolly(pinch / d);
        pinch = d;
        if (last) pan(e.clientX - last.x, e.clientY - last.y);
      } else if (last) {
        const dx = e.clientX - last.x,
          dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (panMode) pan(dx, dy);
        else orbit(dx, dy);
        if (!tip.hidden && selI < 0) tip.hidden = true;
      }
      last = { x: e.clientX, y: e.clientY };
    });

    const up = (e) => {
      if (pts.size === 1 && moved < 6) {
        const [lx, ly] = localXY(e);
        const i = pointAt(lx, ly);
        selI = i;
        hoverI = i;
        if (i >= 0) showTip(i, e.clientX, e.clientY);
        else tip.hidden = true;
        mark();
      }
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (pts.size === 0) {
        dragging = false;
        last = null;
        ov.classList.remove("grabbing");
      }
    };
    ov.addEventListener("pointerup", up);
    ov.addEventListener("pointercancel", up);
    ov.addEventListener("contextmenu", (e) => e.preventDefault());

    // double-click a star to fly to it
    ov.addEventListener("dblclick", (e) => {
      const [lx, ly] = localXY(e);
      const i = pointAt(lx, ly);
      if (i < 0) return;
      selI = hoverI = i;
      showTip(i, e.clientX, e.clientY);
      flyTo({ target: [POS[i * 3], POS[i * 3 + 1], POS[i * 3 + 2] * (1 - flat)], radius: Math.max(dataR * 0.14, cam.radius * 0.45) });
    });

    $("zoomIn").addEventListener("click", () => {
      userTook(false);
      dolly(1 / 1.35);
    });
    $("zoomOut").addEventListener("click", () => {
      userTook(false);
      dolly(1.35);
    });
    $("reset").addEventListener("click", resetView);
    $("spin").addEventListener("click", () => setSpin(!spinning));
    $("flatten").addEventListener("click", () => setFlat(flatTarget < 0.5));
    $("themeToggle").addEventListener("click", toggleTheme);
    $("legendToggle").addEventListener("click", () => {
      const l = $("legend");
      l.classList.toggle("collapsed");
      $("legendToggle").textContent = l.classList.contains("collapsed") ? "+" : "–";
    });

    window.addEventListener("keydown", (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const step = e.shiftKey ? 0.22 : 0.09;
      switch (e.key) {
        case "ArrowLeft":
          userTook(true);
          cam.theta -= step;
          break;
        case "ArrowRight":
          userTook(true);
          cam.theta += step;
          break;
        case "ArrowUp":
          userTook(true);
          cam.phi = clamp(cam.phi + step, -1.45, 1.45);
          break;
        case "ArrowDown":
          userTook(true);
          cam.phi = clamp(cam.phi - step, -1.45, 1.45);
          break;
        case "+":
        case "=":
          dolly(1 / 1.3);
          break;
        case "-":
        case "_":
          dolly(1.3);
          break;
        case "r":
        case "R":
          resetView();
          break;
        case "f":
        case "F":
          setFlat(flatTarget < 0.5);
          break;
        case " ":
          setSpin(!spinning);
          break;
        case "Escape":
          selI = -1;
          focusCluster = -1;
          tip.hidden = true;
          syncLegend();
          mark();
          return;
        default:
          return;
      }
      mark();
      e.preventDefault();
    });
  }

  function orbit(dx, dy) {
    const k = 0.0055;
    cam.theta -= dx * k;
    cam.phi = clamp(cam.phi - dy * k, -1.45, 1.45);
    vTheta = -dx * k * 0.45;
    vPhi = -dy * k * 0.45;
    mark();
  }

  function pan(dx, dy) {
    const wpp = (2 * cam.radius * Math.tan(FOV / 2)) / Math.max(1, H);
    for (let i = 0; i < 3; i++) cam.target[i] += (-right[i] * dx + upv[i] * dy) * wpp;
    mark();
  }

  function dolly(f) {
    tween = null;
    cam.radius = clamp(cam.radius * f, dataR * 0.05, fitRadius * 3.2);
    mark();
  }

  function resetView() {
    selI = -1;
    focusCluster = -1;
    tip.hidden = true;
    syncLegend();
    setFlat(false);
    fitView(true);
  }

  function setSpin(on) {
    spinning = !!on && !REDUCED;
    $("spin").setAttribute("aria-pressed", String(spinning));
    $("spinGlyph").textContent = spinning ? "⏸" : "⟳";
    $("spin").classList.toggle("active", spinning);
    savePrefs();
    mark();
  }

  function setFlat(on) {
    flatTarget = on ? 1 : 0;
    const btn = $("flatten");
    btn.setAttribute("aria-pressed", String(!!on));
    btn.classList.toggle("active", !!on);
    $("flattenText").textContent = on ? "3D" : "2D";
    if (on) setSpin(false);
    flyTo({ theta: on ? 0 : -0.62, phi: on ? 0 : 0.3, radius: fitRadius, target: [0, 0, 0] });
    savePrefs();
  }

  /* ============================================================
     legend
     ============================================================ */
  function buildLegend() {
    const body = $("legendBody");
    body.innerHTML = "";
    MAP.clusters
      .slice()
      .sort((a, b) => b.count - a.count)
      .forEach((cl) => {
        const item = document.createElement("div");
        item.className = "legend-item";
        item.dataset.cluster = cl.id;
        item.innerHTML =
          `<span class="legend-dot" style="background:${cl.color};color:${cl.color}"></span>` +
          `<span class="legend-label">${escapeHTML(titleize(cl.label))}</span>` +
          `<span class="legend-count">${cl.count}</span>`;
        item.addEventListener("mouseenter", () => {
          if (focusCluster < 0) {
            focusPreview = cl.id;
            mark();
          }
        });
        item.addEventListener("mouseleave", () => {
          if (focusCluster < 0) {
            focusPreview = -1;
            mark();
          }
        });
        item.addEventListener("click", () => {
          const on = focusCluster !== cl.id;
          focusCluster = on ? cl.id : -1;
          focusPreview = -1;
          selI = -1;
          tip.hidden = true;
          syncLegend();
          if (on) {
            const t = clusterAt[cl.id];
            flyTo({ target: [t[0], t[1], t[2] * (1 - flatTarget)], radius: Math.max(dataR * 0.35, fitRadius * 0.45) });
          } else fitView(true);
        });
        body.appendChild(item);
      });
  }
  function syncLegend() {
    $("legendBody")
      .querySelectorAll(".legend-item")
      .forEach((el) => {
        const id = +el.dataset.cluster;
        el.classList.toggle("active", focusCluster === id);
        el.classList.toggle("dim", focusCluster >= 0 && focusCluster !== id);
      });
  }

  /* ============================================================
     theme + prefs
     ============================================================ */
  function toggleTheme() {
    const day = document.body.dataset.theme === "day";
    document.body.dataset.theme = day ? "night" : "day";
    $("themeToggle").textContent = day ? "☀" : "☾";
    try {
      localStorage.setItem("rm-theme", document.body.dataset.theme);
    } catch (e) {}
    mark();
  }
  function restoreTheme() {
    try {
      const t = localStorage.getItem("rm-theme");
      if (t) document.body.dataset.theme = t;
    } catch (e) {}
    $("themeToggle").textContent = document.body.dataset.theme === "day" ? "☾" : "☀";
  }
  function savePrefs() {
    try {
      localStorage.setItem("rm-view", JSON.stringify({ spin: spinning, flat: flatTarget >= 0.5 }));
    } catch (e) {}
  }
  function restorePrefs() {
    let v = null;
    try {
      v = JSON.parse(localStorage.getItem("rm-view") || "null");
    } catch (e) {}
    setSpin(v ? !!v.spin : !REDUCED);
    if (v && v.flat) {
      flat = flatTarget = 1;
      cam.theta = 0;
      cam.phi = 0;
      $("flatten").setAttribute("aria-pressed", "true");
      $("flatten").classList.add("active");
      $("flattenText").textContent = "3D";
    }
  }

  /* ============================================================
     utils
     ============================================================ */
  function twoDist(pts) {
    const a = [...pts.values()];
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  }
  function hexToRgb(hex) {
    const h = String(hex).replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function titleize(s) {
    return String(s || "")
      .split(" · ")
      .map((w) => w.replace(/\b([a-z])/g, (m, c) => c.toUpperCase()))
      .join(" · ");
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
  }
})();
