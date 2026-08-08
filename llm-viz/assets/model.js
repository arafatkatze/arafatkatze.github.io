/**
 * llm-viz model layer.
 *
 * Holds the shapes of the four models on display, and a complete forward pass
 * of the trained nano-GPT written in plain JS. The forward pass keeps every
 * intermediate tensor around — that is the whole point, since the renderer
 * draws them.
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});

  // ------------------------------------------------------------ model zoo

  LV.MODELS = [
    {
      id: "nano-gpt",
      name: "nano-gpt",
      T: 11,
      C: 48,
      nHeads: 3,
      A: 16,
      nBlocks: 3,
      vocab: 3,
      tied: false,
      live: true,
      blurb: "Sorts six letters. Small enough to draw every weight.",
    },
    {
      id: "gpt2-small",
      name: "GPT-2 (small)",
      T: 1024,
      C: 768,
      nHeads: 12,
      A: 64,
      nBlocks: 12,
      vocab: 50257,
      tied: true,
      blurb: "The smallest of the four GPT-2 models, from 2019.",
    },
    {
      id: "gpt2-xl",
      name: "GPT-2 (XL)",
      T: 1024,
      C: 1600,
      nHeads: 25,
      A: 64,
      nBlocks: 48,
      vocab: 50257,
      tied: true,
      blurb: "The largest GPT-2. Same recipe, more of everything.",
    },
    {
      id: "gpt3",
      name: "GPT-3",
      T: 2048,
      C: 12288,
      nHeads: 96,
      A: 128,
      nBlocks: 96,
      vocab: 50257,
      tied: true,
      blurb: "175 billion parameters. The tower goes off the top of the screen.",
    },
  ];

  /** Parameter count for a GPT of this shape, broken down by part. */
  LV.paramCount = function (m) {
    var C = m.C,
      B = m.nBlocks;
    var tokEmbed = m.vocab * C;
    var posEmbed = m.T * C;
    var perBlock =
      2 * C + // ln1
      (C * 3 * C + 3 * C) + // qkv
      (C * C + C) + // attn out projection
      2 * C + // ln2
      (C * 4 * C + 4 * C) + // mlp up
      (4 * C * C + C); // mlp down
    var head = m.tied ? 0 : C * m.vocab;
    var total = tokEmbed + posEmbed + perBlock * B + 2 * C + head;
    return {
      tokEmbed: tokEmbed,
      posEmbed: posEmbed,
      perBlock: perBlock,
      blocks: perBlock * B,
      finalNorm: 2 * C,
      head: head,
      total: total,
    };
  };

  LV.formatCount = function (n) {
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + " billion";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + " million";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return "" + n;
  };

  LV.groupDigits = function (n) {
    return n.toLocaleString("en-US");
  };

  // --------------------------------------------------------- weight loading

  LV.loadWeights = function (base) {
    return Promise.all([
      fetch(base + "nano-gpt.json").then(function (r) {
        return r.json();
      }),
      fetch(base + "nano-gpt.bin").then(function (r) {
        return r.arrayBuffer();
      }),
    ]).then(function (res) {
      var meta = res[0];
      var all = new Float32Array(res[1]);
      var w = {};
      meta.tensors.forEach(function (t) {
        var n = t.shape.reduce(function (a, b) {
          return a * b;
        }, 1);
        w[t.name] = {
          data: all.subarray(t.offset, t.offset + n),
          shape: t.shape,
          note: t.note,
        };
      });
      return { meta: meta, cfg: meta.config, w: w, raw: all };
    });
  };

  // ------------------------------------------------------------- math bits

  function erf(x) {
    // Abramowitz & Stegun 7.1.26 — good to ~1.5e-7, plenty for display.
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
        0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-x * x);
    return s * y;
  }

  function gelu(x) {
    return 0.5 * x * (1 + erf(x / Math.SQRT2));
  }
  LV.gelu = gelu;

  function tensor(rows, cols, label) {
    return {
      data: new Float32Array(rows * cols),
      rows: rows,
      cols: cols,
      label: label || "",
    };
  }

  function at(t, r, c) {
    return t.data[r * t.cols + c];
  }

  /**
   * out[r, j] = sum_k in[r, k] * W[j, k] + bias[j]
   * (W is stored the way PyTorch stores nn.Linear.weight: [out, in].)
   */
  function linear(input, W, b, outDim, rowsUsed) {
    var out = tensor(input.rows, outDim);
    var inDim = input.cols;
    for (var r = 0; r < rowsUsed; r++) {
      for (var j = 0; j < outDim; j++) {
        var acc = b ? b.data[j] : 0;
        var wOff = j * inDim;
        var iOff = r * inDim;
        for (var k = 0; k < inDim; k++) acc += input.data[iOff + k] * W.data[wOff + k];
        out.data[r * outDim + j] = acc;
      }
    }
    return out;
  }

  function layerNorm(input, g, b, rowsUsed) {
    var C = input.cols;
    var mu = tensor(input.rows, 1);
    var sigma = tensor(input.rows, 1);
    var out = tensor(input.rows, C);
    for (var r = 0; r < rowsUsed; r++) {
      var off = r * C,
        sum = 0;
      for (var c = 0; c < C; c++) sum += input.data[off + c];
      var m = sum / C;
      var vs = 0;
      for (c = 0; c < C; c++) {
        var d = input.data[off + c] - m;
        vs += d * d;
      }
      var sd = Math.sqrt(vs / C + 1e-5);
      mu.data[r] = m;
      sigma.data[r] = sd;
      for (c = 0; c < C; c++) {
        out.data[off + c] = ((input.data[off + c] - m) / sd) * g.data[c] + b.data[c];
      }
    }
    return { mu: mu, sigma: sigma, out: out };
  }

  // ------------------------------------------------------------ forward pass

  /**
   * Run the model over `tokens` (an array of token ids, at most blockSize).
   * Returns a nested structure of tensors: one entry for every value the
   * visualization can point a camera at.
   */
  LV.forward = function (model, tokens) {
    var cfg = model.cfg,
      w = model.w;
    var T = cfg.blockSize,
      C = cfg.C,
      A = cfg.headSize,
      H = cfg.nHeads;
    var t = Math.min(tokens.length, T);

    var tokIdx = tensor(T, 1);
    var tokEmbed = tensor(T, C);
    var posEmbed = tensor(T, C);
    var embed = tensor(T, C);
    for (var r = 0; r < t; r++) {
      tokIdx.data[r] = tokens[r];
      for (var c = 0; c < C; c++) {
        var te = w.wte.data[tokens[r] * C + c];
        var pe = w.wpe.data[r * C + c];
        tokEmbed.data[r * C + c] = te;
        posEmbed.data[r * C + c] = pe;
        embed.data[r * C + c] = te + pe;
      }
    }

    var x = embed;
    var blocks = [];
    for (var bi = 0; bi < cfg.nBlocks; bi++) {
      var p = "blocks." + bi + ".";
      var ln1 = layerNorm(x, w[p + "ln1.g"], w[p + "ln1.b"], t);
      var qkv = linear(ln1.out, w[p + "attn.qkv.w"], w[p + "attn.qkv.b"], 3 * C, t);

      var heads = [];
      var vCombined = tensor(T, C);
      for (var h = 0; h < H; h++) {
        var q = tensor(T, A),
          k = tensor(T, A),
          v = tensor(T, A);
        for (r = 0; r < t; r++) {
          for (var a = 0; a < A; a++) {
            q.data[r * A + a] = qkv.data[r * 3 * C + h * A + a];
            k.data[r * A + a] = qkv.data[r * 3 * C + C + h * A + a];
            v.data[r * A + a] = qkv.data[r * 3 * C + 2 * C + h * A + a];
          }
        }
        var scores = tensor(T, T);
        var smMax = tensor(T, 1);
        var smSum = tensor(T, 1);
        var sm = tensor(T, T);
        var scale = 1 / Math.sqrt(A);
        for (r = 0; r < t; r++) {
          var mx = -Infinity;
          for (var c2 = 0; c2 <= r; c2++) {
            var acc = 0;
            for (a = 0; a < A; a++) acc += q.data[r * A + a] * k.data[c2 * A + a];
            acc *= scale;
            scores.data[r * T + c2] = acc;
            if (acc > mx) mx = acc;
          }
          for (c2 = r + 1; c2 < T; c2++) scores.data[r * T + c2] = NaN; // masked
          var sum = 0;
          for (c2 = 0; c2 <= r; c2++) sum += Math.exp(scores.data[r * T + c2] - mx);
          smMax.data[r] = mx;
          smSum.data[r] = sum;
          for (c2 = 0; c2 <= r; c2++) {
            sm.data[r * T + c2] = Math.exp(scores.data[r * T + c2] - mx) / sum;
          }
          for (c2 = r + 1; c2 < T; c2++) sm.data[r * T + c2] = NaN;
        }
        var vOut = tensor(T, A);
        for (r = 0; r < t; r++) {
          for (a = 0; a < A; a++) {
            var s = 0;
            for (c2 = 0; c2 <= r; c2++) s += sm.data[r * T + c2] * v.data[c2 * A + a];
            vOut.data[r * A + a] = s;
            vCombined.data[r * C + h * A + a] = s;
          }
        }
        heads.push({ q: q, k: k, v: v, scores: scores, smMax: smMax, smSum: smSum, sm: sm, vOut: vOut });
      }

      var attnProj = linear(vCombined, w[p + "attn.proj.w"], w[p + "attn.proj.b"], C, t);
      var attnResid = tensor(T, C);
      for (r = 0; r < t * C; r++) attnResid.data[r] = x.data[r] + attnProj.data[r];

      var ln2 = layerNorm(attnResid, w[p + "ln2.g"], w[p + "ln2.b"], t);
      var mlpFc = linear(ln2.out, w[p + "mlp.fc.w"], w[p + "mlp.fc.b"], 4 * C, t);
      var mlpAct = tensor(T, 4 * C);
      for (r = 0; r < t * 4 * C; r++) mlpAct.data[r] = gelu(mlpFc.data[r]);
      var mlpProj = linear(mlpAct, w[p + "mlp.proj.w"], w[p + "mlp.proj.b"], C, t);
      var mlpResid = tensor(T, C);
      for (r = 0; r < t * C; r++) mlpResid.data[r] = attnResid.data[r] + mlpProj.data[r];

      blocks.push({
        input: x,
        ln1: ln1,
        qkv: qkv,
        heads: heads,
        vCombined: vCombined,
        attnProj: attnProj,
        attnResid: attnResid,
        ln2: ln2,
        mlpFc: mlpFc,
        mlpAct: mlpAct,
        mlpProj: mlpProj,
        mlpResid: mlpResid,
      });
      x = mlpResid;
    }

    var lnf = layerNorm(x, w["lnf.g"], w["lnf.b"], t);
    var logits = linear(lnf.out, w["head.w"], null, cfg.vocabSize, t);
    var V = cfg.vocabSize;
    var logitsMax = tensor(T, 1);
    var logitsSum = tensor(T, 1);
    var probs = tensor(T, V);
    for (r = 0; r < t; r++) {
      var m2 = -Infinity;
      for (c = 0; c < V; c++) m2 = Math.max(m2, logits.data[r * V + c]);
      var s2 = 0;
      for (c = 0; c < V; c++) s2 += Math.exp(logits.data[r * V + c] - m2);
      logitsMax.data[r] = m2;
      logitsSum.data[r] = s2;
      for (c = 0; c < V; c++) probs.data[r * V + c] = Math.exp(logits.data[r * V + c] - m2) / s2;
    }

    return {
      tokens: tokens.slice(),
      tUsed: t,
      tokIdx: tokIdx,
      tokEmbed: tokEmbed,
      posEmbed: posEmbed,
      embed: embed,
      blocks: blocks,
      lnf: lnf,
      logits: logits,
      logitsMax: logitsMax,
      logitsSum: logitsSum,
      probs: probs,
    };
  };

  /** Greedy autoregressive decode until the context is full. */
  LV.generate = function (model, prompt) {
    var seq = prompt.slice();
    var T = model.cfg.blockSize;
    while (seq.length < T) {
      var run = LV.forward(model, seq);
      var last = seq.length - 1;
      var V = model.cfg.vocabSize;
      var best = 0;
      for (var c = 1; c < V; c++) {
        if (run.logits.data[last * V + c] > run.logits.data[last * V + best]) best = c;
      }
      seq.push(best);
    }
    return seq;
  };

  LV.tensorAt = at;
  LV.makeTensor = tensor;
})(window);
