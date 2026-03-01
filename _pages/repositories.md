---
layout: page
permalink: /repositories/
title: Opensource
description:
nav: true
nav_order: 4
---

<div class="contrib-page">

<div class="contrib-hero">
  <div class="contrib-hero__inner">
    <div class="contrib-avatar-wrap">
      <img
        class="contrib-avatar"
        id="contrib-avatar"
        src="https://github.com/{{ site.data.repositories.github_users[0] }}.png?size=240"
        alt="{{ site.data.repositories.github_users[0] }}"
      />
    </div>
    <div class="contrib-info">
      <h1 class="contrib-name" id="contrib-name">{{ site.first_name }} {{ site.last_name }}</h1>
      <p class="contrib-bio" id="contrib-bio"></p>
      <div class="contrib-meta" id="contrib-meta"></div>
    </div>
  </div>

  <div class="contrib-stats">
    <div class="contrib-stat">
      <span class="contrib-stat__number is-loading" data-stat="repos">&nbsp;</span>
      <span class="contrib-stat__label">Repositories</span>
    </div>
    <div class="contrib-stat">
      <span class="contrib-stat__number is-loading" data-stat="stars">&nbsp;</span>
      <span class="contrib-stat__label">Stars Earned</span>
    </div>
    <div class="contrib-stat">
      <span class="contrib-stat__number is-loading" data-stat="followers">&nbsp;</span>
      <span class="contrib-stat__label">Followers</span>
    </div>
    <div class="contrib-stat">
      <span class="contrib-stat__number is-loading" data-stat="following">&nbsp;</span>
      <span class="contrib-stat__label">Following</span>
    </div>
  </div>
</div>

<div class="contrib-section">
  <h2 class="contrib-section__title">Technical Palette</h2>
  <div class="contrib-languages" id="contrib-languages">
    <div class="contrib-lang-bar" id="contrib-lang-bar"></div>
    <div class="contrib-lang-legend" id="contrib-lang-legend"></div>
  </div>
</div>

<div class="contrib-section">
  <h2 class="contrib-section__title">Open Source Contributions</h2>
  <div class="contrib-grid">
    {% for item in site.data.repositories.github_repos %}
      {% assign parts = item.repo | split: '/' %}
      {% assign is_own = false %}
      {% for user in site.data.repositories.github_users %}
        {% if parts[0] == user %}
          {% assign is_own = true %}
        {% endif %}
      {% endfor %}
      <a
        href="https://github.com/{{ item.repo }}"
        class="contrib-card"
        data-repo="{{ item.repo }}"
        style="--card-index: {{ forloop.index0 }}"
      >
        <div class="contrib-card__accent"></div>
        <div class="contrib-card__header">
          <div class="contrib-card__title-row">
            {% unless is_own %}
              <span class="contrib-card__owner">{{ parts[0] }}&thinsp;/&thinsp;</span>
            {% endunless %}
            <span class="contrib-card__name">{{ parts[1] }}</span>
          </div>
          {% if item.role %}
            <span class="contrib-card__role">{{ item.role }}</span>
          {% endif %}
        </div>
        <p class="contrib-card__desc is-loading" data-desc-for="{{ item.repo }}">Fetching project info&hellip;</p>
        {% if item.highlight %}
          <p class="contrib-card__highlight">
            <i class="fas fa-quote-left"></i>
            {{ item.highlight }}
          </p>
        {% endif %}
        <div class="contrib-card__footer">
          <span class="contrib-card__lang" data-lang-for="{{ item.repo }}"></span>
          <div class="contrib-card__stats">
            <span class="contrib-card__stat" data-stars-for="{{ item.repo }}">
              <i class="far fa-star"></i> &mdash;
            </span>
            <span class="contrib-card__stat" data-forks-for="{{ item.repo }}">
              <i class="fas fa-code-branch"></i> &mdash;
            </span>
          </div>
        </div>
      </a>
    {% endfor %}
  </div>
</div>

</div>

<script>
(function () {
  var GITHUB_USER = '{{ site.data.repositories.github_users[0] }}';
  var CACHE_TTL = 3600000;

  var LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Ruby: '#701516', Go: '#00ADD8', Rust: '#dea584', Java: '#b07219',
    'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95',
    Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#c22d40',
    Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
    Vue: '#41b883', Svelte: '#ff3e00', Lua: '#000080', Perl: '#0298c3',
    R: '#198CE7', Haskell: '#5e5086', Elixir: '#6e4a7e', Clojure: '#db5855',
    'Jupyter Notebook': '#DA5B0B', Makefile: '#427819', Dockerfile: '#384d54',
    SWIG: '#FFA500', Cuda: '#3A4E3A'
  };

  function getCached(key) {
    try {
      var raw = localStorage.getItem('contrib_' + key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) { localStorage.removeItem('contrib_' + key); return null; }
      return obj.data;
    } catch (e) { return null; }
  }

  function setCache(key, data) {
    try { localStorage.setItem('contrib_' + key, JSON.stringify({ data: data, ts: Date.now() })); }
    catch (e) { /* quota exceeded */ }
  }

  function fetchGH(url) {
    var cached = getCached(url);
    if (cached) return Promise.resolve(cached);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (data) {
      setCache(url, data);
      return data;
    });
  }

  function formatNum(n) {
    if (n >= 100000) return (n / 1000).toFixed(0) + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function animateCounter(el, target) {
    var duration = 1200;
    var start = performance.now();
    el.classList.remove('is-loading');
    function tick(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatNum(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function populateProfile(user) {
    var nameEl = document.getElementById('contrib-name');
    var bioEl = document.getElementById('contrib-bio');
    var metaEl = document.getElementById('contrib-meta');
    if (user.name) nameEl.textContent = user.name;
    bioEl.textContent = user.bio || '';
    var metaParts = [];
    if (user.location) metaParts.push('<span><i class="fas fa-map-marker-alt"></i> ' + user.location + '</span>');
    if (user.company) metaParts.push('<span><i class="fas fa-building"></i> ' + user.company + '</span>');
    if (user.blog) {
      var blogDisplay = user.blog.replace(/^https?:\/\//, '').replace(/\/$/, '');
      metaParts.push('<span><i class="fas fa-link"></i> <a href="' + (user.blog.match(/^https?:\/\//) ? user.blog : 'https://' + user.blog) + '">' + blogDisplay + '</a></span>');
    }
    metaEl.innerHTML = metaParts.join('');
  }

  function populateCard(card, repo) {
    var fullName = card.getAttribute('data-repo');
    var descEl = card.querySelector('[data-desc-for="' + fullName + '"]');
    var starsEl = card.querySelector('[data-stars-for="' + fullName + '"]');
    var forksEl = card.querySelector('[data-forks-for="' + fullName + '"]');
    var langEl = card.querySelector('[data-lang-for="' + fullName + '"]');
    var accentEl = card.querySelector('.contrib-card__accent');

    if (descEl) {
      descEl.classList.remove('is-loading');
      descEl.textContent = repo.description || 'No description available';
    }
    if (starsEl) starsEl.innerHTML = '<i class="far fa-star"></i> ' + formatNum(repo.stargazers_count);
    if (forksEl) forksEl.innerHTML = '<i class="fas fa-code-branch"></i> ' + formatNum(repo.forks_count);
    if (langEl && repo.language) {
      var color = LANG_COLORS[repo.language] || '#888';
      langEl.innerHTML = '<span class="lang-dot" style="background:' + color + '"></span> ' + repo.language;
      if (accentEl) accentEl.style.background = color;
    }
  }

  function buildLanguageChart(repos) {
    var langBytes = {};
    repos.forEach(function (r) {
      if (r.language) langBytes[r.language] = (langBytes[r.language] || 0) + (r.size || 1);
    });
    var total = Object.values(langBytes).reduce(function (a, b) { return a + b; }, 0);
    if (total === 0) return;
    var sorted = Object.entries(langBytes).sort(function (a, b) { return b[1] - a[1]; });
    var bar = document.getElementById('contrib-lang-bar');
    var legend = document.getElementById('contrib-lang-legend');
    if (!bar || !legend) return;
    bar.innerHTML = '';
    legend.innerHTML = '';
    sorted.forEach(function (entry) {
      var lang = entry[0], bytes = entry[1];
      var pct = ((bytes / total) * 100).toFixed(1);
      var color = LANG_COLORS[lang] || '#888';
      var seg = document.createElement('div');
      seg.className = 'lang-segment';
      seg.style.flexBasis = pct + '%';
      seg.style.background = color;
      seg.title = lang + ' ' + pct + '%';
      bar.appendChild(seg);
      var item = document.createElement('span');
      item.className = 'contrib-lang-item';
      item.innerHTML = '<span class="lang-dot" style="background:' + color + '"></span> ' + lang + ' <span class="lang-pct">' + pct + '%</span>';
      legend.appendChild(item);
    });
  }

  function fetchLanguageDetails(repos) {
    var langTotals = {};
    var promises = repos.map(function (r) {
      return fetchGH('https://api.github.com/repos/' + r.full_name + '/languages').then(function (langs) {
        Object.keys(langs).forEach(function (lang) {
          langTotals[lang] = (langTotals[lang] || 0) + langs[lang];
        });
      }).catch(function () {});
    });
    return Promise.all(promises).then(function () {
      if (Object.keys(langTotals).length === 0) return;
      var total = Object.values(langTotals).reduce(function (a, b) { return a + b; }, 0);
      var sorted = Object.entries(langTotals).sort(function (a, b) { return b[1] - a[1]; });
      var bar = document.getElementById('contrib-lang-bar');
      var legend = document.getElementById('contrib-lang-legend');
      if (!bar || !legend) return;
      bar.innerHTML = '';
      legend.innerHTML = '';
      sorted.forEach(function (entry) {
        var lang = entry[0], bytes = entry[1];
        var pct = ((bytes / total) * 100).toFixed(1);
        if (parseFloat(pct) < 0.5) return;
        var color = LANG_COLORS[lang] || '#888';
        var seg = document.createElement('div');
        seg.className = 'lang-segment';
        seg.style.flexBasis = pct + '%';
        seg.style.background = color;
        seg.title = lang + ' ' + pct + '%';
        bar.appendChild(seg);
        var item = document.createElement('span');
        item.className = 'contrib-lang-item';
        item.innerHTML = '<span class="lang-dot" style="background:' + color + '"></span> ' + lang + ' <span class="lang-pct">' + pct + '%</span>';
        legend.appendChild(item);
      });
    });
  }

  function init() {
    var repoCards = document.querySelectorAll('.contrib-card');
    var repoNames = [];
    repoCards.forEach(function (c) { repoNames.push(c.getAttribute('data-repo')); });

    var userPromise = fetchGH('https://api.github.com/users/' + GITHUB_USER);
    var repoPromises = repoNames.map(function (name) {
      return fetchGH('https://api.github.com/repos/' + name).catch(function () { return null; });
    });

    userPromise.then(function (user) {
      populateProfile(user);
      animateCounter(document.querySelector('[data-stat="repos"]'), user.public_repos);
      animateCounter(document.querySelector('[data-stat="followers"]'), user.followers);
      animateCounter(document.querySelector('[data-stat="following"]'), user.following);
    }).catch(function () {
      document.querySelectorAll('.contrib-stat__number').forEach(function (el) {
        el.classList.remove('is-loading');
        el.textContent = '--';
      });
    });

    Promise.all(repoPromises).then(function (repos) {
      var validRepos = [];
      repos.forEach(function (repo, i) {
        if (repo) {
          populateCard(repoCards[i], repo);
          validRepos.push(repo);
        } else {
          var card = repoCards[i];
          var descEl = card.querySelector('.contrib-card__desc');
          if (descEl) { descEl.classList.remove('is-loading'); descEl.textContent = 'Visit on GitHub for details'; }
        }
      });

      var totalStars = validRepos.reduce(function (sum, r) { return sum + (r.stargazers_count || 0); }, 0);
      animateCounter(document.querySelector('[data-stat="stars"]'), totalStars);

      buildLanguageChart(validRepos);
      fetchLanguageDetails(validRepos);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
