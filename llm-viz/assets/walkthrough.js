/**
 * llm-viz walkthrough: the guided tour.
 *
 * Each section is a list of beats. A beat carries a paragraph of prose, the
 * camera pose to glide to, the blocks to keep lit while everything else fades
 * back, and optionally a highlight (a row, a column or a single cell) that
 * points at exactly what the sentence is talking about.
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});

  // Shorthands used while writing the tour, so the content stays readable.
  function B(i, s) {
    return "b" + i + "." + s;
  }
  function head(i, h, s) {
    return "b" + i + ".h" + h + "." + s;
  }

  function block0(s) {
    return B(0, s);
  }

  var ln1 = block0("ln1.out"),
    qkv = block0("qkv"),
    qkvW = block0("qkv.w");

  function beat(html, o) {
    o = o || {};
    return {
      html: html,
      dur: o.dur || 7,
      cam: o.cam || null,
      focus: o.focus || null,
      dim: o.dim,
      hl: o.hl || null,
      sections: o.sections || null,
      onEnter: o.onEnter || null,
      pad: o.pad,
      yaw: o.yaw,
      pitch: o.pitch,
    };
  }

  function headIds(prefix, n, suffix) {
    var out = [];
    for (var h = 0; h < n; h++) out.push(prefix + ".h" + h + "." + suffix);
    return out;
  }

  LV.buildWalkthrough = function (cfg) {
    var H = cfg.nHeads;
    var allHeads = function (suffix) {
      return headIds("b0", H, suffix);
    };

    var sections = [
      {
        group: "Intro",
        id: "intro",
        title: "Introduction",
        beats: [
          beat(
            "<p>This is <b>nano-gpt</b>: a complete GPT-style language model with " +
              "<b>85,728 parameters</b>, drawn at full resolution. Every little square " +
              "you can see is one number the model actually holds &mdash; nothing here is " +
              "a stand-in.</p>",
            { cam: { ids: null, pad: 1.1, yaw: 0.5 }, dur: 9 }
          ),
          beat(
            "<p>Its job is deliberately tiny, so that the whole thing fits on screen: read " +
              "six letters drawn from <b>A</b>, <b>B</b> and <b>C</b>, then say them back in " +
              "alphabetical order. Those six letters go in at the top.</p>",
            {
              cam: { ids: ["tokens", "wte", "wpe"], pad: 1.5 },
              focus: { ids: ["tokens", "wte", "wpe", "tokEmbed", "posEmbed", "embed"] },
              dur: 9,
            }
          ),
          beat(
            "<p>Information falls straight down this tower. Horizontal slabs are " +
              "<b>activations</b> &mdash; one row per token, one column per channel. The " +
              "vertical walls between them are <b>weight matrices</b>: the numbers learned " +
              "during training.</p>",
            { cam: { ids: [ln1, qkvW, qkv], pad: 1.5 }, focus: { ids: [ln1, qkvW, qkv] }, dur: 10 }
          ),
          beat(
            "<p>At the bottom the model produces a probability for every letter it could say " +
              "next. Follow the brightest cell down the last slab and you can read the sorted " +
              "answer straight off the model.</p>",
            {
              cam: { ids: ["logits", "probs"], pad: 1.7 },
              focus: { ids: ["lnf.out", "head.w", "logits", "probs"] },
              dur: 9,
            }
          ),
          beat(
            "<p>You are not on rails. <b>Scroll</b> to travel down the tower (or drag the " +
              "rail on the right), <b>drag</b> to orbit, <b>+</b> and <b>&minus;</b> to zoom, and " +
              "<b>hover any cell</b> to see its value together with the exact cells that " +
              "produced it. Press <b>space</b> to pause or resume the tour.</p>",
            { cam: { ids: null, pad: 1.25, yaw: 0.95 }, dur: 10 }
          ),
        ],
      },
      {
        group: "Intro",
        id: "prelim",
        title: "Preliminaries",
        beats: [
          beat(
            "<p>A <b>token</b> is the smallest thing the model can read or write. Real models " +
              "use tens of thousands of word fragments; ours has a vocabulary of exactly " +
              "three, so a token is just a letter: <code>A = 0</code>, <code>B = 1</code>, " +
              "<code>C = 2</code>.</p>",
            {
              cam: { ids: ["tokens", "wte"], pad: 1.6 },
              focus: { ids: ["tokens", "wte"] },
              dur: 9,
            }
          ),
          beat(
            "<p>The model has a fixed <b>context</b> of <b>T = 11</b> slots. Six hold the " +
              "letters you gave it; the rest fill up as it writes. Every slab in the tower is " +
              "eleven rows deep for exactly this reason.</p>",
            { cam: { ids: ["embed"], pad: 2.2, pitch: 0.55 }, focus: { ids: ["embed"] }, dur: 9 }
          ),
          beat(
            "<p>Two kinds of number live here. <b class='lv-c-param'>Parameters</b> (the walls, " +
              "tables and thin bars) were fixed the moment training ended and never change. " +
              "<b class='lv-c-act'>Activations</b> (the slabs) are recomputed from scratch for " +
              "every input you give the model.</p>",
            {
              cam: { ids: [qkvW, qkv, block0("qkv.b")], pad: 1.5 },
              focus: { ids: [qkvW, block0("qkv.b"), qkv] },
              dur: 10
            }
          ),
          beat(
            "<p>The shape of this model in four numbers: each token is carried as a vector of " +
              "<b>C = 48</b> channels, attention is split into <b>3 heads</b> of 16 channels " +
              "each, and the tower stacks <b>3 transformer blocks</b>. Change those four " +
              "numbers and you get GPT-2, or GPT-3.</p>",
            { cam: { ids: null, pad: 1.3, yaw: 0.2 }, dur: 10 }
          ),
          beat(
            "<p>Colour encodes value: <b class='lv-c-neg'>blue</b> is negative, " +
              "<b class='lv-c-pos'>orange</b> is positive, and near-black is close to zero. " +
              "Each slab is scaled by its own largest magnitude, so you are always looking at " +
              "relative structure rather than absolute size.</p>",
            {
              cam: { ids: [block0("mlp.act")], pad: 1.4 },
              focus: { ids: [block0("mlp.fc"), block0("mlp.act")] },
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "embedding",
        title: "Embedding",
        beats: [
          beat(
            "<p>The model cannot do arithmetic on the letter <b>C</b>, so the first job is to " +
              "turn each token into a vector. The <b>token embedding table</b> holds one row " +
              "of 48 numbers per vocabulary entry.</p>",
            {
              cam: { ids: ["tokens", "wte", "tokEmbed"], pad: 1.45 },
              focus: { ids: ["tokens", "wte", "tokEmbed"] },
              dur: 9,
            }
          ),
          beat(
            "<p>Looking a token up is not a multiplication &mdash; it is a copy. Row <i>t</i> of " +
              "the token embedding is literally row <code>token[t]</code> of the table, lifted " +
              "out unchanged.</p>",
            {
              cam: { ids: ["wte", "tokEmbed"], pad: 1.3 },
              focus: { ids: ["wte", "tokEmbed"] },
              hl: { wte: { a: [3, 0, 1, 1] }, tokEmbed: { a: [3, 0, 1, 1] } },
              dur: 9,
            }
          ),
          beat(
            "<p>That alone would leave the model blind to order: <code>ABC</code> and " +
              "<code>CBA</code> would look identical. So a second table adds a learned " +
              "<b>position embedding</b> &mdash; one distinct vector per slot in the context.</p>",
            {
              cam: { ids: ["wpe", "posEmbed"], pad: 1.35 },
              focus: { ids: ["wpe", "posEmbed"] },
              dur: 9,
            }
          ),
          beat(
            "<p>Add the two together, cell by cell, and the <b>residual stream</b> is born: an " +
              "11 &times; 48 grid that every later stage will read from and write back into. " +
              "Everything below this point is just editing these numbers.</p>",
            {
              cam: { ids: ["tokEmbed", "posEmbed", "embed"], pad: 1.3 },
              focus: { ids: ["tokEmbed", "posEmbed", "embed"] },
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "layernorm",
        title: "Layer Norm",
        beats: [
          beat(
            "<p>Deep stacks drift: values grow or shrink until nothing trains. <b>Layer norm</b> " +
              "fixes the scale, and it runs before every attention and every MLP in the " +
              "tower.</p>",
            {
              cam: { ids: [ln1, block0("ln1.mu"), block0("ln1.g")], pad: 1.45 },
              focus: { ids: [ln1, block0("ln1.mu"), block0("ln1.sigma"), block0("ln1.g"), block0("ln1.b")] },
              dur: 9,
            }
          ),
          beat(
            "<p>It works one token at a time, along a row. Take the 48 numbers of that row, " +
              "compute their <b>mean</b> and their <b>standard deviation</b> &mdash; the two thin " +
              "columns beside the slab &mdash; and nothing crosses between tokens.</p>",
            {
              cam: { ids: [block0("ln1.mu"), block0("ln1.sigma"), ln1], pad: 1.25 },
              focus: { ids: [block0("ln1.mu"), block0("ln1.sigma"), ln1] },
              hl: {
                "b0.ln1.mu": { a: [3, 5, 6, 1] },
                "b0.ln1.sigma": { a: [3, 5, 6, 1] },
                "b0.ln1.out": { a: [3, 5, 6, 0.8] },
              },
              dur: 10,
            }
          ),
          beat(
            "<p>Subtract the mean, divide by the deviation, and the row now has mean 0 and " +
              "variance 1. Then two learned bars &mdash; a <b>gain</b> and a <b>bias</b>, one " +
              "number per channel &mdash; let the model undo that normalisation wherever it turns " +
              "out to be unhelpful.</p>",
            {
              cam: { ids: [block0("ln1.g"), block0("ln1.b"), ln1], pad: 1.3 },
              focus: { ids: [block0("ln1.g"), block0("ln1.b"), ln1] },
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "attention",
        title: "Self Attention",
        beats: [
          beat(
            "<p>Everything so far treated tokens separately. <b>Self attention</b> is the one " +
              "place in the whole model where tokens are allowed to look at each other.</p>",
            {
              cam: { ids: [qkv].concat(allHeads("sm")), pad: 1.25 },
              focus: { ids: [qkv].concat(allHeads("q"), allHeads("k"), allHeads("v"), allHeads("sm")) },
              dur: 9,
            }
          ),
          beat(
            "<p>Each token first projects itself three ways, in a single matmul against a wall " +
              "three times as wide as the stream: a <b>query</b> (what am I looking for?), a " +
              "<b>key</b> (what do I offer?) and a <b>value</b> (what would I hand over?).</p>",
            {
              cam: { ids: [qkvW, qkv], pad: 1.25 },
              focus: { ids: [ln1, qkvW, block0("qkv.b"), qkv] },
              dur: 10,
            }
          ),
          beat(
            "<p>The 144 columns are then cut into <b>three heads</b> of 16. Each head gets its " +
              "own query, key and value slabs and runs the rest of attention independently &mdash; " +
              "three separate opinions about which tokens matter.</p>",
            {
              cam: { ids: allHeads("q").concat(allHeads("v")), pad: 1.2 },
              focus: { ids: allHeads("q").concat(allHeads("k"), allHeads("v")) },
              dur: 10,
            }
          ),
          beat(
            "<p>Inside a head, every query is compared with every key by a dot product, scaled " +
              "down by &radic;16. That fills a square <b>score</b> grid: row <i>i</i>, column " +
              "<i>j</i> is how interesting token <i>j</i> looks to token <i>i</i>.</p>",
            {
              cam: { ids: [head(0, 0, "scores")], pad: 1.5 },
              focus: { ids: [head(0, 0, "q"), head(0, 0, "k"), head(0, 0, "scores")] },
              hl: { "b0.h0.scores": { a: [3, 6, 7, 0.9] } },
              dur: 10,
            }
          ),
          beat(
            "<p>The upper triangle is dark on purpose. This is a <b>causal</b> model: a token " +
              "may only attend to itself and to tokens before it, because at generation time " +
              "the later ones do not exist yet.</p>",
            {
              cam: { ids: [head(0, 0, "scores")], pad: 1.35, pitch: 0.75 },
              focus: { ids: [head(0, 0, "scores")] },
              dur: 9,
            }
          ),
          beat(
            "<p>A <b>softmax</b> along each row turns those scores into weights that are " +
              "positive and sum to one &mdash; an attention pattern. Now every row is a recipe: " +
              "how much of each earlier token to mix in.</p>",
            {
              cam: { ids: [head(0, 0, "scores"), head(0, 0, "sm")], pad: 1.3 },
              focus: { ids: [head(0, 0, "scores"), head(0, 0, "smMax"), head(0, 0, "smSum"), head(0, 0, "sm")] },
              dur: 10,
            }
          ),
          beat(
            "<p>Finally the head mixes: each output row is the weighted average of the " +
              "<b>value</b> vectors, using that row of the pattern as the weights. Information " +
              "has now moved sideways between tokens for the first time.</p>",
            {
              cam: { ids: [head(0, 0, "sm"), head(0, 0, "v"), head(0, 0, "out")], pad: 1.25 },
              focus: { ids: [head(0, 0, "sm"), head(0, 0, "v"), head(0, 0, "out")] },
              hl: {
                "b0.h0.sm": { a: [3, 8, 9, 0.9] },
                "b0.h0.out": { a: [3, 8, 9, 0.9] },
              },
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "projection",
        title: "Projection",
        beats: [
          beat(
            "<p>The three heads finish with 16 channels each. Laid end to end they are 48 wide " +
              "again &mdash; exactly the width of the residual stream, which is not a coincidence.</p>",
            {
              cam: { ids: allHeads("out").concat([block0("vcomb")]), pad: 1.25 },
              focus: { ids: allHeads("out").concat([block0("vcomb")]) },
              dur: 9,
            }
          ),
          beat(
            "<p>One more weight wall &mdash; the <b>output projection</b> &mdash; lets the heads' " +
              "results be recombined rather than merely concatenated, so a channel of the " +
              "result can draw on all three heads at once.</p>",
            {
              cam: { ids: [block0("proj.w"), block0("proj")], pad: 1.3 },
              focus: { ids: [block0("vcomb"), block0("proj.w"), block0("proj.b"), block0("proj")] },
              dur: 10,
            }
          ),
          beat(
            "<p>Then the key move of the whole architecture: the result is <b>added back</b> " +
              "into the stream rather than replacing it. The green beam is that shortcut. " +
              "Attention only ever writes a correction.</p>",
            {
              cam: { ids: ["embed", block0("proj"), block0("resid1")], pad: 1.3 },
              focus: { ids: ["embed", block0("proj"), block0("resid1")] },
              sections: ["residual", "projection"],
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "mlp",
        title: "MLP",
        beats: [
          beat(
            "<p>The second half of a block is a plain two-layer network applied to each token " +
              "on its own. No token talks to another here &mdash; it is pure per-token thinking " +
              "about what attention just delivered.</p>",
            {
              cam: { ids: [block0("ln2.out"), block0("mlp.act"), block0("mlp.out")], pad: 1.2 },
              focus: {
                ids: [block0("ln2.out"), block0("mlp.w1"), block0("mlp.fc"), block0("mlp.act"), block0("mlp.w2"), block0("mlp.out")],
              },
              dur: 9,
            }
          ),
          beat(
            "<p>First a wide wall projects each 48-channel vector <b>up to 192</b> &mdash; four " +
              "times the width. This is where most of a real model's parameters live: about " +
              "two thirds of every transformer block.</p>",
            {
              cam: { ids: [block0("mlp.w1"), block0("mlp.fc")], pad: 1.2 },
              focus: { ids: [block0("mlp.w1"), block0("mlp.b1"), block0("mlp.fc")] },
              dur: 10,
            }
          ),
          beat(
            "<p>Then <b>GELU</b>, the only nonlinearity in the block: it passes positive values " +
              "through nearly untouched and squashes negatives smoothly toward zero. Compare " +
              "the two slabs and you can see the blue half being flattened.</p>",
            {
              cam: { ids: [block0("mlp.fc"), block0("mlp.act")], pad: 1.2 },
              focus: { ids: [block0("mlp.fc"), block0("mlp.act")] },
              dur: 10,
            }
          ),
          beat(
            "<p>A second wall squeezes 192 back down to 48, and once again the result is " +
              "<b>added</b> into the residual stream. The stream leaves the block exactly as " +
              "wide as it arrived.</p>",
            {
              cam: { ids: [block0("mlp.w2"), block0("mlp.out"), block0("resid2")], pad: 1.2 },
              focus: { ids: [block0("mlp.w2"), block0("mlp.out"), block0("resid1"), block0("resid2")] },
              sections: ["residual", "mlp"],
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "transformer",
        title: "Transformer",
        beats: [
          beat(
            "<p>Layer norm, attention, add; layer norm, MLP, add. That six-step pattern is a " +
              "<b>transformer block</b>, and it is the only structural idea in the model.</p>",
            {
              cam: { ids: [ln1, block0("resid2")], pad: 1.0, yaw: 0.35 },
              focus: { ids: [ln1, qkv, block0("resid1"), block0("ln2.out"), block0("mlp.act"), block0("resid2")] },
              dur: 10,
            }
          ),
          beat(
            "<p>Stack it. This model stacks three; GPT-2 small stacks twelve and GPT-3 stacks " +
              "ninety-six. Nothing changes except how many times the same block is repeated.</p>",
            {
              cam: { ids: null, pad: 1.05, yaw: 0.5 },
              focus: { ids: [block0("resid2"), B(1, "resid2"), B(2, "resid2")], dim: 0.55 },
              dur: 10,
            }
          ),
          beat(
            "<p>The residual stream is the spine running through all of it. Every block reads " +
              "the stream, works out a correction, and adds it back &mdash; which is why a " +
              "hundred-layer model still trains: the gradient has a straight path home.</p>",
            {
              cam: { ids: ["embed", B(2, "resid2")], pad: 1.05, yaw: 0.15 },
              focus: {
                ids: ["embed", block0("resid1"), block0("resid2"), B(1, "resid1"), B(1, "resid2"), B(2, "resid1"), B(2, "resid2")],
                dim: 0.62,
              },
              sections: ["residual"],
              dur: 11,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "softmax",
        title: "Softmax",
        beats: [
          beat(
            "<p><b>Softmax</b> shows up twice in this model, and it does the same thing both " +
              "times: turn a row of arbitrary scores into a row of probabilities that are " +
              "positive and add up to one.</p>",
            {
              cam: { ids: ["logits", "probs"], pad: 1.5 },
              focus: { ids: ["logits", "logits.max", "logits.sum", "probs"] },
              dur: 9,
            }
          ),
          beat(
            "<p>Exponentiate every entry, then divide by the total. Exponentials blow up fast, " +
              "so the largest entry of the row is subtracted first &mdash; that is what the thin " +
              "<b>max</b> column beside the slab is for. It cannot change the answer, only keep " +
              "it finite.</p>",
            {
              cam: { ids: ["logits.max", "logits.sum", "logits"], pad: 1.35 },
              focus: { ids: ["logits", "logits.max", "logits.sum"] },
              hl: {
                "logits.max": { a: [3, 10, 11, 1] },
                "logits.sum": { a: [3, 10, 11, 1] },
                logits: { a: [3, 10, 11, 0.85] },
              },
              dur: 10,
            }
          ),
          beat(
            "<p>The second copy runs inside every attention head, over each row of the score " +
              "grid. Same arithmetic, entirely different meaning: there it decides how much " +
              "of each earlier token to listen to.</p>",
            {
              cam: { ids: [head(0, 0, "scores"), head(0, 0, "sm")], pad: 1.3 },
              focus: { ids: [head(0, 0, "scores"), head(0, 0, "smMax"), head(0, 0, "smSum"), head(0, 0, "sm")] },
              dur: 10,
            }
          ),
        ],
      },
      {
        group: "Components",
        id: "output",
        title: "Output",
        beats: [
          beat(
            "<p>After the last block, one final layer norm tidies the stream, and then a single " +
              "wall &mdash; the <b>language model head</b> &mdash; projects each 48-channel vector " +
              "onto one score per vocabulary entry.</p>",
            {
              cam: { ids: ["lnf.out", "head.w", "logits"], pad: 1.3 },
              focus: { ids: ["lnf.out", "head.w", "logits"] },
              dur: 10,
            }
          ),
          beat(
            "<p>Those scores are the <b>logits</b>. Softmax turns each row into a distribution " +
              "over <b>A</b>, <b>B</b> and <b>C</b>: the model's answer for what should follow " +
              "that position.</p>",
            {
              cam: { ids: ["logits", "probs"], pad: 1.45 },
              focus: { ids: ["logits", "probs"] },
              dur: 9,
            }
          ),
          beat(
            "<p>Only the last row is used when generating. Take its most likely letter, append " +
              "it to the input, and run the whole tower again &mdash; that loop is what " +
              "<b>autoregression</b> means, and it is how the sorted answer gets written one " +
              "letter at a time.</p>",
            {
              cam: { ids: ["logits", "probs"], pad: 1.5, pitch: 0.82 },
              focus: { ids: ["logits", "probs"] },
              hl: { probs: { a: [3, 10, 11, 1] } },
              dur: 11,
            }
          ),
          beat(
            "<p>That is the entire model. Change the letters at the bottom left and everything " +
              "you have just watched is recomputed; switch models in the top bar to see the " +
              "same tower at GPT-2 and GPT-3 scale.</p>",
            { cam: { ids: null, pad: 1.2, yaw: 0.65 }, dur: 11 }
          ),
        ],
      },
    ];

    return sections;
  };

  // ------------------------------------------------------------- the player

  function Player(app) {
    this.app = app;
    this.sections = [];
    this.si = 0;
    this.bi = 0;
    this.t = 0;
    this.playing = false;
    this.listeners = [];
  }

  Player.prototype.setSections = function (s) {
    this.sections = s;
  };

  Player.prototype.onChange = function (fn) {
    this.listeners.push(fn);
  };

  Player.prototype.notify = function () {
    var self = this;
    this.listeners.forEach(function (f) {
      f(self);
    });
  };

  Player.prototype.section = function () {
    return this.sections[this.si];
  };
  Player.prototype.beat = function () {
    var s = this.section();
    return s && s.beats[this.bi];
  };

  Player.prototype.goTo = function (si, bi, opts) {
    this.si = Math.max(0, Math.min(si, this.sections.length - 1));
    var s = this.section();
    this.bi = Math.max(0, Math.min(bi || 0, s.beats.length - 1));
    this.t = 0;
    this.apply(opts);
    this.notify();
  };

  Player.prototype.goToId = function (id) {
    for (var i = 0; i < this.sections.length; i++) {
      if (this.sections[i].id === id) return this.goTo(i, 0);
    }
  };

  Player.prototype.next = function () {
    var s = this.section();
    if (this.bi + 1 < s.beats.length) this.goTo(this.si, this.bi + 1);
    else if (this.si + 1 < this.sections.length) this.goTo(this.si + 1, 0);
    else this.playing = false;
    this.notify();
  };

  Player.prototype.prev = function () {
    if (this.bi > 0) this.goTo(this.si, this.bi - 1);
    else if (this.si > 0) this.goTo(this.si - 1, this.sections[this.si - 1].beats.length - 1);
  };

  Player.prototype.play = function () {
    this.playing = true;
    this.notify();
  };
  Player.prototype.pause = function () {
    this.playing = false;
    this.notify();
  };
  Player.prototype.toggle = function () {
    this.playing = !this.playing;
    this.notify();
  };

  /** Push the current beat's camera, focus and highlights into the app. */
  Player.prototype.apply = function (opts) {
    var b = this.beat();
    if (!b) return;
    var app = this.app;
    if (b.cam) {
      var pose = app.poseFor(b.cam.ids, {
        pad: b.cam.pad,
        yaw: b.cam.yaw,
        pitch: b.cam.pitch,
      });
      app.flyTo(pose, opts && opts.instant ? 40 : 2.0);
    }
    if (b.focus) {
      var ids = {};
      b.focus.ids.forEach(function (id) {
        ids[id] = true;
      });
      var sections = {};
      (b.sections || []).forEach(function (s) {
        sections[s] = true;
      });
      app.focus = {
        ids: ids,
        strength: 0.4,
        dim: b.focus.dim === undefined ? 0.84 : b.focus.dim,
        sections: sections,
      };
    } else {
      app.focus = null;
    }
    app.highlights = b.hl || {};
    if (b.onEnter) b.onEnter(app);
  };

  Player.prototype.update = function (dt) {
    if (!this.playing) return;
    var b = this.beat();
    if (!b) return;
    this.t += dt;
    if (this.t >= b.dur) {
      var last = this.si === this.sections.length - 1 && this.bi === this.section().beats.length - 1;
      if (last) {
        this.playing = false;
        this.notify();
        return;
      }
      this.next();
    }
  };

  Player.prototype.progress = function () {
    var b = this.beat();
    return b ? Math.min(1, this.t / b.dur) : 0;
  };

  LV.Player = Player;
})(window);
