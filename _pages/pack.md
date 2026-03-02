---
layout: page
title: Pack My Suitcase
permalink: /pack/
description: I live out of 18kg. Think you can do better?
nav: true
nav_order: 8
---

<div class="pack-page" id="pack-page">

  <div class="pack-bar-wrap" id="pack-bar-wrap">
    <div class="pack-bar">
      <div class="pack-bar-text" id="pack-bar-text">0 / 18.0 kg</div>
      <div class="pack-bar-track">
        <div class="pack-bar-fill" id="pack-bar-fill"></div>
      </div>
    </div>
  </div>

  <div class="pack-reaction" id="pack-reaction"></div>

  <div class="pack-hero">
    <div class="pack-hero-emoji">🧳</div>
    <h2 class="pack-hero-title">I live out of an 18kg suitcase.</h2>
    <p class="pack-hero-sub">Everything below is what I own. Change it if you can — but anything in means something out.</p>
  </div>

  <div class="pack-section">
    <h3 class="pack-section-title">What's Inside</h3>
    <div class="pack-grid" id="pack-inside"></div>
  </div>

  <div class="pack-section">
    <h3 class="pack-section-title">The Shelf</h3>
    <p class="pack-section-sub">Think something's missing? Go ahead, add it. But the suitcase is almost full.</p>
    <div id="pack-shelf"></div>
  </div>

  <div class="pack-section" id="pack-receipt-wrap" style="display:none;">
    <h3 class="pack-section-title">Your Changes</h3>
    <div id="pack-receipt"></div>
  </div>

  <div class="pack-stats">
    <div>Average checked bag: <strong>23kg</strong> for a 1-week trip.</div>
    <div>This suitcase: <strong>18kg</strong> for <em>everything</em>.</div>
  </div>

</div>

<script src="{{ '/assets/js/pack-suitcase.js' | relative_url }}" defer></script>
