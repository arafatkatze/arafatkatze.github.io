---
layout: page
title: Now
permalink: /now/
nav: false
description: A snapshot of what I'm into right now — updated whenever life nudges me to.
---

<div class="now-page">

<p class="now-stamp">San Francisco · {{ site.time | date: "%B %Y" }}</p>

<h2>Building</h2>
<p>
  I'm an AI engineer at <a href="https://cline.bot">Cline</a>, working on
  agentic coding tools that feel less like operating a machine and more like
  collaborating with a careful, opinionated friend. I write a lot about this
  on <a href="https://twitter.com/{{ site.twitter_username }}">Twitter</a>
  and gather the threads on <a href="{{ '/projects/AgenticAi/' | relative_url }}">/projects/AgenticAi</a>.
</p>

<h2>Reading</h2>
<p>
  Re-reading <em>Letters to a Young Poet</em> for the fourth time. Slowly making
  my way through <em>Sovietistan</em>. The full shelf lives at
  <a href="{{ '/reading/' | relative_url }}">/reading</a>.
</p>

<h2>Writing</h2>
<p>
  My most recent essay is
  <a href="{{ '/philosophy/2026/04/26/limerance' | relative_url }}"><em>The gift of an agonizing limerance</em></a>.
  Everything else lives at <a href="{{ '/blog/' | relative_url }}">/blog</a>.
</p>

<h2>Moving my body</h2>
<p>
  Trying to ski as much as the Bay Area's geography permits (Tahoe weekends),
  walking everywhere in the city, and slowly losing my fight with the climbing gym.
</p>

<h2>Looking for</h2>
<p>
  Long walks with curious strangers. Book recommendations that hurt a little.
  Art collaborators in SF. A ski buddy for the next storm cycle.
</p>

<p class="now-meta">
  Inspired by <a href="https://nownownow.com/about" rel="noopener">Derek Sivers' "now" page idea</a>.
  Last updated {{ site.time | date: "%-d %B %Y" }}.
</p>

</div>

<style>
  .now-page { max-width: 640px; font-family: "Fraunces", Georgia, serif; }
  .now-page h2 { font-family: "Fraunces", Georgia, serif; font-size: 1.4rem; font-weight: 500; margin-top: 2rem; margin-bottom: 0.5rem; color: var(--global-text-color); }
  .now-page p { font-family: "Fraunces", Georgia, serif; font-size: 1.05rem; line-height: 1.7; color: var(--global-text-color); }
  .now-page .now-stamp { font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 0.95rem; color: var(--global-text-color-light); margin-bottom: 1.75rem; }
  .now-page .now-meta { margin-top: 3rem; font-size: 0.82rem; color: var(--global-text-color-light); border-top: 1px solid var(--global-divider-color); padding-top: 1rem; }
</style>
