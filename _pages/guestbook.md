---
layout: page
title: Guestbook
permalink: /guestbook/
nav: false
description: Leave a single line. I'll see it. Strangers will see it.
---

<p class="guestbook-intro">
  An open page. Drop a line — a thought, a hello, a song you can't get out of
  your head. It shows up here for everyone who wanders in next. Be kind.
</p>

<form id="guestbook-form" class="guestbook-form" autocomplete="off">
  <label for="gb-name" class="sr-only">Name (or initials)</label>
  <input
    id="gb-name"
    name="name"
    class="guestbook-input guestbook-input--name"
    type="text"
    maxlength="32"
    placeholder="Name or initials"
    required
  />
  <label for="gb-msg" class="sr-only">A single line</label>
  <input
    id="gb-msg"
    name="msg"
    class="guestbook-input guestbook-input--msg"
    type="text"
    maxlength="180"
    placeholder="A single line — what's on your mind?"
    required
  />
  <button type="submit" class="guestbook-submit">Sign &nbsp;→</button>
</form>

<p class="guestbook-meta" id="guestbook-meta">loading entries…</p>

<ul class="guestbook-list" id="guestbook-list" aria-live="polite"></ul>

<noscript>
  <p class="guestbook-noscript">
    The guestbook needs JavaScript to load and submit entries. If you'd rather just say hi the old-fashioned way: <a href="mailto:{{ site.email }}">email me</a>.
  </p>
</noscript>

<script src="{{ '/assets/js/guestbook.js' | relative_url | bust_file_cache }}" defer></script>
