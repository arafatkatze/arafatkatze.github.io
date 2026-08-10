import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

// Wrapped in main(): no top-level await, so JS minifiers (terser without
// module mode) can process this file.
async function main() {

// ---------------------------------------------------------------- palette --
const CAT = {
  Bed:          0xf07ab8,
  Chair:        0x8bd45a,
  Table:        0xf5b942,
  Storage:      0xb48ead,
  Refrigerator: 0x5fd4d0,
  Door:         0xff8a5c,
  Window:       0x66c7ff,
  Opening:      0xb9a3ff,
  Wall:         0xaab6cc,
  Floor:        0x39415a,
};
const normCat = c => c.startsWith('Door') ? 'Door' : c;

// ------------------------------------------------------------------ setup --
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.03, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.addEventListener('start', () => { controls.autoRotate = false; });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ------------------------------------------------------------- data load --
const loadBar = document.getElementById('loadBar');
const loadMsg = document.getElementById('loadMsg');
const setLoad = (f, msg) => { loadBar.style.width = `${(f * 100) | 0}%`; if (msg) loadMsg.textContent = msg; };

async function fetchBuf(url, onProgress) {
  const res = await fetch(url);
  const total = +res.headers.get('Content-Length') || 0;
  const reader = res.body.getReader();
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    if (total && onProgress) onProgress(got / total);
  }
  const buf = new Uint8Array(got); let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  return buf.buffer;
}

const meta = await (await fetch('./data/meta.json')).json();
const layout = await (await fetch('./data/layout.json')).json();
const traj = await (await fetch('./data/trajectory.json')).json();
setLoad(0.05, 'loading point cloud…');
const posBuf = await fetchBuf('./data/points.bin', f => setLoad(0.05 + f * 0.75));
setLoad(0.8, 'loading colors…');
const colBuf = await fetchBuf('./data/colors.bin', f => setLoad(0.8 + f * 0.15));
setLoad(0.96, 'building scene…');
await new Promise(r => setTimeout(r, 30));

const bmin = new THREE.Vector3(...meta.bounds.min);
const bmax = new THREE.Vector3(...meta.bounds.max);
const center = bmin.clone().add(bmax).multiplyScalar(0.5);
const span = bmax.clone().sub(bmin).length();

// ------------------------------------------------------------ point cloud --
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posBuf), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(colBuf), 3, true));
geo.boundingSphere = new THREE.Sphere(center.clone(), span / 2);

const ptMat = new THREE.ShaderMaterial({
  uniforms: {
    uSize:  { value: 2.1 },
    uMode:  { value: 0 },              // 0 rgb · 1 height · 2 x-ray
    uYMin:  { value: bmin.y },
    uYMax:  { value: bmax.y },
    uPx:    { value: renderer.getPixelRatio() },
    uCutY:  { value: bmax.y },         // hide points above this height (ceiling peel)
  },
  transparent: true,
  depthWrite: true,
  vertexColors: true,
  vertexShader: /* glsl */`
    uniform float uSize, uYMin, uYMax, uPx, uCutY;
    uniform int uMode;
    varying vec3 vColor;
    varying float vFade;

    vec3 ramp(float t) {              // teal -> blue -> violet -> amber
      t = clamp(t, 0.0, 1.0);
      vec3 a = vec3(0.12, 0.65, 0.62);
      vec3 b = vec3(0.25, 0.42, 0.90);
      vec3 c = vec3(0.72, 0.44, 0.94);
      vec3 d = vec3(1.00, 0.76, 0.35);
      return t < 0.34 ? mix(a, b, t / 0.34)
           : t < 0.67 ? mix(b, c, (t - 0.34) / 0.33)
                      : mix(c, d, (t - 0.67) / 0.33);
    }

    void main() {
      float h = (position.y - uYMin) / (uYMax - uYMin);
      if (uMode == 0)      vColor = color;
      else if (uMode == 1) vColor = ramp(h);
      else                 vColor = mix(vec3(0.35, 0.75, 0.72), vec3(0.85, 0.95, 1.0), h);
      vFade = uMode == 2 ? 0.28 : 1.0;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(uSize * uPx * (2.6 / -mv.z), 1.0, 22.0 * uPx);
      gl_Position = projectionMatrix * mv;
      if (position.y > uCutY) gl_Position = vec4(2.0, 2.0, 2.0, 0.0);  // clipped: ceiling peel
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vFade;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float r2 = dot(p, p);
      if (r2 > 1.0) discard;
      float a = vFade * smoothstep(1.0, 0.55, r2);
      gl_FragColor = vec4(vColor, a);
    }`,
});
const points = new THREE.Points(geo, ptMat);
scene.add(points);

// -------------------------------------------------------------- room plan --
const layoutGroup = new THREE.Group();
const labelGroup = new THREE.Group();
scene.add(layoutGroup, labelGroup);

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitEdges = new THREE.EdgesGeometry(unitBox);

function makeLabel(text, colorHex) {
  const pad = 26, fs = 44;
  const cv = document.createElement('canvas');
  const cx = cv.getContext('2d');
  cx.font = `600 ${fs}px -apple-system, "SF Pro Text", sans-serif`;
  const w = Math.ceil(cx.measureText(text).width) + pad * 2, h = 78;
  cv.width = w; cv.height = h;
  const r = h / 2;
  cx.beginPath();
  cx.roundRect(1, 1, w - 2, h - 2, r);
  cx.fillStyle = 'rgba(8, 11, 18, 0.82)';
  cx.fill();
  cx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
  cx.lineWidth = 3;
  cx.stroke();
  cx.font = `600 ${fs}px -apple-system, "SF Pro Text", sans-serif`;
  cx.fillStyle = '#eef1f7';
  cx.textBaseline = 'middle';
  cx.fillText(text, pad, h / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  const scale = 0.0035;
  sp.scale.set(w * scale, h * scale, 1);
  return sp;
}

for (const e of layout) {
  const cat = normCat(e.category);
  const color = CAT[cat] ?? 0xffffff;
  const isArch = cat === 'Wall' || cat === 'Floor';
  const isPortal = cat === 'Door' || cat === 'Window' || cat === 'Opening';

  if (e.kind === 'cube') {
    const M = new THREE.Matrix4().fromArray(e.matrix);

    const fill = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({
      color, transparent: true,
      opacity: isArch ? 0.035 : isPortal ? 0.10 : 0.07,
      depthWrite: false, side: THREE.DoubleSide,
    }));
    fill.matrixAutoUpdate = false; fill.matrix.copy(M);
    layoutGroup.add(fill);

    const edgeMat = cat === 'Opening'
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0.9, dashSize: 0.09, gapSize: 0.055 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: isArch ? 0.38 : 0.92 });
    const edges = new THREE.LineSegments(unitEdges, edgeMat);
    edges.matrixAutoUpdate = false; edges.matrix.copy(M);
    if (cat === 'Opening') {
      // dashed material needs line distances in world scale; bake the matrix into the geometry
      edges.geometry = unitEdges.clone().applyMatrix4(M);
      edges.matrix.identity();
      edges.computeLineDistances();
    }
    layoutGroup.add(edges);

    if (!isArch) {
      const F = new THREE.Matrix4().fromArray(e.frame);
      const p = new THREE.Vector3().setFromMatrixPosition(F);
      const label = makeLabel(cat, color);
      label.position.set(p.x, p.y + e.dims[1] / 2 + 0.14, p.z);
      label.renderOrder = 50;
      labelGroup.add(label);
    }
  } else {
    // floor mesh
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array(e.points.flat());
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setIndex(e.indices);
    const M = new THREE.Matrix4().fromArray(e.matrix);
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0x2c3350, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide,
    }));
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(M);
    layoutGroup.add(mesh);
  }
}

// ------------------------------------------- photoreal scan mesh (TSDF) ----
const applyCeilingRef = { fn: () => {} };      // filled once UI section runs
renderer.localClippingEnabled = true;
const scanGroup = new THREE.Group();
scene.add(scanGroup);
const ceilPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);  // set below
let scanMat = null;
new PLYLoader().load('./data/scan_mesh.ply', geo => {
  geo.computeVertexNormals();
  // FrontSide only: wall faces point into the room, so camera-facing walls
  // vanish automatically and you always look INTO the room, never at its shell
  scanMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(geo, scanMat);
  scanGroup.add(mesh);
  applyCeilingRef.fn($('tCeiling').checked);   // apply current ceiling state
});

// ------------------------------------------------- dollhouse mesh (GLB) ----
const meshGroup = new THREE.Group();
scene.add(meshGroup);

// lights for the reconstruction (points use their own shader)
const hemi = new THREE.HemisphereLight(0xcfd8e8, 0x3a3228, 1.15);
scene.add(hemi);
const winE = layout.find(e => e.category === 'Window');
const winM = new THREE.Matrix4().fromArray(winE.frame);
const winPos = new THREE.Vector3().setFromMatrixPosition(winM);
let winN = new THREE.Vector3(0, 0, 1).transformDirection(winM);
if (winN.dot(center.clone().sub(winPos)) < 0) winN.negate();   // points into room
const sunDir = new THREE.DirectionalLight(0xfff0dc, 2.2);
sunDir.position.copy(winPos).addScaledVector(winN, -2.5).add(new THREE.Vector3(0, 3.2, 0));
sunDir.target.position.copy(center);
sunDir.castShadow = true;
sunDir.shadow.mapSize.set(2048, 2048);
sunDir.shadow.camera.left = sunDir.shadow.camera.bottom = -5;
sunDir.shadow.camera.right = sunDir.shadow.camera.top = 5;
sunDir.shadow.bias = -0.0004;
scene.add(sunDir, sunDir.target);

// wall peel bookkeeping: exterior normal + position per wall (ARKit coords)
const wallPeel = [];   // {pos, next, nodes: []}
for (const e of layout.filter(x => x.category === 'Wall')) {
  const F = new THREE.Matrix4().fromArray(e.frame);
  const pos = new THREE.Vector3().setFromMatrixPosition(F);
  const z = new THREE.Vector3(0, 0, 1).transformDirection(F);
  const inward = z.dot(center.clone().sub(pos)) > 0 ? 1 : -1;
  const next = z.multiplyScalar(-inward);                       // exterior normal
  wallPeel.push({ name: e.name, pos, next, nodes: [] });
}
let ceilingNode = null;
const wallTopY = Math.max(...layout.filter(e => e.category === 'Wall')
  .map(e => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(e.frame)).y + e.dims[1] / 2));

new GLTFLoader().load('./data/room.glb', gltf => {
  gltf.scene.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  gltf.scene.traverse(o => {
    const m = o.name.match(/^Wall(\d)/);
    if (m) {
      const wp = wallPeel.find(w => w.name === `Wall${m[1]}`);
      if (wp) wp.nodes.push(o);
    }
    if (o.name === 'Ceiling') ceilingNode = o;
  });
  meshGroup.add(gltf.scene);
});

// subtle ground grid just below the floor
const grid = new THREE.GridHelper(16, 64, 0x223046, 0x141c2c);
grid.material.transparent = true;
grid.material.opacity = 0.55;
grid.position.set(center.x, bmin.y - 0.03, center.z);
scene.add(grid);

// ------------------------------------------------------------- trajectory --
const trajGroup = new THREE.Group();
scene.add(trajGroup);

const trajPts = traj.map(t => new THREE.Vector3(...t.position));
const curve = new THREE.CatmullRomCurve3(trajPts, false, 'centripetal', 0.5);
const N = 600;
const linePos = new Float32Array(N * 3);
const lineCol = new Float32Array(N * 3);
const cA = new THREE.Color(0x2dd4bf), cB = new THREE.Color(0x818cf8), cC = new THREE.Color(0xf472b6);
for (let i = 0; i < N; i++) {
  const t = i / (N - 1);
  const p = curve.getPoint(t);
  linePos.set([p.x, p.y, p.z], i * 3);
  const c = t < 0.5 ? cA.clone().lerp(cB, t * 2) : cB.clone().lerp(cC, (t - 0.5) * 2);
  lineCol.set([c.r, c.g, c.b], i * 3);
}
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
trajGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, opacity: 0.85,
})));

// small camera frusta along the path
const frMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
for (let i = 0; i < traj.length; i += 9) {
  const M = new THREE.Matrix4().fromArray(traj[i].matrix);
  const d = 0.13, w = d * 0.72, h = d * 0.54;
  const o = [0, 0, 0], tl = [-w, h, -d], tr = [w, h, -d], br = [w, -h, -d], bl = [-w, -h, -d];
  const segs = [o, tl, o, tr, o, br, o, bl, tl, tr, tr, br, br, bl, bl, tl].flat();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
  const fr = new THREE.LineSegments(g, frMat);
  fr.matrixAutoUpdate = false; fr.matrix.copy(M);
  trajGroup.add(fr);
}

// glowing marker that rides the path while idle
const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.028, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x6ee7d8 }),
);
const markerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const cx = cv.getContext('2d');
    const gr = cx.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(110,231,216,0.9)');
    gr.addColorStop(1, 'rgba(110,231,216,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })(),
  transparent: true, depthWrite: false,
}));
markerGlow.scale.set(0.22, 0.22, 1);
marker.add(markerGlow);
trajGroup.add(marker);

// ------------------------------------------------------------------- UI ----
document.getElementById('stats').innerHTML =
  `<b>${meta.count.toLocaleString()}</b> points · <b>${meta.frames}</b> RGB-D frames · RoomPlan layout`;

const legend = document.getElementById('legend');
for (const [name, hex] of Object.entries(CAT)) {
  if (name === 'Wall' || name === 'Floor') continue;
  const s = document.createElement('span');
  s.innerHTML = `<i style="background:#${hex.toString(16).padStart(6, '0')}"></i>${name}`;
  legend.appendChild(s);
}

const $ = id => document.getElementById(id);

// ceiling peel: cut just below the wall tops for the classic dollhouse view
const wallTop = Math.max(...layout.filter(e => normCat(e.category) === 'Wall')
  .map(e => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(e.frame)).y + e.dims[1] / 2));
const CUT_Y = wallTop - 0.5;
ceilPlane.constant = CUT_Y;                    // keeps points/mesh below y = CUT_Y
const applyCeiling = show => {
  ptMat.uniforms.uCutY.value = show ? bmax.y + 1 : CUT_Y;
  if (scanMat) scanMat.clippingPlanes = show ? [] : [ceilPlane];
};
applyCeilingRef.fn = applyCeiling;
applyCeiling(false);
$('tCeiling').onchange = e => applyCeiling(e.target.checked);

points.visible = $('tPoints').checked;
scanGroup.visible = $('tScan').checked;
meshGroup.visible = $('tMesh').checked;
$('tPoints').onchange = e => points.visible = e.target.checked;
$('tScan').onchange = e => scanGroup.visible = e.target.checked;
$('tMesh').onchange = e => meshGroup.visible = e.target.checked;
$('tLayout').onchange = e => layoutGroup.visible = e.target.checked;
$('tLabels').onchange = e => labelGroup.visible = e.target.checked;
$('tTraj').onchange = e => trajGroup.visible = e.target.checked;
$('ptSize').oninput = e => ptMat.uniforms.uSize.value = +e.target.value;

const modeBtns = [$('mRGB'), $('mHeight'), $('mX-ray')];
modeBtns.forEach((b, i) => b.onclick = () => {
  modeBtns.forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  ptMat.uniforms.uMode.value = i;
});

// ------------------------------------------------------------ fly-through --
const flyBtn = $('flyBtn');
const frameHud = $('frameHud');
let flying = false, flyT = 0;
const savedCam = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), target: new THREE.Vector3() };
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const pa = new THREE.Vector3(), pb = new THREE.Vector3();
const trajMats = traj.map(t => new THREE.Matrix4().fromArray(t.matrix));

flyBtn.onclick = () => {
  flying = !flying;
  if (flying) {
    savedCam.pos.copy(camera.position);
    savedCam.quat.copy(camera.quaternion);
    savedCam.target.copy(controls.target);
    controls.enabled = false;
    flyT = 0;
    applyCeiling(true);               // full room while inside it
    flyBtn.textContent = '■  Stop fly-through';
    flyBtn.classList.add('stop');
    frameHud.style.display = 'block';
  } else {
    controls.enabled = true;
    applyCeiling($('tCeiling').checked);
    camera.position.copy(savedCam.pos);
    camera.quaternion.copy(savedCam.quat);
    controls.target.copy(savedCam.target);
    flyBtn.innerHTML = '▶&nbsp; Fly through scan';
    flyBtn.classList.remove('stop');
    frameHud.style.display = 'none';
  }
};
addEventListener('keydown', e => { if (e.key === 'Escape' && flying) flyBtn.onclick(); });

// -------------------------------------------------------------- main loop --
camera.position.set(center.x + span * 0.62, bmax.y + span * 0.42, center.z + span * 0.62);
controls.target.copy(center).setY(center.y - 0.25);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (flying) {
    flyT += dt * 9;                        // ~9 recorded poses per second
    const n = traj.length;
    if (flyT >= n - 1) flyT -= n - 1;
    const i = Math.floor(flyT), f = flyT - i;
    pa.setFromMatrixPosition(trajMats[i]);
    pb.setFromMatrixPosition(trajMats[i + 1]);
    qa.setFromRotationMatrix(trajMats[i]);
    qb.setFromRotationMatrix(trajMats[i + 1]);
    camera.position.lerpVectors(pa, pb, f);
    camera.quaternion.slerpQuaternions(qa, qb, f);
    frameHud.textContent = `frame ${String(i).padStart(3, '0')} / ${n}`;
  } else {
    controls.update();
    const mt = (t * 0.055) % 1;
    marker.position.copy(curve.getPoint(mt));
  }

  // dollhouse peel: hide walls the camera looks over, show ceiling only from inside
  if (meshGroup.visible) {
    const tmp = new THREE.Vector3();
    for (const wp of wallPeel) {
      const facing = wp.next.dot(tmp.copy(camera.position).sub(wp.pos)) > 0.1;
      for (const n of wp.nodes) n.visible = !facing;
    }
    if (ceilingNode) ceilingNode.visible = camera.position.y < wallTopY - 0.05;
  }

  renderer.render(scene, camera);
}
tick();
document.getElementById('loader').classList.add('done');

}
main();
