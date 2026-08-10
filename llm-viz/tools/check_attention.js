/**
 * Compares every self-attention tensor the page draws against the PyTorch
 * dump from check_attention.py: per-head Q/K/V slices, masked scores, softmax
 * patterns and aggregates, weighted V sums, the head-major concat order, the
 * output projection and the residual.
 *
 * Run with:  python3 llm-viz/tools/check_attention.py && node llm-viz/tools/check_attention.js
 */
const fs = require("fs");
const path = require("path");

const assets = path.join(__dirname, "..", "assets");
global.window = global;
require(path.join(assets, "model.js"));

const meta = JSON.parse(fs.readFileSync(path.join(assets, "nano-gpt.json"), "utf8"));
const buf = fs.readFileSync(path.join(assets, "nano-gpt.bin"));
const all = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const w = {};
meta.tensors.forEach((t) => {
  const n = t.shape.reduce((a, b) => a * b, 1);
  w[t.name] = { data: all.subarray(t.offset, t.offset + n), shape: t.shape };
});
const model = { meta, cfg: meta.config, w };

const ref = JSON.parse(
  fs.readFileSync(path.join(__dirname, "attention_reference.json"), "utf8")
);
const run = LV.forward(model, ref.sequence);
const { C, headSize: A, nHeads: H, blockSize: T } = model.cfg;

let worst = { err: 0, where: "none" };
let failures = 0;

function compare(where, jsVal, refVal, tol = 2e-4) {
  const jsMasked = !isFinite(jsVal);
  const refMasked = refVal === null || !isFinite(refVal);
  if (jsMasked || refMasked) {
    if (jsMasked !== refMasked) {
      failures++;
      console.error(`MASK MISMATCH at ${where}: js=${jsVal} ref=${refVal}`);
    }
    return;
  }
  const err = Math.abs(jsVal - refVal);
  if (err > worst.err) worst = { err, where };
  if (err > tol) {
    failures++;
    if (failures < 10) console.error(`VALUE MISMATCH at ${where}: js=${jsVal} ref=${refVal}`);
  }
}

for (let b = 0; b < ref.blocks.length; b++) {
  const rb = ref.blocks[b];
  const jb = run.blocks[b];
  for (let h = 0; h < H; h++) {
    const rh = rb.heads[h];
    const jh = jb.heads[h];
    for (let t = 0; t < T; t++) {
      for (let a = 0; a < A; a++) {
        compare(`b${b}.h${h}.q[${t},${a}]`, jh.q.data[t * A + a], rh.q[t][a]);
        compare(`b${b}.h${h}.k[${t},${a}]`, jh.k.data[t * A + a], rh.k[t][a]);
        compare(`b${b}.h${h}.v[${t},${a}]`, jh.v.data[t * A + a], rh.v[t][a]);
        compare(`b${b}.h${h}.out[${t},${a}]`, jh.vOut.data[t * A + a], rh.out[t][a]);
        // the wide fused slab must agree with the per-head slices it is cut from
        compare(
          `b${b}.h${h}.qkvSliceQ[${t},${a}]`,
          jb.qkv.data[t * 3 * C + h * A + a],
          rh.q[t][a]
        );
        compare(
          `b${b}.h${h}.qkvSliceK[${t},${a}]`,
          jb.qkv.data[t * 3 * C + C + h * A + a],
          rh.k[t][a]
        );
        compare(
          `b${b}.h${h}.qkvSliceV[${t},${a}]`,
          jb.qkv.data[t * 3 * C + 2 * C + h * A + a],
          rh.v[t][a]
        );
        // concat order drawn in "Head outputs combined" must be head-major
        compare(
          `b${b}.h${h}.concat[${t},${a}]`,
          jb.vCombined.data[t * C + h * A + a],
          rh.out[t][a]
        );
      }
      let rowSum = 0;
      for (let j = 0; j < T; j++) {
        compare(`b${b}.h${h}.scores[${t},${j}]`, jh.scores.data[t * T + j], rh.scores[t][j]);
        compare(`b${b}.h${h}.pattern[${t},${j}]`, jh.sm.data[t * T + j], rh.pattern[t][j]);
        const p = jh.sm.data[t * T + j];
        if (isFinite(p)) {
          rowSum += p;
          if (j > t) {
            failures++;
            console.error(`CAUSALITY VIOLATION: b${b}.h${h}.pattern[${t},${j}] is unmasked`);
          }
        }
      }
      if (Math.abs(rowSum - 1) > 1e-5) {
        failures++;
        console.error(`SOFTMAX ROW b${b}.h${h}[${t}] sums to ${rowSum}`);
      }
    }
  }
  for (let t = 0; t < T; t++) {
    for (let c = 0; c < C; c++) {
      compare(`b${b}.proj[${t},${c}]`, jb.attnProj.data[t * C + c], rb.proj[t][c]);
      compare(`b${b}.resid[${t},${c}]`, jb.attnResid.data[t * C + c], rb.resid[t][c]);
    }
  }
}

const nBlocks = ref.blocks.length;
console.log(`checked ${nBlocks} blocks x ${H} heads x T=${T}`);
console.log(`worst abs error: ${worst.err.toExponential(3)} at ${worst.where}`);
if (failures > 0) {
  console.error(`FAILED: ${failures} mismatches`);
  process.exit(1);
}
console.log("OK: attention internals match PyTorch exactly (within float32)");
