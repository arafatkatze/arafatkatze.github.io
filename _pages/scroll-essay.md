---
layout: page
title: Scroll, and find your place
permalink: /scroll-essay/
description:
nav: false
---

{%- assign data = site.data.scroll_essay -%}
{%- assign total = data.fragments | size | plus: 1 -%}
{%- assign repeats = data.repeats | default: 5 -%}

<div class="scroll-essay js-se-root">
  <div class="se-container js-se-container">
    <main class="se-main">
      <div class="se-paragraphs js-se-paragraphs" data-length="{{ total }}">
        {%- for r in (1..repeats) -%}
          <span class="se-item js-se-item se-item--title" data-index="0"><strong>{{ data.title }}</strong> <small>{{ data.subtitle }}</small></span><span class="se-spacer"> </span>
          {%- for f in data.fragments -%}
          <span class="se-item js-se-item" data-index="{{ forloop.index }}">{{ f }}</span><span class="se-spacer"> </span>
          {%- endfor -%}
        {%- endfor -%}
      </div>
    </main>
    <div class="se-counter js-se-progress" title="Jump back to the start">0%</div>
  </div>

  <div class="se-scroll js-se-mirror"><div></div></div>

  <a class="se-back" href="{{ '/projects/' | relative_url }}">← projects</a>
</div>

<script src="{{ '/assets/js/scroll-essay.js' | relative_url }}" defer></script>
