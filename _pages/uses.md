---
layout: page
title: Uses
permalink: /uses/
nav: false
description: The tools, gear, and rituals I rely on every day.
---

<div class="uses-page">

<p class="uses-intro">
  A running list of the things I rely on to make work feel like play.
  Strongly inspired by <a href="https://uses.tech" rel="noopener">uses.tech</a>.
</p>

<h2>Editor &amp; AI</h2>
<ul>
  <li><strong>Editor:</strong> <a href="https://cursor.com" rel="noopener">Cursor</a> — the IDE I write code in every day.</li>
  <li><strong>Coding agent:</strong> <a href="https://cline.bot" rel="noopener">Cline</a> — the one I work on, and the one I use.</li>
  <li><strong>Models:</strong> Whichever frontier model is having its best week.</li>
  <li><strong>Terminal:</strong> Ghostty + tmux + zsh.</li>
</ul>

<h2>Writing &amp; thinking</h2>
<ul>
  <li><strong>Notes:</strong> a paper notebook for the deep stuff, Apple Notes for the rest.</li>
  <li><strong>Drafts:</strong> plain Markdown in this very repo.</li>
  <li><strong>Long-form:</strong> Substack-style essays — but published here on
    <a href="{{ '/blog/' | relative_url }}">/blog</a> instead of locking them
    behind a third party.</li>
</ul>

<h2>Travel</h2>
<ul>
  <li><strong>Carry-on:</strong> 18kg, one bag, no checked luggage. See
    <a href="{{ '/pack/' | relative_url }}">/pack</a> if you want to fight with it.</li>
  <li><strong>Camera:</strong> mostly an iPhone, occasionally a borrowed mirrorless.</li>
</ul>

<h2>Snow</h2>
<ul>
  <li><strong>Skis:</strong> whatever the rental shop has that day. I keep meaning to commit.</li>
  <li><strong>Outerwear:</strong> the warmest thing in the closet. I am from Canada and somehow still always cold.</li>
</ul>

<h2>This site</h2>
<ul>
  <li><strong>Static generator:</strong> Jekyll, on a fork of <a href="https://github.com/alshedivat/al-folio" rel="noopener">al-folio</a>.</li>
  <li><strong>Hosting:</strong> GitHub Pages.</li>
  <li><strong>Images:</strong> Cloudinary with <code>q_auto,f_auto</code>.</li>
  <li><strong>Type:</strong> Fraunces for display, system sans for body.</li>
  <li><strong>Source:</strong> <a href="https://github.com/{{ site.github_username }}/{{ site.github_username }}.github.io" rel="noopener">GitHub</a>.</li>
</ul>

<p class="uses-meta">Last updated {{ site.time | date: "%-d %B %Y" }}.</p>

</div>

<style>
  .uses-page { max-width: 640px; }
  .uses-page p, .uses-page li { font-family: "Fraunces", Georgia, serif; line-height: 1.7; color: var(--global-text-color); }
  .uses-page h2 { font-family: "Fraunces", Georgia, serif; font-size: 1.35rem; font-weight: 500; margin-top: 2rem; margin-bottom: 0.5rem; }
  .uses-page ul { padding-left: 1.25rem; }
  .uses-page li { margin-bottom: 0.4rem; font-size: 1rem; }
  .uses-page .uses-intro { font-style: italic; color: var(--global-text-color-light); margin-bottom: 1.5rem; }
  .uses-page .uses-meta { margin-top: 2.5rem; font-size: 0.82rem; color: var(--global-text-color-light); border-top: 1px solid var(--global-divider-color); padding-top: 1rem; }
</style>
