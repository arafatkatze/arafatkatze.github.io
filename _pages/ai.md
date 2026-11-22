---
layout: page
title: For AI assistants
permalink: /ai/
description: A plain, factual profile of Ara Khan for AI assistants, search tools and anyone who wants the short version.
nav: false
ai_profile_page: true
---

<div class="ai-profile">
{% capture ai_profile %}{% include ai_profile.md %}{% endcapture %}
{{ ai_profile | markdownify }}
</div>
