/* Audio intro player — minimal, on-brand, accessible.
 * Hooks any element matching [data-audio-intro] that contains a single <audio>.
 */
(function () {
  'use strict';

  function fmt(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function init(root) {
    var audio    = root.querySelector('audio');
    var btn      = root.querySelector('.audio-intro__play');
    var icon     = root.querySelector('.audio-intro__icon');
    var fill     = root.querySelector('.audio-intro__fill');
    var current  = root.querySelector('[data-audio-current]');
    var duration = root.querySelector('[data-audio-duration]');
    if (!audio || !btn) return;

    function setIcon(playing) {
      icon.textContent = playing ? '❚❚' : '▶';
      btn.setAttribute('aria-label', playing ? 'Pause audio intro' : 'Play audio intro');
    }

    btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play',  function () { setIcon(true);  });
    audio.addEventListener('pause', function () { setIcon(false); });
    audio.addEventListener('ended', function () { setIcon(false); fill.style.width = '0%'; current.textContent = '0:00'; });

    audio.addEventListener('loadedmetadata', function () {
      if (audio.duration) duration.textContent = fmt(audio.duration);
    });

    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      var pct = (audio.currentTime / audio.duration) * 100;
      fill.style.width = pct.toFixed(1) + '%';
      current.textContent = fmt(audio.currentTime);
    });

    // Click on the bar to seek
    var bar = root.querySelector('.audio-intro__bar');
    if (bar) {
      bar.addEventListener('click', function (e) {
        if (!audio.duration) return;
        var rect = bar.getBoundingClientRect();
        var pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
      });
      bar.style.cursor = 'pointer';
    }
  }

  function boot() {
    document.querySelectorAll('[data-audio-intro]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
