/**
 * llm-viz probe: given a cell you are pointing at, work out which cells
 * elsewhere in the model produced it, and describe the arithmetic in words.
 *
 * Highlight ranges are expressed as [kind, lo, hi, strength] where kind is
 * 1 for a column (X), 2 for a wall row (Y) and 3 for a token row (Z).
 */
(function (global) {
  "use strict";

  var LV = (global.LV = global.LV || {});

  function col(i, s) {
    return [1, i, i + 1, s === undefined ? 1 : s];
  }
  function rowY(i, s) {
    return [2, i, i + 1, s === undefined ? 1 : s];
  }
  function rowZ(i, s) {
    return [3, i, i + 1, s === undefined ? 1 : s];
  }
  function allOf(kind, n, s) {
    return [kind, 0, n, s === undefined ? 0.45 : s];
  }

  LV.provenance = function (scene, block, cell) {
    var out = {};
    var x = cell[0],
      y = cell[1],
      z = cell[2];

    function put(id, spec) {
      var b = scene.byId[id];
      if (!b) return;
      out[id] = spec;
    }

    // the cell under the cursor
    if (block.form === "wall") {
      out[block.id] = { a: col(x), b: rowY(y), mode: "and" };
    } else if (block.form === "bar") {
      out[block.id] = { a: col(x) };
    } else if (block.form === "column") {
      out[block.id] = { a: rowZ(z) };
    } else {
      out[block.id] = { a: col(x), b: rowZ(z), mode: "and" };
    }

    var src = block.src;
    if (!src) return out;

    switch (src.type) {
      case "matmul":
        put(src.input, { a: rowZ(z, 0.85) });
        put(src.weight, { a: col(x, 0.85) });
        if (src.bias) put(src.bias, { a: col(x) });
        break;
      case "add":
        src.inputs.forEach(function (id) {
          put(id, { a: col(x), b: rowZ(z), mode: "and" });
        });
        break;
      case "elementwise":
        put(src.input, { a: col(x), b: rowZ(z), mode: "and" });
        break;
      case "norm":
        put(src.input, { a: rowZ(z, 0.8) });
        put(src.mu, { a: rowZ(z) });
        put(src.sigma, { a: rowZ(z) });
        put(src.gain, { a: col(x) });
        put(src.bias, { a: col(x) });
        break;
      case "rowstat":
        put(src.input, { a: rowZ(z, 0.8) });
        break;
      case "lookup":
        var tok = scene.byId[src.index];
        var tokenId = tok && tok.dataOffset >= 0 ? scene.pool[tok.dataOffset + z] : -1;
        if (tokenId >= 0) put(src.table, { a: rowZ(tokenId, 0.85), b: col(x), mode: "and" });
        put(src.index, { a: rowZ(z) });
        break;
      case "rowpick":
        put(src.table, { a: rowZ(z, 0.85), b: col(x), mode: "and" });
        break;
      case "slice":
        put(src.input, { a: col(src.offset + x), b: rowZ(z), mode: "and" });
        break;
      case "attnScore":
        put(src.q, { a: rowZ(z, 0.85) });
        put(src.k, { a: rowZ(x, 0.85) });
        break;
      case "softmax":
        put(src.input, { a: rowZ(z, 0.5) });
        if (src.max) put(src.max, { a: rowZ(z) });
        if (src.sum) put(src.sum, { a: rowZ(z) });
        break;
      case "attnAgg":
        put(src.sm, { a: rowZ(z, 0.8) });
        put(src.v, { a: col(x, 0.8) });
        break;
      case "concat":
        if (src.heads && src.heads.length) {
          var hIdx = Math.floor(x / src.headSize);
          var local = x % src.headSize;
          var hp = src.heads[Math.min(hIdx, src.heads.length - 1)];
          put(hp + "out", { a: col(local), b: rowZ(z), mode: "and" });
        }
        break;
    }
    return out;
  };

  function fmt(v) {
    if (!isFinite(v)) return "masked";
    if (v === 0) return "0";
    var a = Math.abs(v);
    if (a >= 1000 || a < 0.001) return v.toExponential(2);
    return v.toFixed(a < 1 ? 4 : 3);
  }
  LV.fmtValue = fmt;

  /** Build the HTML shown in the hover card. */
  LV.describe = function (scene, block, cell, vocabLetters) {
    var parts = [];
    var idx = [];
    var nx = block.cells[0],
      ny = block.cells[1],
      nz = block.cells[2];
    if (block.form === "wall") {
      idx.push(labelPair(block.rowAxis || "row", cell[1], ny));
      idx.push(labelPair(block.colAxis || "column", cell[0], nx));
    } else if (block.form === "bar") {
      idx.push(labelPair(block.colAxis || "index", cell[0], nx));
    } else if (block.form === "column") {
      idx.push(labelPair(block.rowAxis || "row", cell[2], nz));
    } else {
      if (nz > 1) idx.push(labelPair(block.rowAxis || "row", cell[2], nz));
      if (nx > 1) idx.push(labelPair(block.colAxis || "column", cell[0], nx));
    }
    var v = LV.cellValue(scene, block, cell);
    parts.push('<div class="lv-card-title">' + esc(block.name) + "</div>");
    parts.push('<div class="lv-card-idx">' + idx.join('<span class="sep">&middot;</span>') + "</div>");
    if (block.dataOffset >= 0) {
      var extra = "";
      if (block.id === "tokens" && vocabLetters) {
        extra = ' <span class="lv-tok">' + vocabLetters[Math.round(v)] + "</span>";
      }
      parts.push('<div class="lv-card-value">' + fmt(v) + extra + "</div>");
    }
    if (block.formula) {
      parts.push('<div class="lv-card-formula">' + esc(block.formula) + "</div>");
    }
    if (block.about) parts.push('<div class="lv-card-about">' + esc(block.about) + "</div>");
    var dims =
      block.form === "wall"
        ? [block.cells[1], block.cells[0]]
        : block.form === "column"
        ? [block.cells[2]]
        : block.form === "bar"
        ? [block.cells[0]]
        : [block.cells[2], block.cells[0]];
    parts.push(
      '<div class="lv-card-shape">' +
        dims.join(" &times; ") +
        " cells" +
        (block.dataOffset >= 0 && block.valueMax
          ? " &middot; peak |value| " + fmt(block.valueMax)
          : "") +
        "</div>"
    );
    return parts.join("");
  };

  function labelPair(name, i, n) {
    return '<span class="lv-k">' + esc(name) + "</span> " + i + '<span class="lv-of">/' + n + "</span>";
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }
  LV.esc = esc;
})(window);
