/**
 * Checks the browser forward pass against the PyTorch reference dump.
 * Run with: node llm-viz/tools/check_js_forward.js
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

const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "reference.json"), "utf8"));

const seq = LV.generate(model, ref.prompt);
const run = LV.forward(model, seq);

let maxErr = 0;
for (let r = 0; r < ref.logits.length; r++) {
  for (let c = 0; c < ref.logits[r].length; c++) {
    maxErr = Math.max(maxErr, Math.abs(run.logits.data[r * 3 + c] - ref.logits[r][c]));
  }
}

const letters = "ABC";
console.log("torch sequence:", ref.sequence.map((i) => letters[i]).join(""));
console.log("js    sequence:", seq.map((i) => letters[i]).join(""));
console.log("max logit error:", maxErr.toExponential(3));

const seqOk = JSON.stringify(seq) === JSON.stringify(ref.sequence);
if (!seqOk || maxErr > 1e-3) {
  console.error("MISMATCH");
  process.exit(1);
}
console.log("OK");
