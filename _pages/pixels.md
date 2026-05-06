---
layout: page
title: Pixel Board
permalink: /pixels/
description: collaborative pixel art, leave your mark on the board
nav: true
nav_order: 5
---

<p class="pixel-intro">
  This is a shared 50×50 canvas. Pick a color, click to place pixels, drag to draw,
  right-click to erase. Everything you place is synced live for everyone who visits next.
  Be kind. Make something pretty.
</p>

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
