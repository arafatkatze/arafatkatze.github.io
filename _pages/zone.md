---
layout: page
title: ara.zone
permalink: /zone/
description: a little corner of the old web — links, news, and good vibes
nav: true
nav_order: 9
---

<div class="zone-page" id="zone-page">

  <div class="zone-window zone-window--main">
    <div class="zone-titlebar">
      <span class="zone-titlebar-dots" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="zone-titlebar-title">ara.zone — welcome.exe</span>
      <span class="zone-titlebar-spacer"></span>
    </div>

    <div class="zone-window-body">
      <header class="zone-hero">
        <div class="zone-logo" aria-hidden="true">
          <span>a</span><span>r</span><span>a</span><span>.</span><span>z</span><span>o</span><span>n</span><span>e</span>
        </div>
        <div class="zone-marquee" aria-label="welcome message">
          <div class="zone-marquee-track" id="zone-marquee">
            ✦ welcome to my little corner of the web ✦ thanks for stopping by ✦ grab a snack, stay a while ✦ best viewed with your heart open ✦
          </div>
        </div>
        <p class="zone-tagline">
          hi, i'm <strong>Ara</strong> 🌱 — this is the cozy, hand-built hub for everything i make and love.
          poke around the boxes below. everything links somewhere.
        </p>
      </header>
    </div>
  </div>

  <section class="zone-links" aria-label="site links">
    <h2 class="zone-section-title">⊹ the links ⊹</h2>
    <div class="zone-grid" id="zone-grid">
      <a class="zone-box" href="{{ '/' | relative_url }}" style="--box: 1;">
        <span class="zone-box-emoji">🏠</span><span class="zone-box-label">home</span>
      </a>
      <a class="zone-box" href="{{ '/travel/' | relative_url }}" style="--box: 2;">
        <span class="zone-box-emoji">🌍</span><span class="zone-box-label">travel</span>
      </a>
      <a class="zone-box" href="{{ '/blog/' | relative_url }}" style="--box: 3;">
        <span class="zone-box-emoji">✍️</span><span class="zone-box-label">blog</span>
      </a>
      <a class="zone-box" href="{{ '/reading/' | relative_url }}" style="--box: 4;">
        <span class="zone-box-emoji">📚</span><span class="zone-box-label">reading</span>
      </a>
      <a class="zone-box" href="{{ '/projects/' | relative_url }}" style="--box: 5;">
        <span class="zone-box-emoji">🛠️</span><span class="zone-box-label">projects</span>
      </a>
      <a class="zone-box" href="{{ '/photography/' | relative_url }}" style="--box: 6;">
        <span class="zone-box-emoji">📷</span><span class="zone-box-label">photos</span>
      </a>
      <a class="zone-box" href="{{ '/pixels/' | relative_url }}" style="--box: 7;">
        <span class="zone-box-emoji">🎨</span><span class="zone-box-label">pixel board</span>
      </a>
      <a class="zone-box" href="{{ '/nightsky/' | relative_url }}" style="--box: 8;">
        <span class="zone-box-emoji">✨</span><span class="zone-box-label">night sky</span>
      </a>
      <a class="zone-box" href="{{ '/pack/' | relative_url }}" style="--box: 9;">
        <span class="zone-box-emoji">🧳</span><span class="zone-box-label">pack game</span>
      </a>
      <a class="zone-box" href="{{ '/cv/' | relative_url }}" style="--box: 10;">
        <span class="zone-box-emoji">📄</span><span class="zone-box-label">cv</span>
      </a>
      <a class="zone-box" href="{{ '/repositories/' | relative_url }}" style="--box: 11;">
        <span class="zone-box-emoji">💾</span><span class="zone-box-label">code</span>
      </a>
      <a class="zone-box" href="mailto:{{ site.email }}" style="--box: 12;">
        <span class="zone-box-emoji">💌</span><span class="zone-box-label">say hi</span>
      </a>
    </div>
  </section>

  <div class="zone-news-launcher" id="zone-news-launcher" hidden>
    <button type="button" class="zone-btn" id="zone-news-reopen">📰 open aranews</button>
  </div>

  <section class="zone-lower">

    <div class="zone-window zone-window--news" id="zone-news-window">
      <div class="zone-titlebar" id="zone-news-handle">
        <span class="zone-titlebar-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="zone-titlebar-title">📰 aranews</span>
        <button type="button" class="zone-titlebar-close" id="zone-news-close" aria-label="Close news window" title="Close">×</button>
      </div>
      <div class="zone-window-body zone-news-body">
        <p class="zone-news-hint">↕ drag the bar to move me around ↕</p>
        <article class="zone-news-item">
          <span class="zone-news-date">jun 17, 2026</span>
          <h4>this zone is live ✦</h4>
          <p>built a cozy retro hub for the site. it's a love letter to the old web — tiny boxes, draggable windows, and a marquee that won't quit.</p>
        </article>
        <article class="zone-news-item">
          <span class="zone-news-date">recently</span>
          <h4>new little games</h4>
          <p>try <a href="{{ '/pixels/' | relative_url }}">pixel board</a>, gaze at the <a href="{{ '/nightsky/' | relative_url }}">night sky</a>, or help me <a href="{{ '/pack/' | relative_url }}">pack my suitcase</a>.</p>
        </article>
        <article class="zone-news-item">
          <span class="zone-news-date">always</span>
          <h4>writing in the open</h4>
          <p>philosophy, love letters, and travel stories live on the <a href="{{ '/blog/' | relative_url }}">blog</a>. come read the messy first drafts of my thoughts.</p>
        </article>
      </div>
    </div>

    <aside class="zone-sidebar">
      <div class="zone-card zone-pet" id="zone-pet" title="give the pet a pat!">
        <div class="zone-pet-sprite" id="zone-pet-sprite" aria-hidden="true">🐱</div>
        <p class="zone-pet-status" id="zone-pet-status">click me!</p>
      </div>

      <div class="zone-card zone-status">
        <h3 class="zone-card-title">now vibing</h3>
        <p class="zone-status-line" id="zone-vibe">loading good vibes…</p>
      </div>

      <div class="zone-card zone-buttons">
        <h3 class="zone-card-title">web buttons</h3>
        <div class="zone-button-row">
          <span class="zone-88x31 b1">best<br>viewed<br>with ❤</span>
          <span class="zone-88x31 b2">made<br>by<br>hand</span>
          <span class="zone-88x31 b3">no<br>AI<br>art</span>
          <span class="zone-88x31 b4">100%<br>good<br>vibes</span>
        </div>
      </div>
    </aside>

  </section>

  <footer class="zone-statusbar" aria-label="status bar">
    <span class="zone-statusbar-cell" id="zone-clock">--:--:--</span>
    <span class="zone-statusbar-cell">you are visitor #<strong id="zone-counter">0000</strong></span>
    <span class="zone-statusbar-cell zone-statusbar-construction">🚧 always under construction 🚧</span>
  </footer>

</div>

<script src="{{ '/assets/js/zone.js' | relative_url }}" defer></script>
