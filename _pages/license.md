---
layout: page
title: License
permalink: /license/
nav: false
description: How you may (and may not) use the writing, art, photography, and code on this site.
_styles: >
  .license-page .license-card {
    border: 1px solid var(--global-divider-color);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
    background-color: var(--global-card-bg-color, var(--global-bg-color));
  }
  .license-page .license-card h3 {
    margin-top: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .license-page .license-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    background-color: var(--global-theme-color);
    color: #fff;
  }
  .license-page .attribution-example {
    border-left: 3px solid var(--global-theme-color);
    padding: 0.5rem 1rem;
    background-color: var(--global-code-bg-color, rgba(0,0,0,0.03));
    border-radius: 0 8px 8px 0;
  }
---

<div class="license-page" markdown="1">

Everything you find here — the words, the photographs, the art, and the code — took real time and care to make. You are warmly welcome to read it, share it, and be inspired by it. I only ask one thing in return: **don't pass my work off as your own, and credit me when you use it.**

The short version: **be decent, give credit, and ask before you make money from my work.**

<div class="license-card" markdown="1">

### Writing, Art &amp; Photography <span class="license-badge">CC BY-NC 4.0</span>

All original creative content on this site — essays, letters, philosophy posts, photographs, paintings, and other artwork — is &copy; {{ site.time | date: '%Y' }} {{ site.first_name }} {{ site.last_name }}, released under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).

That means you are free to **share** and **adapt** this material, as long as you:

- **Give attribution** — credit me by name and link back to this site.
- **Don't use it commercially** — no selling it, no ads around it, no using it to sell something else, without my written permission.

</div>

<div class="license-card" markdown="1">

### Source Code &amp; Theme <span class="license-badge">MIT</span>

The code that runs this website is built on the [al-folio](https://github.com/alshedivat/al-folio) Jekyll theme and is licensed under the [MIT License](https://github.com/arafatkatze/arafatkatze.github.io/blob/master/LICENSE). You may reuse, modify, and redistribute the code freely, provided you keep the original copyright and license notices intact.

Note: the MIT license covers the **code only** — not the writing, art, or photographs above.

</div>

## How to attribute

If you quote, repost, or build on my work, a simple credit is perfect. For example:

<div class="attribution-example" markdown="1">
"{{ site.title }}" by Ara Khan — [{{ site.url }}]({{ site.url }}) — licensed under CC BY-NC 4.0.
</div>

A visible link back to the original page is appreciated.

## Want to do more?

If you'd like to use something commercially, reproduce it at scale, or you're just not sure whether your use is okay — please [reach out](mailto:{{ site.email }}). I'm friendly, and the answer is usually yes when you ask.

</div>
