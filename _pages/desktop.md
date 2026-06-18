---
layout: page
title: arOS
permalink: /desktop/
description: my website, reimagined as a little desktop operating system. drag the windows around.
nav: false
---

<div class="os" id="araos" aria-label="arOS desktop environment">

  <!-- ───────────────────────── desktop ───────────────────────── -->
  <div class="os-desktop" id="os-desktop">

    <!-- desktop icons -->
    <div class="os-icons" id="os-icons" role="list">
      <button class="os-icon" data-open="win-about" role="listitem">
        <span class="os-icon-glyph">🪪</span><span class="os-icon-label">About Me</span>
      </button>
      <button class="os-icon" data-open="win-projects" role="listitem">
        <span class="os-icon-glyph">🗂️</span><span class="os-icon-label">Projects</span>
      </button>
      <button class="os-icon" data-open="win-writing" role="listitem">
        <span class="os-icon-glyph">✍️</span><span class="os-icon-label">Writing</span>
      </button>
      <button class="os-icon" data-open="win-reading" role="listitem">
        <span class="os-icon-glyph">📚</span><span class="os-icon-label">Reading</span>
      </button>
      <button class="os-icon" data-open="win-gallery" role="listitem">
        <span class="os-icon-glyph">🖼️</span><span class="os-icon-label">Gallery</span>
      </button>
      <button class="os-icon" data-open="win-files" role="listitem">
        <span class="os-icon-glyph">📂</span><span class="os-icon-label">Documents</span>
      </button>
      <button class="os-icon" data-open="win-contact" role="listitem">
        <span class="os-icon-glyph">📡</span><span class="os-icon-label">Contact</span>
      </button>
      <button class="os-icon" data-open="win-terminal" role="listitem">
        <span class="os-icon-glyph">⌨️</span><span class="os-icon-label">Terminal</span>
      </button>
      <button class="os-icon" data-open="win-readme" role="listitem">
        <span class="os-icon-glyph">💡</span><span class="os-icon-label">read.me</span>
      </button>
    </div>

    <!-- ───────────────────────── windows ───────────────────────── -->

    <!-- readme / how it works -->
    <section class="os-window" id="win-readme" data-title="read.me" data-icon="💡"
             data-x="120" data-y="70" data-w="520">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">💡</span> read.me</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <h3>welcome to arOS 🌸</h3>
        <p>
          this is my whole website pretending to be a tiny desktop operating system,
          inspired by the lovely <a href="https://zvava.org/" target="_blank" rel="noopener">zvava.org</a>.
        </p>
        <p><strong>how it works:</strong></p>
        <ul>
          <li>every app is a <em>window</em>, drag it by its title bar.</li>
          <li>the three dots resize it: <span class="os-dot os-dot-y"></span> minimize, <span class="os-dot os-dot-g"></span> maximize, <span class="os-dot os-dot-r"></span> close.</li>
          <li>open apps from the <strong>desktop icons</strong>, the <strong>◈ start</strong> menu, or the <strong>taskbar</strong>.</li>
          <li>try the <strong>⌨️ Terminal</strong>, type <code>help</code>.</li>
        </ul>
        <p class="os-muted">all of this is plain HTML, CSS and vanilla JS, copy it into any site.</p>
      </div>
    </section>

    <!-- documents / finder: lists every post + project, opens them in-OS -->
    <section class="os-window" id="win-files" data-title="Documents" data-icon="📂"
             data-x="150" data-y="80" data-w="560">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">📂</span> Documents</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <p class="os-muted">every post &amp; project, opened right here in the OS (tweets and images included).</p>
        <div class="os-files" id="os-files"><p class="os-doc-status">loading…</p></div>
      </div>
    </section>

    <!-- about -->
    <section class="os-window" id="win-about" data-title="About Me" data-icon="🪪"
             data-x="200" data-y="120" data-w="560">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">🪪</span> About Me</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <div class="os-about">
          <img class="os-about-pic"
               src="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto,w_240/v1772992166/profile_photo_fvaxo9.png"
               alt="Ara Khan" loading="lazy">
          <div>
            <h3>Ara Khan</h3>
            <p>This is Ara (pronounced <em>era</em>, like the beginning of an era). I live at the
            intersection of art, love and beauty. My primary expression of art is technology,
            and I spend most days <a href="/projects/AgenticAi/">playing with AI</a>.</p>
            <p><a class="os-button" href="/">open the real homepage →</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- projects -->
    <section class="os-window" id="win-projects" data-title="Projects" data-icon="🗂️"
             data-x="260" data-y="90" data-w="500">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">🗂️</span> Projects</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <p class="os-muted">a few things I've been making. click any to open it right here.</p>
        <div class="os-files" id="os-projects"><p class="os-doc-status">loading…</p></div>
      </div>
    </section>

    <!-- writing -->
    <section class="os-window" id="win-writing" data-title="Writing" data-icon="✍️"
             data-x="320" data-y="140" data-w="520">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">✍️</span> Writing</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <p class="os-muted">philosophy, love letters, travel stories, the wild west of my thoughts. click any to read it right here.</p>
        <div class="os-files" id="os-writing"><p class="os-doc-status">loading…</p></div>
      </div>
    </section>

    <!-- reading -->
    <section class="os-window os-window--app" id="win-reading" data-title="Reading" data-icon="📚"
             data-x="240" data-y="90" data-w="600">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">📚</span> Reading</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <p class="os-muted">my bookshelf. click a cover to find the book.</p>
        <div class="os-books">
          {% assign books = site.books | sort: "date" | reverse %}
          {% for book in books %}
            {% assign s = book.status | downcase | strip %}
            {% if s == "reading" %}{% assign badge = "Reading" %}{% assign badgeclass = "is-reading" %}
            {% elsif s == "interested" or s == "queued" or s == "to-read" %}{% assign badge = "To Read" %}{% assign badgeclass = "is-toread" %}
            {% else %}{% assign badge = "Read" %}{% assign badgeclass = "is-read" %}{% endif %}
            <a class="os-book" href="{{ book.buy_link | default: book.url | relative_url }}" target="_blank" rel="noopener">
              <span class="os-book-cover">
                {% if book.cover %}<img src="{{ book.cover | relative_url }}" alt="{{ book.title }}" loading="lazy">
                {% elsif book.olid %}<img src="https://covers.openlibrary.org/b/olid/{{ book.olid }}-L.jpg?default=false" alt="{{ book.title }}" loading="lazy">
                {% elsif book.isbn %}<img src="https://covers.openlibrary.org/b/isbn/{{ book.isbn }}-L.jpg?default=false" alt="{{ book.title }}" loading="lazy">{% endif %}
                <span class="os-book-badge {{ badgeclass }}">{{ badge }}</span>
              </span>
              <span class="os-book-title">{{ book.title }}</span>
              <span class="os-book-author">{{ book.author }}</span>
            </a>
          {% endfor %}
        </div>
      </div>
    </section>

    <!-- gallery -->
    <section class="os-window os-window--app" id="win-gallery" data-title="Gallery" data-icon="🖼️"
             data-x="200" data-y="90" data-w="640">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">🖼️</span> Gallery</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <p class="os-muted">my photographs, grouped by place. click any to enlarge.</p>
        {% for project in site.data.photography.projects %}
          <div class="os-gallery-group">
            <h4 class="os-gallery-head">{{ project.title }}</h4>
            <div class="os-gallery-grid">
              {% for url in project.images %}
                <button type="button" class="os-gallery-photo" data-full="{{ url }}" aria-label="View a photograph from {{ project.title }}">
                  <img src="{{ url | replace: 'w_1600', 'w_400' }}" alt="{{ project.title }} photograph" loading="lazy" decoding="async">
                </button>
              {% endfor %}
            </div>
          </div>
        {% endfor %}
        <p><a class="os-button" href="/photography/">open the full photography gallery →</a></p>
      </div>
    </section>

    <!-- contact -->
    <section class="os-window" id="win-contact" data-title="Contact" data-icon="📡"
             data-x="300" data-y="130" data-w="440">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">📡</span> Contact</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body">
        <p class="os-muted">say hi, I always write back.</p>
        <ul class="os-filelist">
          <li><a href="https://github.com/arafatkatze" target="_blank" rel="noopener">🐙 github / arafatkatze</a></li>
          <li><a href="/cv/">📄 curriculum vitae</a></li>
          <li><a href="/">🏠 homepage &amp; socials</a></li>
        </ul>
      </div>
    </section>

    <!-- terminal -->
    <section class="os-window os-window--term" id="win-terminal" data-title="Terminal" data-icon="⌨️"
             data-x="180" data-y="200" data-w="560">
      <header class="os-window-bar">
        <span class="os-window-title"><span class="os-window-ico">⌨️</span> ara@arOS: ~</span>
        <div class="os-window-controls">
          <button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>
          <button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>
          <button class="os-ctl os-close" title="Close" aria-label="Close"></button>
        </div>
      </header>
      <div class="os-window-body os-term-body" id="os-term">
        <div class="os-term-out" id="os-term-out"></div>
        <div class="os-term-line">
          <span class="os-term-prompt">ara@arOS:~$</span>
          <input class="os-term-input" id="os-term-input" type="text" autocomplete="off"
                 spellcheck="false" aria-label="terminal input">
        </div>
      </div>
    </section>

  </div><!-- /os-desktop -->

  <!-- ───────────────────────── start menu ───────────────────────── -->
  <nav class="os-startmenu" id="os-startmenu" aria-hidden="true">
    <div class="os-startmenu-head">arOS</div>
    <button class="os-startitem" data-open="win-about"><span>🪪</span> About Me</button>
    <button class="os-startitem" data-open="win-projects"><span>🗂️</span> Projects</button>
    <button class="os-startitem" data-open="win-writing"><span>✍️</span> Writing</button>
    <button class="os-startitem" data-open="win-reading"><span>📚</span> Reading</button>
    <button class="os-startitem" data-open="win-files"><span>📂</span> Documents</button>
    <button class="os-startitem" data-open="win-gallery"><span>🖼️</span> Gallery</button>
    <button class="os-startitem" data-open="win-contact"><span>📡</span> Contact</button>
    <button class="os-startitem" data-open="win-terminal"><span>⌨️</span> Terminal</button>
    <button class="os-startitem" data-open="win-readme"><span>💡</span> read.me</button>
    <div class="os-startmenu-sep"></div>
    <a class="os-startitem" href="/"><span>🚪</span> Exit to homepage</a>
  </nav>

  <!-- ───────────────────────── taskbar ───────────────────────── -->
  <footer class="os-taskbar" id="os-taskbar">
    <button class="os-start" id="os-start" aria-haspopup="true" aria-expanded="false">
      <span class="os-start-glyph">◈</span> start
    </button>
    <div class="os-tasks" id="os-tasks"></div>
    <div class="os-tray">
      <span class="os-tray-net" title="connected">▢▣▤</span>
      <time class="os-clock" id="os-clock">--:--</time>
    </div>
  </footer>

  <!-- lightbox for gallery photos -->
  <div class="os-lightbox" id="os-lightbox" aria-hidden="true">
    <button class="os-lightbox-close" id="os-lightbox-close" type="button" aria-label="Close">&times;</button>
    <img class="os-lightbox-img" id="os-lightbox-img" alt="">
  </div>

</div>

{% comment %} Every post + project, injected as JSON so the Documents app can
open each one inside a window (content is lazy-fetched from the real page). {% endcomment %}
<script id="os-docs" type="application/json">
{
  "posts": [
    {% for post in site.posts %}{"title": {{ post.title | jsonify }}, "url": {{ post.url | relative_url | jsonify }}, "date": {{ post.date | date: "%b %-d, %Y" | jsonify }}, "year": {{ post.date | date: "%Y" | jsonify }}}{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ],
  "projects": [
    {% for p in site.projects %}{"title": {{ p.title | jsonify }}, "url": {{ p.url | relative_url | jsonify }}, "date": {{ p.category | default: "" | jsonify }}, "year": {{ p.category | default: "" | jsonify }}, "redirect": {% if p.redirect %}{% if p.redirect contains "://" %}{{ p.redirect | jsonify }}{% else %}{{ p.redirect | relative_url | jsonify }}{% endif %}{% else %}""{% endif %}}{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ]
}
</script>

<script src="{{ '/assets/js/desktop-os.js' | relative_url }}" defer></script>
