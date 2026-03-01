---
layout: page
title: Pixels
permalink: /pixels/
description: Paint a live-style pixel board.
nav: true
nav_order: 5
---

<div class="pixel-board-page">
  <p class="pixel-board-intro">
    Paint your own pixel scene. Click and drag to draw, zoom in for detail, and your board stays saved in this browser.
  </p>

  <section class="pixel-board-toolbar" aria-label="Pixel board controls">
    <div class="pixel-control-block">
      <label class="pixel-board-label" for="pixel-custom-color">Color</label>
      <input id="pixel-custom-color" type="color" value="#7f5af0" />
      <div id="pixel-palette" class="pixel-palette" aria-label="Quick palette"></div>
    </div>

    <div class="pixel-control-block">
      <label class="pixel-board-label" for="pixel-zoom">Zoom</label>
      <input id="pixel-zoom" type="range" min="8" max="24" value="12" step="1" />
      <span id="pixel-zoom-value" class="pixel-chip">12x</span>
    </div>

    <div class="pixel-control-block pixel-board-actions">
      <button id="pixel-clear" type="button" class="btn btn-sm btn-outline-secondary">Clear</button>
      <button id="pixel-randomize" type="button" class="btn btn-sm btn-outline-primary">Randomize</button>
      <button id="pixel-download" type="button" class="btn btn-sm btn-dark">Download PNG</button>
    </div>
  </section>

  <div class="pixel-board-meta">
    <span class="pixel-chip">Selected <strong id="pixel-selected-value">#7f5af0</strong></span>
    <span class="pixel-chip">Filled <strong id="pixel-filled-count">0</strong></span>
    <span class="pixel-chip">Hover <strong id="pixel-hover-cell">--</strong></span>
  </div>

  <div class="pixel-board-canvas-shell">
    <canvas id="pixel-board-canvas" width="768" height="768" aria-label="Pixel drawing board"></canvas>
  </div>

  <p class="pixel-board-tip">
    Tip: use white to erase pixels. Randomize is great for quickly sketching inspiration.
  </p>
</div>

<style>
  .pixel-board-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .pixel-board-intro,
  .pixel-board-tip {
    margin: 0;
    color: var(--global-text-color-light);
  }

  .pixel-board-toolbar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
    padding: 1rem;
    border: 1px solid var(--global-divider-color);
    border-radius: 14px;
    background: var(--global-card-bg-color);
  }

  .pixel-control-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pixel-board-label {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  #pixel-custom-color {
    width: 56px;
    height: 36px;
    border: 1px solid var(--global-divider-color);
    border-radius: 8px;
    background: transparent;
    padding: 0;
  }

  .pixel-palette {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pixel-swatch {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    border: 2px solid transparent;
    box-shadow: 0 0 0 1px var(--global-divider-color);
    transition: transform 0.14s ease;
    cursor: pointer;
  }

  .pixel-swatch:hover {
    transform: scale(1.1);
  }

  .pixel-swatch.is-active {
    border-color: var(--global-theme-color);
    transform: scale(1.1);
  }

  .pixel-board-actions {
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .pixel-board-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pixel-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--global-divider-color);
    border-radius: 999px;
    padding: 0.3rem 0.7rem;
    font-size: 0.86rem;
    background: var(--global-card-bg-color);
  }

  .pixel-board-canvas-shell {
    padding: 0.9rem;
    border: 1px solid var(--global-divider-color);
    border-radius: 16px;
    background: var(--global-card-bg-color);
    overflow: auto;
    max-height: 72vh;
  }

  #pixel-board-canvas {
    display: block;
    margin: 0 auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    cursor: crosshair;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
  }
</style>

<script defer src="{{ '/assets/js/pixel-board.js' | relative_url | bust_file_cache }}"></script>
