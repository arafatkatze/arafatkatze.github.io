---
layout: page
title: Pixel Board
permalink: /pixels/
description: collaborative pixel art, leave your mark
nav: true
nav_order: 6
use_fraunces: true
---

<div id="pixel-board-app">
  <div class="pixel-controls">
    <div class="color-palette">
      <span class="palette-label">color:</span>
      <div class="color-swatches" id="color-swatches"></div>
    </div>
    <div class="pixel-info" id="pixel-info">
      <span id="pixel-position">hover to see position</span>
      <span id="pixel-meta">click to place</span>
      <span id="pixel-count">0 pixels placed</span>
    </div>
  </div>
  <div class="pixel-grid-wrapper">
    <canvas id="pixel-canvas"></canvas>
  </div>
  <div class="pixel-actions">
    <button class="pixel-btn" id="download-board" title="Download as image">download</button>
  </div>
</div>

<script src="{{ '/assets/js/pixel-board.js' | relative_url }}" defer></script>
