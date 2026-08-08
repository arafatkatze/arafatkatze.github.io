/**
 * llm-viz boot + chrome wiring.
 *
 * Loads the trained weights, runs the model, builds the scene, and connects
 * the walkthrough player, the table of contents, the prompt editor and the
 * hover card to it.
 */
(function (global) {
  "use strict";

  var LV = global.LV;
  var $ = function (id) {
    return document.getElementById(id);
  };

  var state = {
    app: null,
    player: null,
    model: null, // loaded nano-gpt weights
    modelId: "nano-gpt",
    prompt: [2, 0, 1, 1, 2, 0],
    sequence: null,
    run: null,
    letters: ["A", "B", "C"],
    beatEls: [],
    firstRun: true,
  };

  // ------------------------------------------------------------------- boot

  function boot() {
    var canvas = $("gl");
    var app;
    try {
      app = new LV.App({ canvas: canvas, labelLayer: $("labels") });
    } catch (e) {
      $("loading").classList.add("hidden");
      $("fatal").classList.remove("hidden");
      $("fatal-msg").textContent = e.message;
      return;
    }
    state.app = app;

    LV.loadWeights("assets/")
      .then(function (m) {
        state.model = m;
        state.letters = m.meta.vocab;
        buildModelTabs();
        rebuild(true);
        state.player = new LV.Player(app);
        state.player.setSections(LV.buildWalkthrough(LV.MODELS[0]));
        state.player.onChange(renderNarrative);
        state.player.goTo(0, 0, { instant: true });
        renderTOC();
        renderNarrative();
        wireChrome();
        $("loading").classList.add("hidden");
        startLoop();
      })
      .catch(function (err) {
        $("loading").classList.add("hidden");
        $("fatal").classList.remove("hidden");
        $("fatal-msg").textContent = "Could not load the model weights: " + err.message;
      });
  }

  /** Rebuild the whole scene: after a prompt change or a model switch. */
  function rebuild(resetCamera) {
    var app = state.app;
    if (state.modelId === "compare") {
      state.sequence = LV.generate(state.model, state.prompt);
      state.run = LV.forward(state.model, state.sequence);
      var cmp = LV.buildCompareScene(state.model.w, state.run);
      app.setScene(cmp, { name: "compare" });
      renderCompareCard(cmp);
      renderPrompt();
      if (resetCamera) {
        // start on the tiny one, then pull back until GPT-3 fits: the size
        // difference only lands if you watch the camera travel it
        app.camTarget = null;
        app.camera.applySnapshot(app.poseFor(["m0:embed", "m0:probs"], { pad: 1.2 }));
        app.flyTo(app.poseFor(null, { pad: 1.1 }), 0.35);
      }
      return;
    }
    var cfgModel = modelById(state.modelId);
    var scene, meta;
    if (cfgModel.live) {
      state.sequence = LV.generate(state.model, state.prompt);
      state.run = LV.forward(state.model, state.sequence);
      var cfg = {
        T: state.model.cfg.blockSize,
        C: state.model.cfg.C,
        A: state.model.cfg.headSize,
        nHeads: state.model.cfg.nHeads,
        nBlocks: state.model.cfg.nBlocks,
        vocab: state.model.cfg.vocabSize,
      };
      scene = LV.buildScene(cfg, state.model.w, state.run, {
        detail: "full",
        letters: state.letters,
      });
      meta = cfgModel;
    } else {
      scene = LV.buildScene(cfgModel, null, null, { detail: "coarse" });
      meta = cfgModel;
    }
    app.setScene(scene, meta);
    renderModelCard(cfgModel);
    renderPrompt();
    if (resetCamera) resetView();
  }

  function modelById(id) {
    return (
      LV.MODELS.filter(function (m) {
        return m.id === id;
      })[0] || { live: false, name: "Compare scale" }
    );
  }

  /** The side-by-side view gets a log-scale readout instead of a model card. */
  function renderCompareCard(scene) {
    var max = Math.log10(
      LV.MODELS.reduce(function (a, m) {
        return Math.max(a, LV.paramCount(m).total);
      }, 1)
    );
    var min = 4;
    var rows = LV.MODELS.map(function (m, i) {
      var n = LV.paramCount(m).total;
      var pct = ((Math.log10(n) - min) / (max - min)) * 100;
      return (
        '<div class="cmp-row" data-i="' +
        i +
        '" title="fly to this model"><span class="cmp-name">' +
        LV.esc(m.name) +
        '</span><span class="cmp-bar"><i style="width:' +
        Math.max(4, pct).toFixed(1) +
        '%"></i></span><span class="cmp-val">' +
        LV.formatCount(n) +
        "</span></div>"
      );
    }).join("");
    $("modelcard").innerHTML =
      '<div class="mc-title"><span>Four models, one scale</span></div>' +
      '<div class="mc-blurb">Drawn side by side with the same cell size. ' +
      "GPT-3 is about two million times the size of nano-gpt, so the bar chart " +
      "below is logarithmic &mdash; the towers are not.</div>" +
      '<div class="cmp">' +
      rows +
      "</div>";
    Array.prototype.forEach.call($("modelcard").querySelectorAll(".cmp-row"), function (row) {
      row.onclick = function () {
        var p = scene.placements[+row.dataset.i];
        state.app.flyTo(state.app.poseFor(p.blockIds, { pad: 1.25 }), 1.1);
      };
    });
  }

  function resetView() {
    var app = state.app;
    app.flyTo(app.poseFor(null, { pad: 1.15 }), 3.5);
  }

  // ---------------------------------------------------------------- top bar

  function buildModelTabs() {
    var wrap = $("modeltabs");
    wrap.innerHTML = "";
    var entries = LV.MODELS.map(function (m) {
      return { id: m.id, name: m.name };
    });
    entries.push({ id: "compare", name: "Compare scale" });
    entries.forEach(function (e) {
      var b = document.createElement("button");
      b.textContent = e.name;
      b.className = e.id === state.modelId ? "active" : "";
      b.onclick = function () {
        if (state.modelId === e.id) return;
        state.modelId = e.id;
        Array.prototype.forEach.call(wrap.children, function (c) {
          c.classList.remove("active");
        });
        b.classList.add("active");
        rebuild(true);
        if (state.player) {
          state.player.pause();
          state.app.focus = null;
          state.app.highlights = {};
        }
        renderNarrative();
      };
      wrap.appendChild(b);
    });
  }

  function renderModelCard(m) {
    var p = LV.paramCount(m);
    var pieces = [
      { k: "embeddings", v: p.tokEmbed + p.posEmbed, c: "#a78bfa" },
      { k: "attention", v: m.nBlocks * (m.C * 3 * m.C + 3 * m.C + m.C * m.C + m.C), c: "#ff9a4d" },
      { k: "MLP", v: m.nBlocks * (2 * 4 * m.C * m.C + 5 * m.C), c: "#4aa3ff" },
      { k: "norms + head", v: p.total, c: "#57d9a3" },
    ];
    pieces[3].v = Math.max(0, p.total - pieces[0].v - pieces[1].v - pieces[2].v);
    var bar = pieces
      .map(function (x) {
        return '<i style="width:' + ((x.v / p.total) * 100).toFixed(2) + "%;background:" + x.c + '"></i>';
      })
      .join("");
    var key = pieces
      .map(function (x) {
        return '<span style="color:' + x.c + '">' + x.k + "</span>";
      })
      .join("");
    $("modelcard").innerHTML =
      '<div class="mc-title"><span>' +
      LV.esc(m.name) +
      '</span><span class="mc-params">' +
      LV.groupDigits(p.total) +
      " params</span></div>" +
      '<div class="mc-blurb">' +
      LV.esc(m.blurb) +
      "</div>" +
      '<div class="mc-grid">' +
      cell(m.T, "context") +
      cell(m.C, "channels") +
      cell(m.nHeads, "heads") +
      cell(m.nBlocks, "blocks") +
      "</div>" +
      '<div class="mc-bar">' +
      bar +
      "</div>" +
      '<div class="mc-key">' +
      key +
      "</div>";

    function cell(v, label) {
      return '<div class="mc-cell"><b>' + LV.groupDigits(v) + "</b><span>" + label + "</span></div>";
    }
  }

  // ------------------------------------------------------------ prompt bar

  function renderPrompt() {
    var live = modelById(state.modelId).live || state.modelId === "compare";
    var bar = $("promptbar");
    bar.style.display = live ? "" : "none";
    if (!live) return;
    var chips = $("prompt-chips");
    chips.innerHTML = "";
    state.prompt.forEach(function (tok, i) {
      var b = document.createElement("button");
      b.className = "tok";
      b.textContent = state.letters[tok];
      b.title = "click to change";
      b.onclick = function () {
        state.prompt[i] = (state.prompt[i] + 1) % state.letters.length;
        rebuild(false);
      };
      chips.appendChild(b);
    });

    // the model writes T - 6 letters into the context; the last one is read
    // off the final row's prediction
    var seq = state.sequence;
    var n = state.prompt.length;
    var answer = seq.slice(n).map(function (t) {
      return state.letters[t];
    });
    var V = state.model.cfg.vocabSize;
    var lastRow = seq.length - 1;
    var best = 0;
    for (var c = 1; c < V; c++) {
      if (state.run.probs.data[lastRow * V + c] > state.run.probs.data[lastRow * V + best]) best = c;
    }
    answer.push(state.letters[best]);
    $("prompt-answer").innerHTML = answer
      .map(function (l) {
        return '<span class="ans">' + l + "</span>";
      })
      .join("");
    var expect = state.prompt
      .map(function (t) {
        return state.letters[t];
      })
      .sort()
      .join("");
    var note = $("prompt-note");
    var ok = answer.join("") === expect;
    note.textContent = ok ? "sorted correctly" : "expected " + expect;
    note.className = "prompt-note" + (ok ? " good" : "");
  }

  // ------------------------------------------------------------------- TOC

  function renderTOC() {
    var list = $("toc-list");
    list.innerHTML = "";
    var lastGroup = null;
    state.player.sections.forEach(function (s, i) {
      if (s.group !== lastGroup) {
        var g = document.createElement("div");
        g.className = "toc-group";
        g.textContent = s.group;
        list.appendChild(g);
        lastGroup = s.group;
      }
      var el = document.createElement("div");
      el.className = "toc-item";
      el.innerHTML = '<span class="toc-dot"></span><span>' + LV.esc(s.title) + "</span>";
      el.onclick = function () {
        if (!modelById(state.modelId).live) {
          state.modelId = "nano-gpt";
          buildModelTabs();
          rebuild(false);
        }
        state.player.goTo(i, 0);
        state.player.play();
      };
      el.dataset.index = i;
      list.appendChild(el);
    });
  }

  function renderNarrative() {
    var p = state.player;
    if (!p) return;
    var s = p.section();
    $("nar-kicker").textContent = s.group;
    $("nar-title").textContent = s.title;
    var body = $("nar-body");
    if (body.dataset.section !== s.id) {
      body.dataset.section = s.id;
      body.innerHTML = "";
      state.beatEls = s.beats.map(function (b, i) {
        var el = document.createElement("div");
        el.className = "beat";
        el.innerHTML = b.html;
        el.onclick = function () {
          p.goTo(p.si, i);
          p.play();
        };
        body.appendChild(el);
        return el;
      });
      if (!modelById(state.modelId).live) {
        var note = document.createElement("div");
        note.className = "beat";
        note.innerHTML =
          "<p><i>The walkthrough runs on nano-gpt, where every value is real. " +
          "Pick <b>nano-gpt</b> in the top bar to follow along.</i></p>";
        body.appendChild(note);
      }
    }
    state.beatEls.forEach(function (el, i) {
      el.classList.toggle("active", i === p.bi);
    });
    if (state.beatEls[p.bi]) {
      var el = state.beatEls[p.bi];
      var top = el.offsetTop - body.clientHeight / 2 + el.clientHeight / 2;
      body.scrollTop = Math.max(0, top);
    }
    $("btn-play").innerHTML = p.playing ? "&#10073;&#10073;" : "&#9654;";
    $("beat-count").textContent = p.bi + 1 + "/" + s.beats.length;
    Array.prototype.forEach.call($("toc-list").children, function (c) {
      if (c.dataset && c.dataset.index !== undefined) {
        c.classList.toggle("active", +c.dataset.index === p.si);
      }
    });
  }

  // ---------------------------------------------------------------- chrome

  function wireChrome() {
    var app = state.app;
    var p = state.player;

    $("btn-play").onclick = function () {
      p.toggle();
    };
    $("btn-next").onclick = function () {
      p.next();
      p.play();
    };
    $("btn-prev").onclick = function () {
      p.prev();
      p.play();
    };
    $("btn-reset").onclick = resetView;
    $("btn-shuffle").onclick = function () {
      for (var i = 0; i < state.prompt.length; i++) {
        state.prompt[i] = Math.floor(Math.random() * state.letters.length);
      }
      rebuild(false);
    };
    $("btn-labels").onclick = function () {
      app.showLabels = !app.showLabels;
      this.classList.toggle("on", app.showLabels);
    };
    $("btn-labels").classList.add("on");
    $("btn-help").onclick = showHelp;

    $("toc-collapse").onclick = function () {
      $("toc").classList.add("hidden");
      $("toc-show").classList.add("show");
    };
    $("toc-show").onclick = function () {
      $("toc").classList.remove("hidden");
      $("toc").classList.add("force");
      $("toc-show").classList.remove("show");
    };
    $("nar-collapse").onclick = function () {
      $("narrative").classList.add("hidden");
      $("nar-show").classList.add("show");
    };
    $("nar-show").onclick = function () {
      $("narrative").classList.remove("hidden");
      $("nar-show").classList.remove("show");
    };

    $("btn-start").onclick = function () {
      $("welcome").classList.add("hidden");
      p.goTo(0, 0);
      p.play();
    };
    $("btn-explore").onclick = function () {
      $("welcome").classList.add("hidden");
      p.pause();
      app.focus = null;
      resetView();
    };

    app.on("interact", function () {
      // let people take the wheel without the tour yanking it back
    });

    app.on("frame", function (active) {
      updateHoverCard(active);
    });

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        p.toggle();
      } else if (e.code === "ArrowRight") {
        p.next();
      } else if (e.code === "ArrowLeft") {
        p.prev();
      } else if (e.key === "l" || e.key === "L") {
        $("btn-labels").click();
      } else if (e.key === "r" || e.key === "R") {
        resetView();
      } else if (e.key === "?") {
        showHelp();
      } else if (e.code === "Escape") {
        app.pinned = null;
        var help = $("helpoverlay");
        if (help) help.remove();
        $("welcome").classList.add("hidden");
      }
    });
  }

  function updateHoverCard(active) {
    var card = $("hovercard");
    var app = state.app;
    if (!active) {
      card.classList.remove("show");
      return;
    }
    var key = active.block.id + ":" + active.cell.join(",") + ":" + (app.pinned ? "p" : "h");
    if (card.dataset.key !== key) {
      card.dataset.key = key;
      card.innerHTML = LV.describe(app.scene, active.block, active.cell, state.letters);
      card.classList.toggle("pinned", !!app.pinned);
    }
    card.classList.add("show");
    var px = app.pointerPx || [40, 40];
    var w = card.offsetWidth,
      h = card.offsetHeight;
    var x = px[0] + 18,
      y = px[1] + 18;
    if (x + w > window.innerWidth - 12) x = px[0] - w - 18;
    if (y + h > window.innerHeight - 12) y = Math.max(60, px[1] - h - 18);
    card.style.left = x + "px";
    card.style.top = y + "px";
  }

  function showHelp() {
    var old = $("helpoverlay");
    if (old) {
      old.remove();
      return;
    }
    var el = document.createElement("div");
    el.className = "overlay";
    el.id = "helpoverlay";
    el.innerHTML =
      '<div class="overlay-card"><h1>Getting around</h1>' +
      '<div class="help-list">' +
      row("drag", "orbit the model") +
      row("shift + drag", "pan") +
      row("scroll / pinch", "zoom") +
      row("hover", "read a cell and light up the cells that made it") +
      row("click", "pin that cell, click again to release") +
      row("space", "play or pause the walkthrough") +
      row("&larr; &rarr;", "previous / next beat") +
      row("L", "toggle labels") +
      row("R", "reset the view") +
      "</div>" +
      "<p>The model is a GPT with 85,728 parameters trained on the six-letter sorting task. " +
      "Its weights, the forward pass, the layout and the renderer were all written for this page; " +
      "the numbers you hover are the real ones.</p>" +
      '<p class="overlay-credit">Concept inspired by <a href="https://bbycroft.net/llm" target="_blank" rel="noopener noreferrer">Brendan Bycroft\'s llm-viz</a>.</p>' +
      '<div class="overlay-actions"><button class="primary" id="help-close">Close</button></div></div>';
    document.getElementById("app").appendChild(el);
    $("help-close").onclick = function () {
      el.remove();
    };
    el.onclick = function (e) {
      if (e.target === el) el.remove();
    };

    function row(k, v) {
      return "<kbd>" + k + "</kbd><span>" + v + "</span>";
    }
  }

  // ------------------------------------------------------------- frame loop

  function startLoop() {
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (state.player) {
        var before = state.player.bi + state.player.si * 1000;
        state.player.update(dt);
        if (state.player.bi + state.player.si * 1000 !== before) renderNarrative();
        $("progress-fill").style.width = (state.player.progress() * 100).toFixed(1) + "%";
      }
      state.app.tick(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  LV.state = state;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
