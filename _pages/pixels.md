---
layout: page
title: Pixel Board
permalink: /pixels/
description: collaborative pixel art, leave your mark
nav: true
nav_order: 7
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
    <button class="pixel-btn pixel-btn-accent" id="submit-board" title="Send your art to Ara">submit to ara</button>
  </div>
</div>

<div class="pixel-modal" id="pixel-submit-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pixel-modal-title">
  <div class="pixel-modal-overlay" data-pixel-close></div>
  <div class="pixel-modal-card" role="document">
    <button class="pixel-modal-close" data-pixel-close aria-label="Close">&times;</button>

    <div id="pixel-submit-form-state">
      <h4 class="pixel-modal-title" id="pixel-modal-title">send your art to ara</h4>
      <p class="pixel-modal-subtitle">
        your board gets delivered as an image, along with a little note from you.
        totally anonymous &mdash; no name, no email, just pixels and words.
      </p>
      <div class="pixel-modal-preview">
        <img id="pixel-submit-preview" alt="Preview of your pixel board" />
        <span class="pixel-modal-preview-caption" id="pixel-submit-caption"></span>
      </div>
      <form id="pixel-submit-form" novalidate>
        <textarea
          id="pixel-submit-message"
          class="pixel-modal-textarea"
          placeholder="say something with your art... what is it? why did you make it? (required)"
          rows="3"
          maxlength="1000"
        ></textarea>
        <span class="pixel-modal-error" id="pixel-submit-error"></span>
        <button type="submit" class="pixel-modal-send" id="pixel-submit-send">send it</button>
      </form>
    </div>

    <div id="pixel-submit-success-state" class="pixel-modal-success" style="display: none;">
      <div class="pixel-modal-success-art" aria-hidden="true"></div>
      <h4 class="pixel-modal-title">sent!</h4>
      <p class="pixel-modal-subtitle">your art and your words are on their way to ara. thanks for leaving your mark.</p>
      <button type="button" class="pixel-modal-send" data-pixel-close>back to the board</button>
    </div>
  </div>
</div>

<script src="{{ '/assets/js/pixel-board.js' | relative_url }}" defer></script>
