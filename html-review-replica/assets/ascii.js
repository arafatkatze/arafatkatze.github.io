// Tiny looping ASCII-art engine.
//
// Any <pre class="ascii-anim" data-anim="NAME"> gets its frames cycled. Frames
// are normalized to a common width/height so the box never jitters between
// frames. Honors prefers-reduced-motion (shows a single still frame). String.raw
// is used so the backslashes in the art are kept literally.

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Cute anime-ish face: eyes keep moving (open, wink, blink, grin).
  const FACE = [
    String.raw`
   .-"""""-.
  /         \
 |  O     O  |
 |     >     |
  \   \_/   /
   '-.....-'`,
    String.raw`
   .-"""""-.
  /         \
 |  -     -  |
 |     >     |
  \   \_/   /
   '-.....-'`,
    String.raw`
   .-"""""-.
  /         \
 |  O     -  |
 |     >     |
  \   \_/   /
   '-.....-'`,
    String.raw`
   .-"""""-.
  /         \
 |  ^     ^  |
 |     >     |
  \  \___/  /
   '-.....-'`,
  ];
  // open, wink, open, blink, grin, wink ... eyes change every frame
  const FACE_SEQ = [0, 2, 0, 1, 3, 2, 0, 1];

  // Little character waving / dancing.
  const WAVE = [
    String.raw`
 \(^_^)
   /|\
   / \ `,
    String.raw`
  (^_^)
   /|\
   / \ `,
    String.raw`
  (^_^)/
   /|\
   / \ `,
  ];
  const WAVE_SEQ = [0, 1, 2, 1];

  // Cat: tail wags every frame, blinks now and then.
  const CAT = [
    String.raw`
 /\_/\
( o.o )
 > ^ <
   \__,`,
    String.raw`
 /\_/\
( o.o )
 > ^ <
   ,__/`,
    String.raw`
 /\_/\
( -.- )
 > ^ <
   \__,`,
    String.raw`
 /\_/\
( -.- )
 > ^ <
   ,__/`,
  ];
  // tail swings left/right continuously, with an occasional blink
  const CAT_SEQ = [0, 1, 0, 1, 2, 3, 0, 1];

  const SETS = {
    face: { frames: FACE, seq: FACE_SEQ, fps: 3 },
    wave: { frames: WAVE, seq: WAVE_SEQ, fps: 5 },
    cat: { frames: CAT, seq: CAT_SEQ, fps: 3 },
  };

  // Pad every frame to the same number of rows and columns.
  function normalize(frames) {
    const grids = frames.map((f) => f.replace(/^\n/, "").split("\n"));
    const rows = Math.max(...grids.map((g) => g.length));
    const cols = Math.max(...grids.flat().map((s) => s.length));
    return grids.map((g) => {
      const out = [];
      for (let r = 0; r < rows; r++) {
        const line = g[r] || "";
        out.push(line + " ".repeat(cols - line.length));
      }
      return out.join("\n");
    });
  }

  function mount(el, set) {
    const frames = normalize(set.frames);
    const seq = set.seq || frames.map((_, i) => i);
    el.textContent = frames[seq[0]];
    if (reduce || frames.length < 2) return;
    let i = 0;
    setInterval(() => {
      i = (i + 1) % seq.length;
      el.textContent = frames[seq[i]];
    }, Math.round(1000 / (set.fps || 3)));
  }

  window.addEventListener("load", () => {
    document.querySelectorAll(".ascii-anim").forEach((el) => {
      const set = SETS[el.dataset.anim];
      if (set) mount(el, set);
    });
  });
})();
