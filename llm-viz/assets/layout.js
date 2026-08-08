/**
 * llm-viz layout: turns a GPT of a given shape into 3D geometry.
 *
 * The model is drawn as a tower that you descend. Activations are horizontal
 * slabs — one row per token (Z), one column per channel (X) — and weight
 * matrices are the vertical walls standing between them, so that every matmul
 * reads as "the row above times the column of the wall lands in the cell
 * below". Aggregates (means, maxes, sums) are thin columns beside their slab.
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});
  var CELL = 1; // one cell = one number
  var SLAB = 1.5; // slab thickness (Y)
  var WALL = 1.5; // wall thickness (Z)
  var GAP = 7.5; // vertical breathing room between stages

  var KIND = {
    act: { color: [0.22, 0.55, 0.95], group: "activation" },
    resid: { color: [0.34, 0.78, 0.62], group: "activation" },
    weight: { color: [0.85, 0.45, 0.28], group: "parameter" },
    bias: { color: [0.9, 0.62, 0.25], group: "parameter" },
    embed: { color: [0.62, 0.45, 0.92], group: "parameter" },
    attn: { color: [0.95, 0.36, 0.45], group: "activation" },
    agg: { color: [0.55, 0.62, 0.75], group: "aggregate" },
    token: { color: [0.95, 0.8, 0.35], group: "io" },
    probs: { color: [0.35, 0.85, 0.55], group: "activation" },
  };
  LV.KIND = KIND;

  function Scene(cfg, opts) {
    this.cfg = cfg;
    this.opts = opts || {};
    this.blocks = [];
    this.byId = {};
    this.beams = [];
    this.labels = [];
    this.anchors = {};
    this.min = [1e18, 1e18, 1e18];
    this.max = [-1e18, -1e18, -1e18];
  }

  Scene.prototype.add = function (b) {
    b.index = this.blocks.length;
    b.color = b.color || KIND[b.kind].color;
    b.dataOffset = -1;
    b.valueScale = 1;
    this.blocks.push(b);
    this.byId[b.id] = b;
    for (var i = 0; i < 3; i++) {
      this.min[i] = Math.min(this.min[i], b.pos[i]);
      this.max[i] = Math.max(this.max[i], b.pos[i] + b.size[i]);
    }
    return b;
  };

  Scene.prototype.label = function (text, pos, opts) {
    var l = { text: text, pos: pos, cls: (opts && opts.cls) || "", tier: (opts && opts.tier) || 1 };
    if (opts && opts.blockId) l.blockId = opts.blockId;
    this.labels.push(l);
    return l;
  };

  /** An axis-aligned connector drawn as a slim glowing bar. */
  Scene.prototype.beam = function (from, to, opts) {
    this.beams.push({
      from: from,
      to: to,
      color: (opts && opts.color) || [0.42, 0.72, 1.0],
      width: (opts && opts.width) || 0.7,
      section: opts && opts.section,
      kind: (opts && opts.kind) || "flow",
    });
  };

  /** A polyline of axis-aligned beams. */
  Scene.prototype.path = function (points, opts) {
    for (var i = 0; i + 1 < points.length; i++) {
      this.beam(points[i], points[i + 1], opts);
    }
  };

  /**
   * Route a connector between two blocks so it stays clear of the geometry:
   * out to a side lane, along it, and back in.
   */
  Scene.prototype.link = function (fromId, toId, opts) {
    opts = opts || {};
    var a = this.byId[fromId],
      b = this.byId[toId];
    if (!a || !b) return;
    var ay = a.pos[1] + a.size[1] / 2,
      by = b.pos[1] + b.size[1] / 2;
    var az = a.pos[2] + a.size[2] / 2,
      bz = b.pos[2] + b.size[2] / 2;
    var off = opts.offset === undefined ? 8 : opts.offset;
    if (opts.lane === "front") {
      var fz = Math.max(a.pos[2] + a.size[2], b.pos[2] + b.size[2]) + off;
      this.path(
        [
          [a.pos[0] + a.size[0] / 2, ay, az],
          [a.pos[0] + a.size[0] / 2, ay, fz],
          [b.pos[0] + b.size[0] / 2, by, fz],
          [b.pos[0] + b.size[0] / 2, by, bz],
        ],
        opts
      );
      return;
    }
    var side = opts.lane === "left" ? -1 : 1;
    var ax = side > 0 ? a.pos[0] + a.size[0] : a.pos[0];
    var bx = side > 0 ? b.pos[0] + b.size[0] : b.pos[0];
    var lane = side > 0 ? Math.max(ax, bx) + off : Math.min(ax, bx) - off;
    this.path(
      [
        [ax, ay, az],
        [lane, ay, az],
        [lane, by, bz],
        [bx, by, bz],
      ],
      opts
    );
  };

  Scene.prototype.center = function (id) {
    var b = this.byId[id];
    return [b.pos[0] + b.size[0] / 2, b.pos[1] + b.size[1] / 2, b.pos[2] + b.size[2] / 2];
  };

  // ------------------------------------------------------------- primitives

  /** Horizontal slab: `rows` tokens deep (Z), `cols` channels wide (X). */
  function slab(scene, o) {
    return scene.add({
      id: o.id,
      name: o.name,
      kind: o.kind,
      form: "slab",
      pos: [o.x - (o.cols * CELL) / 2, o.y, -(o.rows * CELL) / 2],
      size: [o.cols * CELL, SLAB, o.rows * CELL],
      cells: [o.cols, 1, o.rows],
      tensor: o.tensor || null,
      transpose: false,
      rowAxis: o.rowAxis || "token",
      colAxis: o.colAxis || "channel",
      section: o.section,
      src: o.src || null,
      formula: o.formula || "",
      about: o.about || "",
      rowsUsed: o.rowsUsed,
    });
  }

  /** Vertical wall: `inDim` rows tall (Y), `outDim` columns wide (X). */
  function wall(scene, o) {
    return scene.add({
      id: o.id,
      name: o.name,
      kind: o.kind || "weight",
      form: "wall",
      pos: [o.x - (o.outDim * CELL) / 2, o.y, -WALL / 2 + (o.z || 0)],
      size: [o.outDim * CELL, o.inDim * CELL, WALL],
      cells: [o.outDim, o.inDim, 1],
      tensor: o.tensor || null,
      transpose: o.transpose !== false,
      rowAxis: o.rowAxis || "input channel",
      colAxis: o.colAxis || "output channel",
      section: o.section,
      src: o.src || null,
      formula: o.formula || "",
      about: o.about || "",
    });
  }

  /** Thin bar of `n` values lying along X (biases, gains). */
  function bar(scene, o) {
    return scene.add({
      id: o.id,
      name: o.name,
      kind: o.kind || "bias",
      form: "bar",
      pos: [o.x - (o.n * CELL) / 2, o.y, -(o.z || 0) - SLAB / 2],
      size: [o.n * CELL, SLAB, SLAB],
      cells: [o.n, 1, 1],
      tensor: o.tensor,
      transpose: false,
      rowAxis: "",
      colAxis: o.colAxis || "channel",
      section: o.section,
      src: o.src || null,
      formula: o.formula || "",
      about: o.about || "",
    });
  }

  /** Thin column of `rows` values running along Z (per-token aggregates). */
  function column(scene, o) {
    return scene.add({
      id: o.id,
      name: o.name,
      kind: o.kind || "agg",
      form: "column",
      pos: [o.x - CELL / 2, o.y, -(o.rows * CELL) / 2],
      size: [CELL, SLAB, o.rows * CELL],
      cells: [1, 1, o.rows],
      tensor: o.tensor,
      transpose: false,
      rowAxis: "token",
      colAxis: "",
      section: o.section,
      src: o.src || null,
      formula: o.formula || "",
      about: o.about || "",
      rowsUsed: o.rowsUsed,
    });
  }

  // ------------------------------------------------------------ the builder

  /**
   * Build the tower. `run` is an optional forward pass (nano-gpt only); with
   * no run the geometry is identical but the cells have no values, which is
   * how the multi-billion parameter models are drawn.
   */
  LV.buildScene = function (cfg, weights, run, opts) {
    opts = opts || {};
    var detail = opts.detail || (run ? "full" : "coarse");
    var scene = new Scene(cfg, opts);
    var T = cfg.T,
      C = cfg.C,
      A = cfg.A,
      H = cfg.nHeads,
      V = cfg.vocab;
    var rowsUsed = run ? run.tUsed : T;
    var w = weights || {};
    var y = 0;

    function down(h) {
      y -= h;
      return y;
    }

    // ---------------------------------------------------------- embedding
    var embedTop = y;
    var tokTableX = -C - 26;
    var posTableX = C + 26;

    slab(scene, {
      id: "tokens",
      name: "Input tokens",
      kind: "token",
      x: tokTableX - C / 2 - 14,
      y: y,
      rows: T,
      cols: 1,
      tensor: run ? run.tokIdx : null,
      section: "embedding",
      colAxis: "",
      rowsUsed: rowsUsed,
      about: "One row per position in the context. Each holds a token index.",
      formula: "token[t]",
    });
    scene.label("Input tokens", [tokTableX - C / 2 - 14, y + 6, 0], { tier: 0, blockId: "tokens" });

    slab(scene, {
      id: "wte",
      name: "Token embedding table",
      kind: "embed",
      x: tokTableX,
      y: y,
      rows: V,
      cols: C,
      tensor: w.wte || null,
      rowAxis: "vocabulary entry",
      section: "embedding",
      about: "One learned vector per vocabulary entry.",
      formula: "wte[token, c]",
    });
    scene.label("Token embedding table  (vocab x C)", [tokTableX, y + 6, 0], { tier: 0, blockId: "wte" });

    slab(scene, {
      id: "wpe",
      name: "Position embedding table",
      kind: "embed",
      x: posTableX,
      y: y,
      rows: T,
      cols: C,
      tensor: w.wpe || null,
      rowAxis: "position",
      section: "embedding",
      about: "One learned vector per slot in the context window.",
      formula: "wpe[t, c]",
    });
    scene.label("Position embedding table  (T x C)", [posTableX, y + 6, 0], { tier: 0, blockId: "wpe" });

    down(GAP * 3);
    slab(scene, {
      id: "tokEmbed",
      name: "Token embedding",
      kind: "act",
      x: tokTableX,
      y: y,
      rows: T,
      cols: C,
      tensor: run ? run.tokEmbed : null,
      section: "embedding",
      rowsUsed: rowsUsed,
      src: { type: "lookup", table: "wte", index: "tokens" },
      formula: "tokEmb[t, c] = wte[token[t], c]",
      about: "Row t is just the table row picked out by token t.",
    });
    slab(scene, {
      id: "posEmbed",
      name: "Position embedding",
      kind: "act",
      x: posTableX,
      y: y,
      rows: T,
      cols: C,
      tensor: run ? run.posEmbed : null,
      section: "embedding",
      rowsUsed: rowsUsed,
      src: { type: "rowpick", table: "wpe" },
      formula: "posEmb[t, c] = wpe[t, c]",
      about: "Row t of the position table, verbatim.",
    });

    down(GAP * 2.4);
    var embedY = y;
    slab(scene, {
      id: "embed",
      name: "Input embedding",
      kind: "resid",
      x: 0,
      y: y,
      rows: T,
      cols: C,
      tensor: run ? run.embed : null,
      section: "embedding",
      rowsUsed: rowsUsed,
      src: { type: "add", inputs: ["tokEmbed", "posEmbed"] },
      formula: "x[t, c] = tokEmb[t, c] + posEmb[t, c]",
      about: "The residual stream is born here: one C-vector per token.",
    });
    scene.label("Input embedding", [0, y - 5, T / 2 + 5], { tier: 0, blockId: "embed" });
    scene.link("tokEmbed", "embed", { lane: "front", section: "embedding" });
    scene.link("posEmbed", "embed", { lane: "front", section: "embedding" });
    scene.link("wte", "tokEmbed", { lane: "front", section: "embedding", offset: 5 });
    scene.link("wpe", "posEmbed", { lane: "front", section: "embedding", offset: 5 });
    scene.anchors.embedding = { center: [0, (embedTop + y) / 2, 0], span: C * 3 };

    // ------------------------------------------------------------- blocks
    var prevId = "embed";
    var prevY = y;
    for (var bi = 0; bi < cfg.nBlocks; bi++) {
      var p = "b" + bi + ".";
      var wp = "blocks." + bi + ".";
      var rb = run ? run.blocks[bi] : null;
      var blockTop = y;

      // -- layer norm 1
      down(GAP * 2.2);
      column(scene, {
        id: p + "ln1.mu",
        name: "LN1 mean",
        x: -C / 2 - 8,
        y: y,
        rows: T,
        tensor: rb ? rb.ln1.mu : null,
        section: "layernorm",
        rowsUsed: rowsUsed,
        src: { type: "rowstat", input: prevId, stat: "mean" },
        formula: "mu[t] = mean_c x[t, c]",
      });
      column(scene, {
        id: p + "ln1.sigma",
        name: "LN1 std. dev.",
        x: -C / 2 - 4,
        y: y,
        rows: T,
        tensor: rb ? rb.ln1.sigma : null,
        section: "layernorm",
        rowsUsed: rowsUsed,
        src: { type: "rowstat", input: prevId, stat: "std" },
        formula: "sigma[t] = sqrt(var_c x[t, c] + eps)",
      });
      bar(scene, {
        id: p + "ln1.g",
        name: "LN1 gain",
        kind: "weight",
        x: 0,
        y: y + 4,
        n: C,
        tensor: w[wp + "ln1.g"] || null,
        section: "layernorm",
        formula: "gamma[c]",
      });
      bar(scene, {
        id: p + "ln1.b",
        name: "LN1 bias",
        x: 0,
        y: y + 4,
        z: 4,
        n: C,
        tensor: w[wp + "ln1.b"] || null,
        section: "layernorm",
        formula: "beta[c]",
      });
      down(GAP);
      slab(scene, {
        id: p + "ln1.out",
        name: "Layer norm 1",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.ln1.out : null,
        section: "layernorm",
        rowsUsed: rowsUsed,
        src: {
          type: "norm",
          input: prevId,
          mu: p + "ln1.mu",
          sigma: p + "ln1.sigma",
          gain: p + "ln1.g",
          bias: p + "ln1.b",
        },
        formula: "n[t, c] = (x[t, c] - mu[t]) / sigma[t] * gamma[c] + beta[c]",
        about: "Each token's vector is re-centred and re-scaled on its own.",
      });
      scene.label("Layer norm", [-C / 2 - 16, y + 4, 0], { tier: 1, blockId: p + "ln1.out" });
      scene.link(prevId, p + "ln1.out", { lane: "front", section: "layernorm", offset: 6 });

      // -- Q, K, V projection
      down(C + GAP * 1.6);
      wall(scene, {
        id: p + "qkv.w",
        name: "Q, K, V weights",
        x: 0,
        y: y,
        inDim: C,
        outDim: 3 * C,
        tensor: w[wp + "attn.qkv.w"] || null,
        section: "attention",
        colAxis: "Q|K|V channel",
        formula: "Wqkv[c, j]",
        about: "One wall holding the query, key and value projections side by side.",
      });
      down(GAP);
      bar(scene, {
        id: p + "qkv.b",
        name: "Q, K, V bias",
        x: 0,
        y: y + 3,
        n: 3 * C,
        tensor: w[wp + "attn.qkv.b"] || null,
        section: "attention",
        formula: "bqkv[j]",
      });
      down(GAP);
      slab(scene, {
        id: p + "qkv",
        name: "Q, K, V vectors",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: 3 * C,
        tensor: rb ? rb.qkv : null,
        section: "attention",
        rowsUsed: rowsUsed,
        colAxis: "Q|K|V channel",
        src: { type: "matmul", input: p + "ln1.out", weight: p + "qkv.w", bias: p + "qkv.b" },
        formula: "qkv[t, j] = sum_c n[t, c] * Wqkv[c, j] + bqkv[j]",
        about: "Three projections of every token, computed in one matmul.",
      });
      scene.label("Q, K, V", [0, y - 5, T / 2 + 5], { tier: 1, blockId: p + "qkv" });

      // -- heads
      var laneW = Math.max(3 * A + 12, T + 20) + 18;
      var headIds = [];
      var headTop = y;
      var attnBottom = y;
      if (detail === "full") {
        for (var h = 0; h < H; h++) {
          var cx = (h - (H - 1) / 2) * laneW;
          var hp = p + "h" + h + ".";
          var hy = headTop;
          hy -= GAP * 2.2;
          var qx = cx - A - 4,
            kx = cx,
            vx = cx + A + 4;
          var rh = rb ? rb.heads[h] : null;
          slab(scene, {
            id: hp + "q",
            name: "Q vectors (head " + h + ")",
            kind: "act",
            x: qx,
            y: hy,
            rows: T,
            cols: A,
            tensor: rh ? rh.q : null,
            section: "attention",
            rowsUsed: rowsUsed,
            src: { type: "slice", input: p + "qkv", offset: h * A },
            formula: "q[t, a] = qkv[t, " + h * A + " + a]",
            about: "What this token is looking for.",
          });
          slab(scene, {
            id: hp + "k",
            name: "K vectors (head " + h + ")",
            kind: "act",
            x: kx,
            y: hy,
            rows: T,
            cols: A,
            tensor: rh ? rh.k : null,
            section: "attention",
            rowsUsed: rowsUsed,
            src: { type: "slice", input: p + "qkv", offset: C + h * A },
            formula: "k[t, a] = qkv[t, " + (C + h * A) + " + a]",
            about: "What this token offers to others.",
          });
          slab(scene, {
            id: hp + "v",
            name: "V vectors (head " + h + ")",
            kind: "act",
            x: vx,
            y: hy,
            rows: T,
            cols: A,
            tensor: rh ? rh.v : null,
            section: "attention",
            rowsUsed: rowsUsed,
            src: { type: "slice", input: p + "qkv", offset: 2 * C + h * A },
            formula: "v[t, a] = qkv[t, " + (2 * C + h * A) + " + a]",
            about: "What this token passes on if it is attended to.",
          });
          scene.label("head " + h, [cx, hy + 7, -T / 2 - 6], { tier: 1 });

          hy -= GAP * 2.6;
          slab(scene, {
            id: hp + "scores",
            name: "Attention scores (head " + h + ")",
            kind: "attn",
            x: cx,
            y: hy,
            rows: T,
            cols: T,
            tensor: rh ? rh.scores : null,
            section: "attention",
            rowsUsed: rowsUsed,
            rowAxis: "query token",
            colAxis: "key token",
            src: { type: "attnScore", q: hp + "q", k: hp + "k", scale: A },
            formula: "s[i, j] = q[i] . k[j] / sqrt(A)   (only j <= i)",
            about: "How much each token wants to hear from each earlier token.",
          });
          column(scene, {
            id: hp + "smMax",
            name: "Row max (head " + h + ")",
            x: cx - T / 2 - 8,
            y: hy - GAP * 1.6,
            rows: T,
            tensor: rh ? rh.smMax : null,
            section: "softmax",
            rowsUsed: rowsUsed,
            formula: "m[i] = max_j s[i, j]",
          });
          column(scene, {
            id: hp + "smSum",
            name: "Row sum of exp (head " + h + ")",
            x: cx - T / 2 - 4,
            y: hy - GAP * 1.6,
            rows: T,
            tensor: rh ? rh.smSum : null,
            section: "softmax",
            rowsUsed: rowsUsed,
            formula: "z[i] = sum_j exp(s[i, j] - m[i])",
          });
          hy -= GAP * 1.6;
          slab(scene, {
            id: hp + "sm",
            name: "Attention pattern (head " + h + ")",
            kind: "attn",
            x: cx,
            y: hy,
            rows: T,
            cols: T,
            tensor: rh ? rh.sm : null,
            section: "attention",
            rowsUsed: rowsUsed,
            rowAxis: "query token",
            colAxis: "key token",
            src: { type: "softmax", input: hp + "scores", max: hp + "smMax", sum: hp + "smSum" },
            formula: "a[i, j] = exp(s[i, j] - m[i]) / z[i]",
            about: "Each row is a probability distribution over earlier tokens.",
          });
          hy -= GAP * 2.6;
          slab(scene, {
            id: hp + "out",
            name: "Head output (head " + h + ")",
            kind: "act",
            x: cx,
            y: hy,
            rows: T,
            cols: A,
            tensor: rh ? rh.vOut : null,
            section: "attention",
            rowsUsed: rowsUsed,
            src: { type: "attnAgg", sm: hp + "sm", v: hp + "v" },
            formula: "o[i, a] = sum_j a[i, j] * v[j, a]",
            about: "A weighted average of the value vectors below the diagonal.",
          });
          scene.link(p + "qkv", hp + "q", { lane: "front", section: "attention", offset: 6 });
          scene.link(hp + "scores", hp + "sm", { lane: "front", section: "softmax", offset: 5 });
          scene.link(hp + "out", p + "vcomb", { lane: "front", section: "projection", offset: 6 });
          headIds.push(hp);
          attnBottom = Math.min(attnBottom, hy);
        }
      } else {
        // coarse: all heads collapsed into one stacked box
        var hy2 = headTop - GAP * 2.2;
        scene.add({
          id: p + "heads",
          name: H + " attention heads",
          kind: "attn",
          form: "stack",
          pos: [-(T * CELL) / 2, hy2 - H * 1.2, -(T * CELL) / 2],
          size: [T * CELL, H * 1.2, T * CELL],
          cells: [T, H, T],
          tensor: null,
          transpose: false,
          rowAxis: "query token",
          colAxis: "key token",
          section: "attention",
          formula: "one T x T attention pattern per head",
        });
        attnBottom = hy2 - H * 1.2 - GAP * 2;
      }
      y = attnBottom;

      down(GAP * 2.4);
      slab(scene, {
        id: p + "vcomb",
        name: "Head outputs combined",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.vCombined : null,
        section: "projection",
        rowsUsed: rowsUsed,
        src: { type: "concat", heads: headIds, headSize: A },
        formula: "concat over heads",
        about: "The heads' outputs laid end to end, back to width C.",
      });

      down(GAP * 1.4 + C);
      wall(scene, {
        id: p + "proj.w",
        name: "Attention output weights",
        x: 0,
        y: y,
        inDim: C,
        outDim: C,
        tensor: w[wp + "attn.proj.w"] || null,
        section: "projection",
        formula: "Wproj[c, j]",
      });
      down(GAP);
      bar(scene, {
        id: p + "proj.b",
        name: "Attention output bias",
        x: 0,
        y: y + 3,
        n: C,
        tensor: w[wp + "attn.proj.b"] || null,
        section: "projection",
        formula: "bproj[j]",
      });
      down(GAP);
      slab(scene, {
        id: p + "proj",
        name: "Attention projection",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.attnProj : null,
        section: "projection",
        rowsUsed: rowsUsed,
        src: { type: "matmul", input: p + "vcomb", weight: p + "proj.w", bias: p + "proj.b" },
        formula: "p[t, j] = sum_c o[t, c] * Wproj[c, j] + bproj[j]",
        about: "Mixes the heads back together before rejoining the stream.",
      });

      down(GAP * 2.2);
      slab(scene, {
        id: p + "resid1",
        name: "Attention residual",
        kind: "resid",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.attnResid : null,
        section: "projection",
        rowsUsed: rowsUsed,
        src: { type: "add", inputs: [prevId, p + "proj"] },
        formula: "x[t, c] + p[t, c]",
        about: "Attention writes its result back into the residual stream.",
      });
      scene.link(prevId, p + "resid1", {
        lane: "left",
        offset: 22,
        width: 1.1,
        section: "residual",
        kind: "residual",
        color: [0.34, 0.85, 0.68],
      });

      // -- layer norm 2 + MLP
      down(GAP * 2.2);
      column(scene, {
        id: p + "ln2.mu",
        name: "LN2 mean",
        x: -C / 2 - 8,
        y: y,
        rows: T,
        tensor: rb ? rb.ln2.mu : null,
        section: "mlp",
        rowsUsed: rowsUsed,
        formula: "mu[t]",
      });
      column(scene, {
        id: p + "ln2.sigma",
        name: "LN2 std. dev.",
        x: -C / 2 - 4,
        y: y,
        rows: T,
        tensor: rb ? rb.ln2.sigma : null,
        section: "mlp",
        rowsUsed: rowsUsed,
        formula: "sigma[t]",
      });
      bar(scene, {
        id: p + "ln2.g",
        name: "LN2 gain",
        kind: "weight",
        x: 0,
        y: y + 4,
        n: C,
        tensor: w[wp + "ln2.g"] || null,
        section: "mlp",
      });
      bar(scene, {
        id: p + "ln2.b",
        name: "LN2 bias",
        x: 0,
        y: y + 4,
        z: 4,
        n: C,
        tensor: w[wp + "ln2.b"] || null,
        section: "mlp",
      });
      down(GAP);
      slab(scene, {
        id: p + "ln2.out",
        name: "Layer norm 2",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.ln2.out : null,
        section: "mlp",
        rowsUsed: rowsUsed,
        src: {
          type: "norm",
          input: p + "resid1",
          mu: p + "ln2.mu",
          sigma: p + "ln2.sigma",
          gain: p + "ln2.g",
          bias: p + "ln2.b",
        },
        formula: "n[t, c] = (x[t, c] - mu[t]) / sigma[t] * gamma[c] + beta[c]",
      });

      down(C + GAP * 1.6);
      wall(scene, {
        id: p + "mlp.w1",
        name: "MLP up-projection weights",
        x: 0,
        y: y,
        inDim: C,
        outDim: 4 * C,
        tensor: w[wp + "mlp.fc.w"] || null,
        section: "mlp",
        formula: "W1[c, j]",
        about: "Widens each token from C to 4C.",
      });
      down(GAP);
      bar(scene, {
        id: p + "mlp.b1",
        name: "MLP up-projection bias",
        x: 0,
        y: y + 3,
        n: 4 * C,
        tensor: w[wp + "mlp.fc.b"] || null,
        section: "mlp",
      });
      down(GAP);
      slab(scene, {
        id: p + "mlp.fc",
        name: "MLP hidden (pre-activation)",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: 4 * C,
        tensor: rb ? rb.mlpFc : null,
        section: "mlp",
        rowsUsed: rowsUsed,
        src: { type: "matmul", input: p + "ln2.out", weight: p + "mlp.w1", bias: p + "mlp.b1" },
        formula: "h[t, j] = sum_c n[t, c] * W1[c, j] + b1[j]",
      });
      down(GAP * 2);
      slab(scene, {
        id: p + "mlp.act",
        name: "GELU activation",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: 4 * C,
        tensor: rb ? rb.mlpAct : null,
        section: "mlp",
        rowsUsed: rowsUsed,
        src: { type: "elementwise", input: p + "mlp.fc", fn: "gelu" },
        formula: "GELU(h) = h * 0.5 * (1 + erf(h / sqrt(2)))",
        about: "The only nonlinearity in the whole block.",
      });

      down(4 * C + GAP * 1.6);
      wall(scene, {
        id: p + "mlp.w2",
        name: "MLP down-projection weights",
        x: 0,
        y: y,
        inDim: 4 * C,
        outDim: C,
        tensor: w[wp + "mlp.proj.w"] || null,
        section: "mlp",
        formula: "W2[j, c]",
        about: "Squeezes 4C back down to C.",
      });
      down(GAP);
      bar(scene, {
        id: p + "mlp.b2",
        name: "MLP down-projection bias",
        x: 0,
        y: y + 3,
        n: C,
        tensor: w[wp + "mlp.proj.b"] || null,
        section: "mlp",
      });
      down(GAP);
      slab(scene, {
        id: p + "mlp.out",
        name: "MLP output",
        kind: "act",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.mlpProj : null,
        section: "mlp",
        rowsUsed: rowsUsed,
        src: { type: "matmul", input: p + "mlp.act", weight: p + "mlp.w2", bias: p + "mlp.b2" },
        formula: "m[t, c] = sum_j g[t, j] * W2[j, c] + b2[c]",
      });

      down(GAP * 2.2);
      slab(scene, {
        id: p + "resid2",
        name: "Block output",
        kind: "resid",
        x: 0,
        y: y,
        rows: T,
        cols: C,
        tensor: rb ? rb.mlpResid : null,
        section: "transformer",
        rowsUsed: rowsUsed,
        src: { type: "add", inputs: [p + "resid1", p + "mlp.out"] },
        formula: "x[t, c] + m[t, c]",
        about: "The stream leaves the block the same width it entered.",
      });
      scene.link(p + "resid1", p + "resid2", {
        lane: "left",
        offset: 22,
        width: 1.1,
        section: "residual",
        kind: "residual",
        color: [0.34, 0.85, 0.68],
      });
      scene.label("Transformer block " + bi, [-C / 2 - 30, (blockTop + y) / 2, 0], {
        tier: 0,
        cls: "big",
      });
      scene.anchors["block" + bi] = {
        center: [0, (blockTop + y) / 2, 0],
        span: Math.abs(blockTop - y),
      };
      prevId = p + "resid2";
      prevY = y;
      down(GAP * 2);
    }

    // --------------------------------------------------------------- output
    down(GAP);
    var outTop = y;
    column(scene, {
      id: "lnf.mu",
      name: "Final LN mean",
      x: -C / 2 - 8,
      y: y,
      rows: T,
      tensor: run ? run.lnf.mu : null,
      section: "output",
      rowsUsed: rowsUsed,
    });
    column(scene, {
      id: "lnf.sigma",
      name: "Final LN std. dev.",
      x: -C / 2 - 4,
      y: y,
      rows: T,
      tensor: run ? run.lnf.sigma : null,
      section: "output",
      rowsUsed: rowsUsed,
    });
    bar(scene, {
      id: "lnf.g",
      name: "Final LN gain",
      kind: "weight",
      x: 0,
      y: y + 4,
      n: C,
      tensor: w["lnf.g"] || null,
      section: "output",
    });
    bar(scene, {
      id: "lnf.b",
      name: "Final LN bias",
      x: 0,
      y: y + 4,
      z: 4,
      n: C,
      tensor: w["lnf.b"] || null,
      section: "output",
    });
    down(GAP);
    slab(scene, {
      id: "lnf.out",
      name: "Final layer norm",
      kind: "act",
      x: 0,
      y: y,
      rows: T,
      cols: C,
      tensor: run ? run.lnf.out : null,
      section: "output",
      rowsUsed: rowsUsed,
      src: {
        type: "norm",
        input: prevId,
        mu: "lnf.mu",
        sigma: "lnf.sigma",
        gain: "lnf.g",
        bias: "lnf.b",
      },
      formula: "n[t, c] = (x[t, c] - mu[t]) / sigma[t] * gamma[c] + beta[c]",
    });

    down(C + GAP * 1.6);
    wall(scene, {
      id: "head.w",
      name: "Language model head",
      x: 0,
      y: y,
      inDim: C,
      outDim: V,
      tensor: w["head.w"] || null,
      section: "output",
      colAxis: "vocabulary entry",
      formula: "Wlm[c, v]",
      about: "One column per vocabulary entry.",
    });
    down(GAP * 1.6);
    slab(scene, {
      id: "logits",
      name: "Logits",
      kind: "act",
      x: 0,
      y: y,
      rows: T,
      cols: V,
      tensor: run ? run.logits : null,
      section: "output",
      rowsUsed: rowsUsed,
      colAxis: "vocabulary entry",
      src: { type: "matmul", input: "lnf.out", weight: "head.w", bias: null },
      formula: "logit[t, v] = sum_c n[t, c] * Wlm[c, v]",
      about: "An unnormalised score for every possible next token.",
    });
    column(scene, {
      id: "logits.max",
      name: "Logit row max",
      x: -V / 2 - 8,
      y: y - GAP * 1.6,
      rows: T,
      tensor: run ? run.logitsMax : null,
      section: "softmax",
      rowsUsed: rowsUsed,
    });
    column(scene, {
      id: "logits.sum",
      name: "Logit row sum of exp",
      x: -V / 2 - 4,
      y: y - GAP * 1.6,
      rows: T,
      tensor: run ? run.logitsSum : null,
      section: "softmax",
      rowsUsed: rowsUsed,
    });
    down(GAP * 1.6);
    slab(scene, {
      id: "probs",
      name: "Output probabilities",
      kind: "probs",
      x: 0,
      y: y,
      rows: T,
      cols: V,
      tensor: run ? run.probs : null,
      section: "softmax",
      rowsUsed: rowsUsed,
      colAxis: "vocabulary entry",
      src: { type: "softmax", input: "logits", max: "logits.max", sum: "logits.sum" },
      formula: "p[t, v] = exp(logit[t, v] - m[t]) / z[t]",
      about: "Softmax turns the scores into a distribution over the vocabulary.",
    });
    scene.label("Output probabilities", [0, y - 5, T / 2 + 5], { tier: 0, blockId: "probs" });
    scene.anchors.output = { center: [0, (outTop + y) / 2, 0], span: Math.abs(outTop - y) + C };
    scene.anchors.model = {
      center: [0, (embedTop + y) / 2, 0],
      span: Math.abs(embedTop - y),
    };
    scene.height = Math.abs(embedTop - y);
    scene.bottomY = y;

    // every slab and wall gets a name that fades in once you are close enough
    // spell the tokens out beside the rows they occupy, and name the two axes
    if (detail === "full" && opts.letters) {
      var letters = opts.letters;
      var tokBlock = scene.byId["tokens"];
      for (var ti = 0; ti < T; ti++) {
        var tok = run ? run.tokens[ti] : null;
        scene.label(
          (tok === null || tok === undefined ? "\u00b7" : letters[tok]) + "  " + ti,
          [tokBlock.pos[0] - 7, tokBlock.pos[1] + 2, tokBlock.pos[2] + (ti + 0.5) * CELL],
          { tier: 2, cls: "tok3d" }
        );
      }
      for (var vi = 0; vi < V; vi++) {
        var wteB = scene.byId["wte"];
        scene.label(letters[vi], [wteB.pos[0] - 4, wteB.pos[1] + 2, wteB.pos[2] + (vi + 0.5) * CELL], {
          tier: 2,
          cls: "tok3d",
        });
        var pr = scene.byId["probs"];
        scene.label(letters[vi], [pr.pos[0] + (vi + 0.5) * CELL, pr.pos[1] + 2, pr.pos[2] - 3], {
          tier: 2,
          cls: "tok3d",
        });
      }
      var emb = scene.byId["embed"];
      scene.label("48 channels \u2192", [emb.pos[0] + emb.size[0] / 2, emb.pos[1] + 2, emb.pos[2] - 5], {
        tier: 1,
        cls: "axis",
      });
      scene.label("11 tokens \u2193", [emb.pos[0] - 8, emb.pos[1] + 2, emb.pos[2] + emb.size[2] / 2], {
        tier: 1,
        cls: "axis",
      });
    }

    var labelled = {};
    scene.labels.forEach(function (l) {
      if (l.blockId) labelled[l.blockId] = true;
    });
    scene.blocks.forEach(function (b) {
      if (detail !== "full") return;
      if (b.form === "bar" || b.form === "column") return;
      if (labelled[b.id]) return;
      scene.label(b.name, [
        b.pos[0] + b.size[0] / 2,
        b.pos[1] + b.size[1] + 2.5,
        b.pos[2] + b.size[2] + 3.5,
      ], { tier: 2, blockId: b.id, cls: "sub" });
    });
    return scene;
  };

  /**
   * All four models side by side, at true relative scale and sharing one
   * ground line. nano-gpt keeps its real values; the others are drawn as
   * geometry only, which is the only way 175 billion parameters fit anywhere.
   */
  LV.buildCompareScene = function (weights, run) {
    var merged = new Scene(null, {});
    merged.compare = true;
    var cursor = 0;
    var placements = [];

    LV.MODELS.forEach(function (m, mi) {
      var cfg = { T: m.T, C: m.C, A: m.A, nHeads: m.nHeads, nBlocks: m.nBlocks, vocab: m.vocab };
      var sub = LV.buildScene(cfg, m.live ? weights : null, m.live ? run : null, {
        detail: m.live ? "full" : "coarse",
      });
      var w = sub.max[0] - sub.min[0];
      var dx = cursor - sub.min[0];
      var dy = sub.height / 2; // hang every tower from its own midpoint
      var prefix = "m" + mi + ":";

      sub.blocks.forEach(function (b) {
        b.id = prefix + b.id;
        b.pos = [b.pos[0] + dx, b.pos[1] + dy, b.pos[2]];
        b.src = null; // cross-references would need rewriting; values still show
        merged.add(b);
      });
      sub.beams.forEach(function (bm) {
        bm.from = [bm.from[0] + dx, bm.from[1] + dy, bm.from[2]];
        bm.to = [bm.to[0] + dx, bm.to[1] + dy, bm.to[2]];
        merged.beams.push(bm);
      });
      var counts = LV.paramCount(m);
      // each label rides the top of its own tower, which spreads them out
      // vertically by exactly the amount the models differ in size
      merged.label(m.name + "  \u00b7  " + LV.formatCount(counts.total) + " parameters", [
        cursor + w / 2,
        dy + Math.max(w * 0.35, 30),
        0,
      ], { tier: 0, cls: "big" });
      placements.push({
        model: m,
        id: prefix,
        x: cursor + w / 2,
        width: w,
        height: sub.height,
        blockIds: [prefix + "embed", prefix + "probs"],
      });
      cursor += w + Math.max(w * 0.6, 260);
    });

    merged.placements = placements;
    merged.height = Math.abs(merged.min[1]);
    return merged;
  };

  /**
   * Pack every tensor referenced by the scene into one float pool, ready to be
   * uploaded as a texture. Weight walls are transposed on the way in so the
   * shader can index rows and columns the same way for every block.
   */
  LV.packValues = function (scene) {
    var total = 0;
    var i, b;
    for (i = 0; i < scene.blocks.length; i++) {
      b = scene.blocks[i];
      if (b.tensor) total += b.cells[0] * b.cells[1] * b.cells[2];
    }
    var pool = new Float32Array(Math.max(1, total));
    var off = 0;
    for (i = 0; i < scene.blocks.length; i++) {
      b = scene.blocks[i];
      if (!b.tensor) continue;
      var nx = b.cells[0],
        ny = b.cells[1],
        nz = b.cells[2];
      var n = nx * ny * nz;
      var src = b.tensor.data;
      var maxAbs = 0;
      var v, idx;
      // masked cells (the upper triangle of an attention matrix) become a
      // sentinel the shader can spot without relying on isnan()
      if (b.transpose) {
        // torch stores [out, in]; the wall wants [in][out]
        for (var yy = 0; yy < ny; yy++) {
          for (var xx = 0; xx < nx; xx++) {
            v = src[xx * ny + yy];
            pool[off + yy * nx + xx] = isFinite(v) ? v : -1e30;
            if (isFinite(v)) maxAbs = Math.max(maxAbs, Math.abs(v));
          }
        }
      } else {
        for (idx = 0; idx < n; idx++) {
          v = src[idx];
          pool[off + idx] = isFinite(v) ? v : -1e30;
          if (isFinite(v)) maxAbs = Math.max(maxAbs, Math.abs(v));
        }
      }
      b.dataOffset = off;
      b.valueMax = maxAbs;
      // A single outlier would flatten a whole tensor to black, so the colour
      // scale is set by a high percentile and the rest is allowed to clip.
      b.valueScale = 1 / Math.max(1e-9, robustScale(pool, off, n));
      off += n;
    }
    scene.pool = pool;
    return pool;
  };

  var SAMPLE = 4096;

  function robustScale(pool, off, n) {
    var step = Math.max(1, Math.floor(n / SAMPLE));
    var vals = [];
    for (var i = 0; i < n; i += step) {
      var v = pool[off + i];
      if (v > -1e29) vals.push(Math.abs(v));
    }
    if (!vals.length) return 1;
    vals.sort(function (a, b) {
      return a - b;
    });
    var p = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.97))];
    // fall back to the largest value when the tail is degenerate (a bias of
    // zeros, a one-hot row) so that constant tensors still show up
    return p > 1e-9 ? p : vals[vals.length - 1] || 1;
  }

  /** Read a single cell out of a block, in the block's own indexing. */
  LV.cellValue = function (scene, b, cell) {
    if (b.dataOffset < 0) return NaN;
    var nx = b.cells[0],
      nz = b.cells[2];
    var idx = (cell[1] * nz + cell[2]) * nx + cell[0];
    return scene.pool[b.dataOffset + idx];
  };
})(window);
