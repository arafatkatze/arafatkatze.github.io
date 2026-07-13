---
layout: page
title: Budarina — Destinations
description: A homage to Marina Budarina's "Destinations" experiment — architectural roofs with a curtain of native characters that sway and cascade with rope physics as you scroll horizontally. Rebuilt from scratch, phones included.
img: assets/img/budarina_replica.webp
importance: 1
category: art
redirect: /budarina-replica/
---

A self-contained rebuild of the "Destinations" design experiment posted by
[Marina Budarina (@marina_uiux)](https://x.com/marina_uiux/status/2076410277109645741)
(original design by Marina Budarina).

Every destination is an architectural roof — a Forbidden City eave, a Japanese
red roof, a Kazakh shanyrak — with a hanging "body" of native characters
beneath it. Each vertical strand is its own little **Verlet rope** anchored to
the roof, so the glyphs obey gravity, hold their rectangular block at rest, and
sway or cascade sideways with the momentum of your scroll. Scrolling
horizontally scrubs between destinations while the curtains swing; the headline
re-reveals character by character for each place.

This version runs on phones too: swipe to move between destinations, with fling
momentum feeding the same physics. The whole scene is drawn on one `<canvas>`
(roofs + curtains) with a crisp DOM layer on top for the chrome, and the roof
art is traced from the original WIP clip.

Open the live demo: [/budarina-replica/](/budarina-replica/)
