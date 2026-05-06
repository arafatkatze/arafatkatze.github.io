---
layout: page
title: Sketch
permalink: /sketch/
nav: false
description: A shared sheet of paper. Add one stroke. Watch it become something with everyone else's strokes.
---

<div class="sketch-page">

  <p class="sketch-eyebrow">sketch</p>
  <h1 class="sketch-title">One stroke each.</h1>
  <p class="sketch-rules">
    A shared sheet of paper. Draw a single stroke (mouse, finger, stylus —
    whatever you have). When you lift, it joins everyone else's strokes on the
    same sheet. The colours rotate gently with the time of day. Be kind, be
    curious. Don't ruin it for the next person.
  </p>

  <div class="sketch-toolbar">
    <span class="sketch-meta" id="sketch-meta">loading the sheet…</span>
    <span class="sketch-spacer"></span>
    <button type="button" class="sketch-btn" id="sketch-undo" disabled aria-label="Undo your most recent stroke">↶ undo my last</button>
    <a class="sketch-btn sketch-btn--ghost" id="sketch-download" download="ara-sketch.png" href="#" aria-label="Download the current sheet as PNG">↓ save image</a>
  </div>

  <div class="sketch-stage">
    <canvas id="sketch-canvas" width="1200" height="800" aria-label="Shared sketch canvas. Drag to draw a single stroke."></canvas>
    <div class="sketch-stage__hint" id="sketch-hint">drag to draw your stroke ✶</div>
  </div>

  <p class="sketch-after" id="sketch-after"></p>

  <noscript>
    <p class="sketch-noscript">
      The sketch sheet needs JavaScript. If you'd rather just say hi the old-fashioned way: <a href="mailto:{{ site.email }}">email me</a>.
    </p>
  </noscript>

</div>

<script src="{{ '/assets/js/sketch.js' | relative_url | bust_file_cache }}" defer></script>
