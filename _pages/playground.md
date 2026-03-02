---
layout: page
title: Playground
permalink: /playground/
description: experiments, toys, and things I built because they're cool
nav: true
nav_order: 7
---

<div class="pg-wrapper">

  <div class="pg-intro">
    <span class="pg-intro-line">this is my creative sandbox.</span>
    <span class="pg-intro-line">interactive experiments, generative art, and small things</span>
    <span class="pg-intro-line">that don't fit anywhere else.</span>
    <span class="pg-intro-line pg-intro-line--blank"></span>
    <span class="pg-intro-line">click around. break things. enjoy.<span class="pg-intro-cursor"></span></span>
  </div>

  <!-- ── 01 · Flow Field ─────────────────────── -->
  <div class="pg-experiment" id="pg-exp-flow">
    <div class="pg-exp-header">
      <span class="pg-exp-num">01</span>
      <div>
        <h3 class="pg-exp-title">Flow Field</h3>
        <p class="pg-exp-desc">generative art from mathematical noise — unique every visit</p>
      </div>
    </div>
    <div class="pg-exp-body">
      <div class="pg-canvas-wrap">
        <canvas id="pg-flow-canvas"></canvas>
      </div>
    </div>
    <div class="pg-exp-controls">
      <button class="pg-btn" id="pg-flow-regen">regenerate</button>
      <button class="pg-btn" id="pg-flow-save">save png</button>
    </div>
  </div>

  <!-- ── 02 · Life in Numbers ─────────────────── -->
  <div class="pg-experiment" id="pg-exp-stats">
    <div class="pg-exp-header">
      <span class="pg-exp-num">02</span>
      <div>
        <h3 class="pg-exp-title">Life in Numbers</h3>
        <p class="pg-exp-desc">data art from a life in motion</p>
      </div>
    </div>
    <div class="pg-exp-body">
      <div class="pg-stats-grid" id="pg-stats">
        <div class="pg-stat-card">
          <canvas class="pg-stat-ring" width="52" height="52"></canvas>
          <span class="pg-stat-value">0</span>
          <span class="pg-stat-label">Countries</span>
        </div>
        <div class="pg-stat-card">
          <canvas class="pg-stat-ring" width="52" height="52"></canvas>
          <span class="pg-stat-value">0</span>
          <span class="pg-stat-label">Destinations</span>
        </div>
        <div class="pg-stat-card">
          <canvas class="pg-stat-ring" width="52" height="52"></canvas>
          <span class="pg-stat-value">0</span>
          <span class="pg-stat-label">Continents</span>
        </div>
        <div class="pg-stat-card">
          <canvas class="pg-stat-ring" width="52" height="52"></canvas>
          <span class="pg-stat-value">0</span>
          <span class="pg-stat-label">One Suitcase</span>
        </div>
        <div class="pg-stat-card">
          <canvas class="pg-stat-ring" width="52" height="52"></canvas>
          <span class="pg-stat-value">0</span>
          <span class="pg-stat-label">Creative Pages</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── 03 · Particle Garden ─────────────────── -->
  <div class="pg-experiment" id="pg-exp-particles">
    <div class="pg-exp-header">
      <span class="pg-exp-num">03</span>
      <div>
        <h3 class="pg-exp-title">Particle Garden</h3>
        <p class="pg-exp-desc">click anywhere to plant particles — they bloom, drift, and fade</p>
      </div>
    </div>
    <div class="pg-exp-body">
      <div class="pg-canvas-wrap">
        <canvas id="pg-particle-canvas"></canvas>
      </div>
    </div>
    <div class="pg-exp-controls">
      <button class="pg-btn" id="pg-particle-clear">clear</button>
    </div>
  </div>

  <!--
    ── Adding a new experiment ──────────────────
    Copy any pg-experiment block above, update the id, number,
    title, description, and body content. Add matching JS in
    assets/js/playground.js and call it from the DOMContentLoaded handler.
  -->

  <div class="pg-more">
    <p class="pg-more-text">
      more experiments brewing
      <span class="pg-more-dot"></span>
      <span class="pg-more-dot"></span>
      <span class="pg-more-dot"></span>
    </p>
  </div>

</div>

<script src="{{ '/assets/js/playground.js' | relative_url }}" defer></script>
