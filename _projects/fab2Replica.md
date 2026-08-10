---
layout: page
title: Scroll-to-Fly Effect
description: An homage to fab2.com's flying camera — scroll and the page lifts off, twists, glides, and dives to the next stop. Rebuilt from scratch, phones included; content is placeholder for now.
img: assets/img/fab2_replica.webp
importance: 1
category: art
hidden: true
redirect: /fab2-replica/
---

A self-contained rebuild of the "scroll to fly" camera from
[fab2.com](https://fab2.com/) (original design by the fab2 team).

Nothing on the page ever moves — the sections are pinned to one big flat
"wafer" at fixed positions and rotations, and a camera of four numbers
(x, y, view width, roll) is the only thing animating. Scrolling scrubs the
camera along a path whose every leg is walked in phases: **lift** out until
both stops fit, **twist** to the next stop's bearing, **glide** across the
surface, **dive** back in. That's why it never feels like a circle — each
move flies off in its own direction.

This version also runs on phones: swipe to fly, pinch to zoom out to the
whole wafer, tap a stop to fly there. The words on it are placeholder copy,
meant to be swapped for real content later.

Open the live demo: [/fab2-replica/](/fab2-replica/)
