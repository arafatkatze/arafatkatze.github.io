---
layout: page
title: LLM Visualization
description: A GPT drawn at full resolution — all 85,728 parameters, every activation, and a guided walkthrough from tokens to output probabilities. Runs the model live in your browser.
img: assets/img/llm_viz.webp
importance: 1
category: work
redirect: /llm-viz/
---

An interactive 3D visualization of a GPT language model, in the spirit of
[Brendan Bycroft's llm-viz](https://bbycroft.net/llm) but rebuilt from scratch:
original renderer, layout, walkthrough and weights.

The model on screen is real. It is an 85,728-parameter GPT — 3 transformer
blocks, 3 attention heads, 48 channels, an 11-token context — trained here on
the six-letter sorting task from Karpathy's minGPT demo, and it gets all 729
possible inputs right. The forward pass runs in JavaScript in the page, so
every square you can see is one of its actual numbers rather than a stand-in.

**What is on screen.** The model is a tower you descend. Horizontal slabs are
activations, one row per token and one column per channel; the vertical walls
between them are the weight matrices, so a matmul reads as "the row above times
the column of the wall lands in the cell below". Aggregates like layer-norm
means and softmax denominators are the thin columns beside their slab, and the
green beams running down the left are the residual stream skipping past each
block.

**What you can do.**

- Follow the guided walkthrough: embedding, layer norm, self attention,
  projection, MLP, the transformer block, softmax, output.
- Hover any cell to read its value together with the exact cells that produced
  it — hovering an output of a matmul lights up the input row and the weight
  column that were multiplied together.
- Change the six input letters and watch the whole tower recompute.
- Switch to GPT-2 small, GPT-2 XL or GPT-3 to see the identical structure at
  124 million, 1.6 billion and 175 billion parameters, or put all four side by
  side at true relative scale.

**How it is built.** No 3D library. A single instanced draw call renders every
tensor as a cube whose fragment shader converts face-local position into a cell
index, looks the number up in a float texture and colours it, dropping the grid
once cells fall below a couple of pixels — which is what lets GPT-3's 175
billion parameters be laid out without the browser giving up. Connections are
screen-space-thickened lines, labels are projected DOM, and a bright-pass and
separable blur give the glow.

Open the live demo: [/llm-viz/](/llm-viz/)
