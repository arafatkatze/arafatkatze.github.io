---
layout: page
title: Colophon
permalink: /colophon/
nav: false
description: How this site is made.
---

<div class="colophon-page">

<p class="colophon-lede">
  This site is small, hand-tended, and built with care. Here's what's under the hood.
</p>

<h2>Generator</h2>
<p>
  Jekyll 4.4 on a heavily-customised fork of
  <a href="https://github.com/alshedivat/al-folio" rel="noopener">al-folio</a>,
  hosted on GitHub Pages.
</p>

<h2>Front page</h2>
<p>
  The mosaic on the home page is a hand-built bento grid (no plugin, no
  templating shortcut) — every tile is declared in
  <a href="https://github.com/{{ site.github_username }}/{{ site.github_username }}.github.io/blob/master/_pages/about.md" rel="noopener"><code>_pages/about.md</code></a>
  and rendered by
  <a href="https://github.com/{{ site.github_username }}/{{ site.github_username }}.github.io/blob/master/_includes/content_blocks.liquid" rel="noopener"><code>_includes/content_blocks.liquid</code></a>.
</p>

<h2>Type</h2>
<ul>
  <li><strong>Display:</strong> <a href="https://fonts.google.com/specimen/Fraunces" rel="noopener">Fraunces</a> — warm, slightly literary, slightly drunk.</li>
  <li><strong>Body:</strong> the system sans stack inherited from Bootstrap.</li>
  <li><strong>Code:</strong> the highlight.js GitHub theme.</li>
</ul>

<h2>Colour</h2>
<p>
  One brand triple: a warm rose accent, a paper off-white, and a deep ink. All
  defined in
  <a href="https://github.com/{{ site.github_username }}/{{ site.github_username }}.github.io/blob/master/_sass/_variables.scss" rel="noopener"><code>_sass/_variables.scss</code></a>.
</p>

<h2>Images</h2>
<p>
  Photos are served from Cloudinary with <code>q_auto,f_auto</code> so each
  visitor gets the best format their browser supports. Local images live in
  <code>assets/img/</code> and are kept lean.
</p>

<h2>The globe</h2>
<p>
  The interactive earth on <a href="{{ '/travel/' | relative_url }}">/travel</a>
  is built with <a href="https://github.com/vasturiano/globe.gl" rel="noopener">globe.gl</a>
  on top of three.js, with hand-rolled HUD chrome.
</p>

<h2>Source</h2>
<p>
  Everything is open and forkable on
  <a href="https://github.com/{{ site.github_username }}/{{ site.github_username }}.github.io" rel="noopener">GitHub</a>.
  If you spot a typo, a bug, or a more beautiful idea — pull requests welcome.
</p>

</div>

<style>
  .colophon-page {
    max-width: 640px;
  }
  .colophon-page p,
  .colophon-page li {
    font-family: "Fraunces", Georgia, serif;
    line-height: 1.7;
    color: var(--global-text-color);
  }
  .colophon-page h2 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 1.35rem;
    font-weight: 500;
    margin-top: 1.75rem;
    margin-bottom: 0.5rem;
  }
  .colophon-page ul {
    padding-left: 1.25rem;
  }
  .colophon-page li {
    margin-bottom: 0.4rem;
  }
  .colophon-page .colophon-lede {
    font-style: italic;
    color: var(--global-text-color-light);
    margin-bottom: 1.5rem;
    font-size: 1.05rem;
  }
</style>
