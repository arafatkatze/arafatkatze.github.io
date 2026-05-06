/* Konami code easter egg — snowflakes drift, a tiny "powder day" message appears. */
(function () {
  'use strict';

  const SEQUENCE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];

  let cursor = 0;
  let active = false;

  function onKey(e) {
    if (active) return;
    if (e.code === SEQUENCE[cursor]) {
      cursor++;
      if (cursor === SEQUENCE.length) {
        cursor = 0;
        triggerPowderDay();
      }
    } else if (e.code === SEQUENCE[0]) {
      cursor = 1;
    } else {
      cursor = 0;
    }
  }

  function triggerPowderDay() {
    if (active) return;
    active = true;

    const layer = document.createElement('div');
    layer.className = 'konami-snow-layer';
    document.body.appendChild(layer);

    const banner = document.createElement('div');
    banner.className = 'konami-snow-banner';
    banner.innerHTML = '<span class="konami-snow-banner__title">❄ powder day ❄</span>' +
                       '<span class="konami-snow-banner__sub">skiing power-up unlocked.</span>';
    document.body.appendChild(banner);

    const flakes = ['❄', '❅', '❆', '✦', '✧'];
    let spawned = 0;
    const total = 90;
    const spawner = setInterval(function () {
      if (spawned >= total) { clearInterval(spawner); return; }
      const n = Math.min(6, total - spawned);
      for (let i = 0; i < n; i++) {
        const el = document.createElement('span');
        el.className = 'konami-snow-flake';
        el.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        el.style.left = (Math.random() * 100) + 'vw';
        el.style.fontSize = (10 + Math.random() * 22) + 'px';
        el.style.opacity = (0.4 + Math.random() * 0.6).toFixed(2);
        const dur = 6 + Math.random() * 7;
        const drift = (Math.random() * 30 - 15).toFixed(1);
        el.style.setProperty('--drift', drift + 'vw');
        el.style.animation = 'konami-snow-fall ' + dur + 's linear forwards';
        layer.appendChild(el);
        setTimeout(function () { el.remove(); }, dur * 1000 + 200);
      }
      spawned += n;
    }, 240);

    setTimeout(function () {
      banner.classList.add('konami-snow-banner--fade');
      setTimeout(function () {
        banner.remove();
        layer.remove();
        active = false;
      }, 1200);
    }, 13000);
  }

  document.addEventListener('keydown', onKey);
})();
