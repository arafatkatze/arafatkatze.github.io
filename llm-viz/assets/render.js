/**
 * llm-viz renderer (WebGL2).
 *
 * Three programs do all the work:
 *   - blocks: one instanced unit cube per tensor. The fragment shader turns
 *     the face-local position into a cell index, looks the number up in a
 *     float texture and colours it, drawing the grid only while cells are
 *     bigger than a few pixels so huge models degrade into solid slabs.
 *   - beams: screen-space-thickened lines for the connections between stages.
 *   - post: an optional bright-pass + separable blur for the glow.
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});
  var TEX_W = 2048;

  var BLOCK_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aCorner;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 i0;   // pos.xyz, dataOffset
layout(location=3) in vec4 i1;   // size.xyz, valueScale
layout(location=4) in vec4 i2;   // cells.xyz, rowsUsed
layout(location=5) in vec4 i3;   // color.rgb, dim
layout(location=6) in vec4 i4;   // highlight A: kind, lo, hi, strength
layout(location=7) in vec4 i5;   // highlight B
layout(location=8) in vec4 i6;   // emphasis, hiMode, flags, seed

uniform mat4 uViewProj;
uniform vec3 uEye;

out vec3 vLocal;
flat out vec3 vNormal;
out vec3 vWorld;
flat out vec4 vI0;
flat out vec4 vI1;
flat out vec4 vI2;
flat out vec4 vI3;
flat out vec4 vI4;
flat out vec4 vI5;
flat out vec4 vI6;

void main() {
  vec3 world = i0.xyz + aCorner * i1.xyz;
  gl_Position = uViewProj * vec4(world, 1.0);
  vLocal = aCorner;
  vNormal = aNormal;
  vWorld = world;
  vI0 = i0; vI1 = i1; vI2 = i2; vI3 = i3; vI4 = i4; vI5 = i5; vI6 = i6;
}`;

  var BLOCK_FS = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec3 vLocal;
flat in vec3 vNormal;
in vec3 vWorld;
flat in vec4 vI0;
flat in vec4 vI1;
flat in vec4 vI2;
flat in vec4 vI3;
flat in vec4 vI4;
flat in vec4 vI5;
flat in vec4 vI6;

uniform sampler2D uValues;
uniform int uTexW;
uniform vec3 uEye;
uniform vec3 uFog;
uniform float uTime;
uniform float uGridFade;

out vec4 outColor;

const float MASKED = -1.0e29;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

vec3 palette(float t) {
  float a = clamp(abs(t), 0.0, 1.0);
  a = pow(a, 0.65);
  vec3 base = vec3(0.055, 0.072, 0.105);
  vec3 cPos = vec3(1.00, 0.52, 0.20);
  vec3 cNeg = vec3(0.16, 0.58, 1.00);
  vec3 c = base + (t >= 0.0 ? cPos : cNeg) * a;
  c = mix(c, vec3(1.0, 0.96, 0.9), smoothstep(0.72, 1.0, a) * 0.45);
  return c;
}

float rangeHit(vec4 hi, vec3 cell) {
  int kind = int(hi.x + 0.5);
  if (kind == 0) return 0.0;
  float v = kind == 1 ? cell.x : (kind == 2 ? cell.y : cell.z);
  return (v >= hi.y && v < hi.z) ? 1.0 : 0.0;
}

void main() {
  vec3 cells = max(vI2.xyz, vec3(1.0));
  vec3 n = abs(vNormal);

  vec2 uv; vec2 cnt; vec3 cell;
  if (n.y > 0.5) {
    uv = vec2(vLocal.x, vLocal.z); cnt = vec2(cells.x, cells.z);
    cell = vec3(floor(uv.x * cnt.x), vNormal.y > 0.0 ? 0.0 : cells.y - 1.0, floor(uv.y * cnt.y));
  } else if (n.x > 0.5) {
    uv = vec2(vLocal.z, 1.0 - vLocal.y); cnt = vec2(cells.z, cells.y);
    cell = vec3(vNormal.x > 0.0 ? cells.x - 1.0 : 0.0, floor(uv.y * cnt.y), floor(uv.x * cnt.x));
  } else {
    uv = vec2(vLocal.x, 1.0 - vLocal.y); cnt = vec2(cells.x, cells.y);
    cell = vec3(floor(uv.x * cnt.x), floor(uv.y * cnt.y), vNormal.z > 0.0 ? 0.0 : cells.z - 1.0);
  }
  cell = min(cell, cells - 1.0);

  bool hasData = vI0.w >= 0.0;
  float value = 0.0;
  bool masked = false;
  if (hasData) {
    int idx = int(vI0.w) + int((cell.y * cells.z + cell.z) * cells.x + cell.x);
    ivec2 tc = ivec2(idx % uTexW, idx / uTexW);
    value = texelFetch(uValues, tc, 0).r;
    masked = value < MASKED;
  }

  vec3 col;
  if (hasData && !masked) {
    // sign and magnitude carry the colour; the block's own hue is only a hint
    col = palette(value * vI1.w);
    col = mix(col, col * (0.55 + vI3.rgb), 0.16);
  } else if (masked) {
    col = vec3(0.035, 0.042, 0.06);
  } else {
    // no values to show (the billion-parameter models): a hint of texture
    // that dissolves into a flat slab once cells stop being resolvable
    float h = hash(cell + vI6.w);
    vec2 fw0 = fwidth(uv * cnt);
    float px0 = 1.0 / max(max(fw0.x, fw0.y), 1e-6);
    col = vI3.rgb * mix(0.5, 0.32 + 0.5 * h, smoothstep(1.0, 5.0, px0));
  }

  // rows beyond the ones the model actually ran are shown as empty slots
  if (cell.z >= vI2.w) {
    col = mix(vec3(0.07, 0.08, 0.11), col, 0.12);
  }

  // grid, faded out once cells stop being resolvable
  vec2 cellUV = uv * cnt;
  vec2 fw = fwidth(cellUV);
  float px = 1.0 / max(max(fw.x, fw.y), 1e-6);
  float gridVis = smoothstep(2.0, 6.0, px) * uGridFade;
  if (gridVis > 0.001) {
    vec2 f = abs(fract(cellUV) - 0.5);
    vec2 d = (0.5 - f) / max(fw, vec2(1e-6));
    float line = 1.0 - smoothstep(0.0, 1.2, min(d.x, d.y));
    col = mix(col, col * 0.42, line * gridVis * 0.85);
  }

  // face shading
  vec3 nrm = normalize(vNormal);
  float lambert = 0.70 + 0.34 * max(dot(nrm, normalize(vec3(0.30, 0.92, 0.26))), 0.0);
  if (nrm.y < -0.5) lambert *= 0.62;
  col *= lambert;

  // the block's own outline, tinted with its category colour
  vec2 edge = min(uv, 1.0 - uv) * cnt;
  float ew = 1.0 - smoothstep(0.0, 1.6, min(edge.x, edge.y) / max(max(fw.x, fw.y), 1e-6));
  col = mix(col, col * 0.45 + vI3.rgb * 0.75, ew * 0.7);

  // highlights
  float a = rangeHit(vI4, cell) * vI4.w;
  float b = rangeHit(vI5, cell) * vI5.w;
  float hi = vI6.y > 0.5 ? min(a, b) : max(a, b);
  if (hi > 0.001) {
    // Provenance has to remain legible on both dark activations and bright
    // weights. Use an emissive gold/white override rather than a subtle tint;
    // the gentle pulse distinguishes it from a naturally large positive cell.
    float pulse = 0.92 + 0.08 * sin(uTime * 4.5);
    vec3 glow = vec3(1.75, 1.32, 0.48) * pulse;
    col = mix(col, glow, 0.55 + 0.45 * clamp(hi, 0.0, 1.0));
  }

  // emphasis: a soft outward glow used by the walkthrough
  float emph = vI6.x;
  if (emph > 0.001) {
    col += vec3(0.16, 0.30, 0.52) * emph * (0.4 + 0.6 * ew);
  }

  col = mix(col, uFog, clamp(vI3.w, 0.0, 1.0));
  outColor = vec4(col, 1.0);
}`;

  var BEAM_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;      // (along, side)
layout(location=1) in vec4 b0;           // start.xyz, width
layout(location=2) in vec4 b1;           // end.xyz, speed
layout(location=3) in vec4 b2;           // color.rgb, alpha

uniform mat4 uViewProj;
uniform vec2 uViewport;

out float vSide;
out float vAlong;
flat out vec4 vColor;
flat out float vSpeed;

void main() {
  vec4 pa = uViewProj * vec4(b0.xyz, 1.0);
  vec4 pb = uViewProj * vec4(b1.xyz, 1.0);
  // keep the segment in front of the eye
  if (pa.w <= 0.001) pa = mix(pa, pb, (0.001 - pa.w) / (pb.w - pa.w + 1e-6));
  if (pb.w <= 0.001) pb = mix(pb, pa, (0.001 - pb.w) / (pa.w - pb.w + 1e-6));
  vec2 sa = pa.xy / pa.w * uViewport * 0.5;
  vec2 sb = pb.xy / pb.w * uViewport * 0.5;
  vec2 dir = sb - sa;
  float len = max(length(dir), 1e-5);
  vec2 nrm = vec2(-dir.y, dir.x) / len;
  vec4 clip = mix(pa, pb, aCorner.x);
  float w = pa.w * (1.0 - aCorner.x) + pb.w * aCorner.x;
  vec2 offset = nrm * aCorner.y * b0.w;
  clip.xy += offset / (uViewport * 0.5) * w;
  gl_Position = clip;
  vSide = aCorner.y;
  vAlong = aCorner.x * len / 90.0;
  vColor = b2;
  vSpeed = b1.w;
}`;

  var BEAM_FS = `#version 300 es
precision highp float;
in float vSide;
in float vAlong;
flat in vec4 vColor;
flat in float vSpeed;
uniform float uTime;
out vec4 outColor;

void main() {
  float core = 1.0 - smoothstep(0.15, 1.0, abs(vSide));
  float pulse = 1.0;
  if (vSpeed > 0.0) {
    float f = fract(vAlong - uTime * vSpeed);
    pulse = 0.45 + 0.85 * smoothstep(0.55, 1.0, 1.0 - abs(f - 0.5) * 2.0);
  }
  float a = vColor.a * core * pulse;
  outColor = vec4(vColor.rgb * (0.7 + 0.6 * core) * pulse, a);
}`;

  var QUAD_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  var BG_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uTop;
uniform vec3 uBottom;
out vec4 outColor;
void main() {
  vec3 c = mix(uBottom, uTop, pow(vUv.y, 0.85));
  vec2 d = vUv - vec2(0.5, 0.52);
  c *= 1.0 - 0.55 * dot(d, d);
  outColor = vec4(c, 1.0);
}`;

  var BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uThreshold;
out vec4 outColor;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float k = smoothstep(uThreshold, uThreshold + 0.45, l);
  outColor = vec4(c * k, 1.0);
}`;

  var BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 outColor;
void main() {
  vec3 sum = texture(uTex, vUv).rgb * 0.227027;
  sum += (texture(uTex, vUv + uDir * 1.3846).rgb + texture(uTex, vUv - uDir * 1.3846).rgb) * 0.316216;
  sum += (texture(uTex, vUv + uDir * 3.2308).rgb + texture(uTex, vUv - uDir * 3.2308).rgb) * 0.070270;
  outColor = vec4(sum, 1.0);
}`;

  var COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomAmount;
out vec4 outColor;
void main() {
  vec3 c = (texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomAmount) * 1.18;
  c = c / (c + vec3(0.85)) * 1.34;             // gentle tonemap
  c = pow(max(c, 0.0), vec3(0.94));
  outColor = vec4(c, 1.0);
}`;

  // --------------------------------------------------------------- geometry

  function cubeGeometry() {
    var faces = [
      [[0, 1, 0], [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
      [[0, -1, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]],
      [[1, 0, 0], [1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]],
      [[-1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
      [[0, 0, 1], [0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]],
      [[0, 0, -1], [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
    ];
    var pos = [],
      nrm = [],
      idx = [];
    faces.forEach(function (f, fi) {
      var n = f[0];
      for (var v = 1; v <= 4; v++) {
        pos.push(f[v][0], f[v][1], f[v][2]);
        nrm.push(n[0], n[1], n[2]);
      }
      var b = fi * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    return {
      pos: new Float32Array(pos),
      nrm: new Float32Array(nrm),
      idx: new Uint16Array(idx),
    };
  }

  var FLOATS_PER_BLOCK = 28;
  var FLOATS_PER_BEAM = 12;

  function Renderer(canvas) {
    var gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 is required for this visualization.");
    this.gl = gl;
    this.canvas = canvas;
    this.bloomAmount = 0.85;
    this.gridFade = 1;

    this.blockProg = LV.gl.program(gl, BLOCK_VS, BLOCK_FS, "block");
    this.beamProg = LV.gl.program(gl, BEAM_VS, BEAM_FS, "beam");
    this.bgProg = LV.gl.program(gl, QUAD_VS, BG_FS, "bg");
    this.brightProg = LV.gl.program(gl, QUAD_VS, BRIGHT_FS, "bright");
    this.blurProg = LV.gl.program(gl, QUAD_VS, BLUR_FS, "blur");
    this.compProg = LV.gl.program(gl, QUAD_VS, COMPOSITE_FS, "composite");

    var cube = cubeGeometry();
    this.blockVao = gl.createVertexArray();
    gl.bindVertexArray(this.blockVao);
    var pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, cube.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    var nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, cube.nrm, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.idx, gl.STATIC_DRAW);
    this.blockInstBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.blockInstBuf);
    for (var i = 0; i < 7; i++) {
      var loc = 2 + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, FLOATS_PER_BLOCK * 4, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);

    this.beamVao = gl.createVertexArray();
    gl.bindVertexArray(this.beamVao);
    var quad = new Float32Array([0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1]);
    var qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.beamInstBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.beamInstBuf);
    for (i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(1 + i);
      gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, FLOATS_PER_BEAM * 4, i * 16);
      gl.vertexAttribDivisor(1 + i, 1);
    }
    gl.bindVertexArray(null);

    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);
    var fq = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fq);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.valueTex = gl.createTexture();
    this.floatRender = !!(
      gl.getExtension("EXT_color_buffer_float") ||
      gl.getExtension("EXT_color_buffer_half_float")
    );
    this.msaa = gl.getParameter(gl.MAX_SAMPLES) >= 4 ? 4 : 0;
    this.fbo = {};
    this.size = [0, 0];
    this.depthRb = null;
    this.depthSize = [0, 0];
  }

  Renderer.prototype.uploadValues = function (pool) {
    var gl = this.gl;
    var h = Math.max(1, Math.ceil(pool.length / TEX_W));
    var padded = new Float32Array(TEX_W * h);
    padded.set(pool);
    gl.bindTexture(gl.TEXTURE_2D, this.valueTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, TEX_W, h, 0, gl.RED, gl.FLOAT, padded);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  // ----------------------------------------------------------- framebuffers

  Renderer.prototype.resize = function (w, h) {
    if (this.size[0] === w && this.size[1] === h) return;
    this.size = [w, h];
    var gl = this.gl;
    var f = this.fbo;
    Object.keys(f).forEach(function (k) {
      var o = f[k];
      if (o.fb) gl.deleteFramebuffer(o.fb);
      if (o.tex) gl.deleteTexture(o.tex);
      if (o.rb) gl.deleteRenderbuffer(o.rb);
      if (o.depth) gl.deleteRenderbuffer(o.depth);
    });
    this.fbo = {};
    if (!this.floatRender) return;

    var type = gl.getExtension("EXT_color_buffer_float") ? gl.RGBA16F : gl.RGBA16F;
    this.fbo.scene = this.makeTarget(w, h, type);
    if (this.msaa) this.fbo.ms = this.makeMultisample(w, h, type);
    var bw = Math.max(2, w >> 2),
      bh = Math.max(2, h >> 2);
    this.fbo.bright = this.makeTarget(bw, bh, type);
    this.fbo.blurA = this.makeTarget(bw, bh, type);
    this.fbo.blurB = this.makeTarget(bw, bh, type);
  };

  Renderer.prototype.makeTarget = function (w, h, internal) {
    var gl = this.gl;
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb: fb, tex: tex, w: w, h: h };
  };

  Renderer.prototype.makeMultisample = function (w, h, internal) {
    var gl = this.gl;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    var rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.msaa, internal, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
    var depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.msaa, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) {
      gl.deleteFramebuffer(fb);
      return null;
    }
    return { fb: fb, rb: rb, depth: depth, w: w, h: h };
  };

  Renderer.prototype.ensureDepth = function (w, h) {
    var gl = this.gl;
    if (this.depthRb && this.depthSize[0] === w && this.depthSize[1] === h) return;
    if (this.depthRb) gl.deleteRenderbuffer(this.depthRb);
    this.depthRb = gl.createRenderbuffer();
    this.depthSize = [w, h];
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    if (this.fbo.scene) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.scene.fb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  };

  // ---------------------------------------------------------------- drawing

  Renderer.prototype.draw = function (opts) {
    var gl = this.gl;
    var w = this.canvas.width,
      h = this.canvas.height;
    this.resize(w, h);
    this.ensureDepth(w, h);

    var usePost = this.floatRender && this.fbo.scene && this.bloomAmount > 0;
    var target = usePost ? (this.fbo.ms ? this.fbo.ms.fb : this.fbo.scene.fb) : null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // background gradient
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.bgProg.prog);
    gl.uniform3fv(this.bgProg.u.uTop, opts.bgTop);
    gl.uniform3fv(this.bgProg.u.uBottom, opts.bgBottom);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // blocks
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.useProgram(this.blockProg.prog);
    gl.uniformMatrix4fv(this.blockProg.u.uViewProj, false, opts.viewProj);
    gl.uniform3fv(this.blockProg.u.uEye, opts.eye);
    gl.uniform3fv(this.blockProg.u.uFog, opts.fog);
    gl.uniform1f(this.blockProg.u.uTime, opts.time);
    gl.uniform1f(this.blockProg.u.uGridFade, this.gridFade);
    gl.uniform1i(this.blockProg.u.uTexW, TEX_W);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.valueTex);
    gl.uniform1i(this.blockProg.u.uValues, 0);
    gl.bindVertexArray(this.blockVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.blockInstBuf);
    gl.bufferData(gl.ARRAY_BUFFER, opts.blockData, gl.DYNAMIC_DRAW);
    gl.drawElementsInstanced(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, opts.blockCount);

    // beams on top, additively
    if (opts.beamCount > 0) {
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.useProgram(this.beamProg.prog);
      gl.uniformMatrix4fv(this.beamProg.u.uViewProj, false, opts.viewProj);
      gl.uniform2f(this.beamProg.u.uViewport, w, h);
      gl.uniform1f(this.beamProg.u.uTime, opts.time);
      gl.bindVertexArray(this.beamVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.beamInstBuf);
      gl.bufferData(gl.ARRAY_BUFFER, opts.beamData, gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, opts.beamCount);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    if (!usePost) {
      gl.bindVertexArray(null);
      return;
    }

    if (this.fbo.ms) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo.ms.fb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.scene.fb);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }

    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.quadVao);
    var bright = this.fbo.bright;
    gl.bindFramebuffer(gl.FRAMEBUFFER, bright.fb);
    gl.viewport(0, 0, bright.w, bright.h);
    gl.useProgram(this.brightProg.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbo.scene.tex);
    gl.uniform1i(this.brightProg.u.uTex, 0);
    gl.uniform1f(this.brightProg.u.uThreshold, 0.62);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    var a = this.fbo.blurA,
      b = this.fbo.blurB;
    var chain = [
      [bright, a, 1, 0],
      [a, b, 0, 1],
      [b, a, 1, 0],
      [a, b, 0, 1],
    ];
    gl.useProgram(this.blurProg.prog);
    gl.uniform1i(this.blurProg.u.uTex, 0);
    for (var i = 0; i < chain.length; i++) {
      var from = chain[i][0],
        to = chain[i][1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb);
      gl.viewport(0, 0, to.w, to.h);
      gl.bindTexture(gl.TEXTURE_2D, from.tex);
      gl.uniform2f(this.blurProg.u.uDir, chain[i][2] / to.w, chain[i][3] / to.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    var src = b;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.compProg.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbo.scene.tex);
    gl.uniform1i(this.compProg.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.compProg.u.uBloom, 1);
    gl.uniform1f(this.compProg.u.uBloomAmount, this.bloomAmount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null);
  };

  Renderer.FLOATS_PER_BLOCK = FLOATS_PER_BLOCK;
  Renderer.FLOATS_PER_BEAM = FLOATS_PER_BEAM;
  LV.Renderer = Renderer;
})(window);
