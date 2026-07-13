/* Budarina — Destinations replica engine
 *
 * A single transparent canvas draws the whole scene: for every destination a
 * roof image sits at the top and a "curtain" of native characters hangs beneath
 * it. Each vertical strand is a little Verlet rope anchored to the roof, so the
 * characters sway and cascade with gravity + the momentum of your horizontal
 * scroll. The DOM layer on top carries the crisp chrome (nav, headline, etc.).
 */
(function () {
    "use strict";

    /* ---------------------------------------------------------------- data */
    const DESTS = [
        {
            id: "china",
            country: "China",
            native: "缘分",
            translit: "Yuánfèn",
            meaning: "a destined meeting",
            headline: ["China", "golden courtyards, silk-road myths, roofs that refuse gravity"],
            blurb: "Wander forbidden gardens, painted eaves, and stories older than the maps that tried to hold them.",
            roof: "img/roof-china.png",
            widthRatio: 0.30,
            curtainRatio: 0.60,
            anchorInset: 0.90,
            pool: "山川河海城宫殿檐瓦金龙凤云雾夜灯路茶诗书画风雨松竹梅兰古今岁月故事远方门庭院墙影光尘缘分丝绸时空紫禁琉璃",
        },
        {
            id: "japan",
            country: "Japan",
            native: "余白",
            translit: "Yohaku",
            meaning: "the beauty of empty space",
            headline: ["Japan", "red eaves in the mist, stone paths, and patience as architecture"],
            blurb: "Rise to quiet gardens, cedar shade, and rooms where silence is a deliberate part of the design.",
            roof: "img/roof-japan.png",
            widthRatio: 0.26,
            curtainRatio: 0.74,
            anchorInset: 0.86,
            pool: "静寂庭石道雨霧朝夜灯木陰間余白心侘寂茶花月風空山寺門瓦屋根赤しずかにわみちあめきりよるひかげこもれび",
        },
        {
            id: "kazakhstan",
            country: "Kazakhstan",
            native: "Дала",
            translit: "Dala",
            meaning: "the open steppe",
            headline: ["Kazakhstan", "steppe wind, shanyrak light, and a home that moves with you"],
            blurb: "Cross paths without edges, warm felt interiors, and a patience that outran every border.",
            roof: "img/roof-yurt.png",
            widthRatio: 0.24,
            curtainRatio: 0.82,
            anchorInset: 0.93,
            pool: "далажелшаңырақкиізүйкөшжолжұлдызаттүнотаспантаңкеңиненіңұшықашантоқтамайдыжүрекөрнеккөшпендісыйшексіз",
        },
    ];

    /* --------------------------------------------------------------- setup */
    const canvas = document.getElementById("scene");
    const ctx = canvas.getContext("2d");
    const stage = document.getElementById("stage");

    let W = 0, H = 0, dpr = 1;
    let mobile = false;

    const roofImgs = {};
    let loaded = 0;
    DESTS.forEach((d) => {
        const im = new Image();
        im.onload = im.onerror = () => { loaded++; };
        im.src = d.roof;
        roofImgs[d.id] = im;
    });

    /* Physics tuning */
    const GRAV = 0.34;
    const DAMP = 0.985;
    const CONSTRAINT_ITERS = 3;
    const WIND_GAIN = 0.11;   // how strongly scroll velocity yanks strands
    const IDLE_WIND = 0.035;  // ambient breeze amplitude (subtle at rest)
    const MOUSE_PUSH = 22;    // how hard the cursor shoves nearby glyphs aside

    /* Cursor position (CSS px) used to part the curtain on hover. */
    let mx = -9999, my = -9999, mouseActive = false;

    /* Each destination owns a curtain (array of strands, each a node list). */
    const curtains = DESTS.map(() => null);

    function buildCurtain(i) {
        const d = DESTS[i];
        const im = roofImgs[d.id];
        const natW = im.naturalWidth || 800;
        const natH = im.naturalHeight || 300;

        const roofW = clamp(W * d.widthRatio, mobile ? 150 : 210, 380);
        const roofH = roofW * (natH / natW);
        const roofTop = H * (mobile ? 0.11 : 0.1);
        const anchorY = roofTop + roofH * d.anchorInset;

        const charSize = mobile ? clamp(W / 46, 8, 11) : clamp(W / 140, 9, 12);
        const spacing = charSize * 0.78;
        const restLen = charSize * 1.0;

        const curtainW = roofW * d.curtainRatio;
        let cols = Math.round(curtainW / spacing);
        cols = clamp(cols, 8, mobile ? 22 : 36);
        const bottom = H * 0.9;
        let rows = Math.round((bottom - anchorY) / restLen);
        rows = clamp(rows, 8, mobile ? 26 : 36);

        const poolChars = Array.from(d.pool);
        const strands = [];
        for (let c = 0; c < cols; c++) {
            const nodes = [];
            for (let r = 0; r <= rows; r++) {
                nodes.push({
                    x: 0, y: 0, px: 0, py: 0,
                    ch: poolChars[(c * 7 + r * 13 + i * 101) % poolChars.length],
                    // slightly varied ink weight per glyph
                    a: 0.55 + ((c * 5 + r * 3) % 7) / 16,
                });
            }
            strands.push(nodes);
        }

        return { strands, cols, rows, charSize, spacing, restLen, roofW, roofH, roofTop, anchorY, curtainW };
    }

    function seedCurtainPositions(cur, centerX) {
        const startX = centerX - cur.curtainW / 2;
        for (let c = 0; c < cur.cols; c++) {
            const ax = startX + c * cur.spacing;
            const nodes = cur.strands[c];
            for (let r = 0; r <= cur.rows; r++) {
                const y = cur.anchorY + r * cur.restLen;
                nodes[r].x = nodes[r].px = ax;
                nodes[r].y = nodes[r].py = y;
            }
        }
    }

    /* --------------------------------------------------------- scroll state */
    let scrollPx = 0;      // current (eased) scroll position, px
    let target = 0;        // desired scroll position, px
    let vel = 0;           // per-frame scroll velocity, px
    let smoothVel = 0;     // low-passed velocity for the wind
    let focus = 0;         // focused destination index
    let lastInput = -1e9;
    let seeded = false;

    function maxScroll() { return (DESTS.length - 1) * W; }
    function clampTarget() { target = clamp(target, 0, maxScroll()); }

    /* --------------------------------------------------------------- resize */
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        mobile = W <= 720;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        for (let i = 0; i < DESTS.length; i++) curtains[i] = buildCurtain(i);
        target = focus * W;
        scrollPx = target;
        // seed immediately when art is ready so a resize doesn't flash a jump
        if (loaded >= DESTS.length) {
            for (let i = 0; i < DESTS.length; i++) {
                seedCurtainPositions(curtains[i], i * W - scrollPx + W / 2);
            }
            seeded = true;
        } else {
            seeded = false;
        }
    }

    /* ------------------------------------------------------------- helpers */
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    /* -------------------------------------------------------------- physics */
    function stepCurtain(cur, centerX, wind, t) {
        const startX = centerX - cur.curtainW / 2;
        const breeze = Math.sin(t * 0.0011) * IDLE_WIND;
        // cursor parts the sheet: radius scales a little with glyph size
        const useMouse = mouseActive && !mobile;
        const mr = cur.charSize * 9;      // interaction radius
        const mr2 = mr * mr;
        for (let c = 0; c < cur.cols; c++) {
            const nodes = cur.strands[c];
            const ax = startX + c * cur.spacing;
            // anchor
            nodes[0].x = ax;
            nodes[0].y = cur.anchorY;
            nodes[0].px = ax;
            nodes[0].py = cur.anchorY;
            const colPhase = Math.sin(t * 0.0016 + c * 0.5);
            for (let r = 1; r <= cur.rows; r++) {
                const n = nodes[r];
                const depth = r / cur.rows;               // heavier swing lower down
                let vx = (n.x - n.px) * DAMP;
                let vy = (n.y - n.py) * DAMP;
                n.px = n.x;
                n.py = n.y;
                n.x += vx + (wind + breeze * colPhase) * depth;
                n.y += vy + GRAV;
                // push glyphs out of the cursor's way (imparts velocity because
                // px/py are left untouched, so the sheet springs back after)
                if (useMouse) {
                    const dx = n.x - mx;
                    const dy = n.y - my;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < mr2) {
                        const d = Math.sqrt(d2) || 0.001;
                        const f = (1 - d / mr);
                        const push = f * f * MOUSE_PUSH;
                        n.x += (dx / d) * push;
                        n.y += (dy / d) * push * 0.45;
                    }
                }
            }
            // constraints
            for (let k = 0; k < CONSTRAINT_ITERS; k++) {
                nodes[0].x = ax;
                nodes[0].y = cur.anchorY;
                for (let r = 1; r <= cur.rows; r++) {
                    const a = nodes[r - 1];
                    const b = nodes[r];
                    let dx = b.x - a.x;
                    let dy = b.y - a.y;
                    let dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                    const diff = (dist - cur.restLen) / dist;
                    // anchor row barely moves; lower rows absorb the stretch
                    if (r === 1) {
                        b.x -= dx * diff;
                        b.y -= dy * diff;
                    } else {
                        a.x += dx * diff * 0.5;
                        a.y += dy * diff * 0.5;
                        b.x -= dx * diff * 0.5;
                        b.y -= dy * diff * 0.5;
                    }
                }
            }
        }
    }

    function drawCurtain(cur, ink) {
        ctx.font = cur.charSize + "px " + '"Noto Serif CJK SC","Noto Serif CJK JP","Songti SC","STSong","Noto Sans CJK SC","PingFang SC","Hiragino Mincho ProN","Microsoft YaHei",serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // soft cast shadow of the curtain onto the paper
        ctx.save();
        ctx.translate(cur.charSize * 0.5, cur.charSize * 0.5);
        ctx.fillStyle = "rgba(70,58,42,0.10)";
        for (let c = 0; c < cur.cols; c++) {
            const nodes = cur.strands[c];
            for (let r = 1; r <= cur.rows; r++) {
                const n = nodes[r];
                ctx.fillText(n.ch, n.x, n.y);
            }
        }
        ctx.restore();
        // ink glyphs
        for (let c = 0; c < cur.cols; c++) {
            const nodes = cur.strands[c];
            for (let r = 1; r <= cur.rows; r++) {
                const n = nodes[r];
                const fade = 1 - (r / cur.rows) * 0.28;
                ctx.fillStyle = "rgba(" + ink + "," + (n.a * fade).toFixed(3) + ")";
                ctx.fillText(n.ch, n.x, n.y);
            }
        }
    }

    function drawRoof(d, cur, centerX) {
        const im = roofImgs[d.id];
        if (!im.complete || !im.naturalWidth) return;
        const x = centerX - cur.roofW / 2;
        const y = cur.roofTop;
        ctx.save();
        ctx.shadowColor = "rgba(60,46,26,0.32)";
        ctx.shadowBlur = 34;
        ctx.shadowOffsetX = 26;
        ctx.shadowOffsetY = 30;
        ctx.drawImage(im, x, y, cur.roofW, cur.roofH);
        ctx.restore();
    }

    /* ----------------------------------------------------------------- loop */
    let last = performance.now();
    function frame(now) {
        const t = now;
        last = now;

        // ease scroll toward target
        const prev = scrollPx;
        scrollPx += (target - scrollPx) * 0.12;
        if (Math.abs(target - scrollPx) < 0.05) scrollPx = target;
        vel = scrollPx - prev;
        smoothVel += (vel - smoothVel) * 0.35;

        // auto-snap to nearest destination shortly after input settles
        if (now - lastInput > 140) {
            const snapped = Math.round(target / W) * W;
            target += (snapped - target) * 0.14;
            clampTarget();
        }

        const newFocus = clamp(Math.round(scrollPx / W), 0, DESTS.length - 1);
        if (newFocus !== focus) { focus = newFocus; updateChrome(); }

        if (!seeded && loaded >= DESTS.length) {
            for (let i = 0; i < DESTS.length; i++) {
                seedCurtainPositions(curtains[i], i * W - scrollPx + W / 2);
            }
            seeded = true;
        }

        ctx.clearRect(0, 0, W, H);

        const wind = -smoothVel * WIND_GAIN;
        for (let i = 0; i < DESTS.length; i++) {
            const centerX = i * W - scrollPx + W / 2;
            if (centerX < -W * 0.9 || centerX > W * 1.9) continue; // cull
            const cur = curtains[i];
            if (!cur) continue;
            stepCurtain(cur, centerX, wind, t);
            drawCurtain(cur, DESTS[i].id === "china" ? "44,36,28" : "38,32,27");
            drawRoof(DESTS[i], cur, centerX);
        }

        requestAnimationFrame(frame);
    }

    /* --------------------------------------------------------------- chrome */
    const elCaption = document.getElementById("caption");
    const elHeadline = document.getElementById("headline");
    const elBlurb = document.getElementById("blurb");
    const elProgressIndex = document.getElementById("progressIndex");
    const dotsWrap = document.getElementById("dots");
    const prevBadge = document.querySelector(".side-prev");
    const nextBadge = document.querySelector(".side-next");

    DESTS.forEach((d, i) => {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
    });
    const dotEls = Array.from(dotsWrap.children);

    function revealHeadline(d) {
        const rest = d.headline[1];
        elHeadline.innerHTML =
            '<span class="hl-country">' + d.country + '</span> <span class="dash">&mdash;</span> ';
        const frag = document.createElement("span");
        frag.className = "reveal";
        let k = 0;
        rest.split(" ").forEach((word, wi) => {
            if (wi > 0) frag.appendChild(document.createTextNode(" "));
            const wspan = document.createElement("span");
            wspan.className = "word";
            Array.from(word).forEach((ch) => {
                const s = document.createElement("span");
                s.textContent = ch;
                s.style.animationDelay = (0.14 + k * 0.012).toFixed(3) + "s";
                wspan.appendChild(s);
                k++;
            });
            frag.appendChild(wspan);
        });
        elHeadline.appendChild(frag);
    }

    function updateChrome() {
        const d = DESTS[focus];
        elCaption.innerHTML =
            '<span class="native">' + d.native + "</span> (" + d.translit + ") &middot; " + d.meaning;
        revealHeadline(d);
        elBlurb.textContent = d.blurb;
        elProgressIndex.textContent =
            String(focus + 1).padStart(2, "0") + " / " + String(DESTS.length).padStart(2, "0");
        dotEls.forEach((el, i) => el.classList.toggle("is-active", i === focus));

        const prev = DESTS[(focus - 1 + DESTS.length) % DESTS.length];
        const next = DESTS[(focus + 1) % DESTS.length];
        prevBadge.querySelector("img").src = prev.roof;
        prevBadge.querySelector(".badge-label").textContent = prev.country;
        nextBadge.querySelector("img").src = next.roof;
        nextBadge.querySelector(".badge-label").textContent = next.country;
        prevBadge.style.visibility = focus === 0 ? "hidden" : "visible";
        nextBadge.style.visibility = focus === DESTS.length - 1 ? "hidden" : "visible";
    }

    function goTo(i) {
        i = clamp(i, 0, DESTS.length - 1);
        target = i * W;
        markInput();
    }

    /* ---------------------------------------------------------------- input */
    const hint = document.getElementById("hint");
    let hinted = false;
    function markInput() {
        lastInput = performance.now();
        if (!hinted) { hinted = true; hint.classList.add("gone"); }
    }

    // wheel / trackpad
    window.addEventListener("wheel", (e) => {
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        target += d * 1.15;
        clampTarget();
        markInput();
    }, { passive: false });

    // touch drag + momentum
    let dragging = false, dragStartX = 0, dragStartScroll = 0, lastTouchX = 0, touchVel = 0;
    function onDown(x) {
        dragging = true;
        dragStartX = lastTouchX = x;
        dragStartScroll = target;
        touchVel = 0;
        markInput();
    }
    function onMove(x) {
        if (!dragging) return;
        target = dragStartScroll - (x - dragStartX);
        touchVel = x - lastTouchX;
        lastTouchX = x;
        clampTarget();
        markInput();
    }
    function onUp() {
        if (!dragging) return;
        dragging = false;
        // Snap by a single destination based on drag distance + fling velocity,
        // so even a short swipe reliably advances instead of rubber-banding.
        const startIdx = clamp(Math.round(dragStartScroll / W), 0, DESTS.length - 1);
        const dragged = target - dragStartScroll;   // >0 => moved toward next
        let idx = startIdx;
        if (dragged > W * 0.16 || touchVel < -5) idx = startIdx + 1;
        else if (dragged < -W * 0.16 || touchVel > 5) idx = startIdx - 1;
        goTo(idx);
    }

    stage.addEventListener("touchstart", (e) => onDown(e.touches[0].clientX), { passive: true });
    stage.addEventListener("touchmove", (e) => { onMove(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
    stage.addEventListener("touchend", onUp);

    // pointer drag on desktop (click-drag)
    stage.addEventListener("mousedown", (e) => { onDown(e.clientX); cursorEl.classList.add("grab"); });
    window.addEventListener("mousemove", (e) => onMove(e.clientX));
    window.addEventListener("mouseup", () => { onUp(); cursorEl.classList.remove("grab"); });

    // keyboard
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "PageDown") { goTo(focus + 1); e.preventDefault(); }
        else if (e.key === "ArrowLeft" || e.key === "PageUp") { goTo(focus - 1); e.preventDefault(); }
    });

    prevBadge.addEventListener("click", () => goTo(focus - 1));
    nextBadge.addEventListener("click", () => goTo(focus + 1));

    // custom cursor + curtain interaction position
    const cursorEl = document.getElementById("cursor");
    window.addEventListener("mousemove", (e) => {
        cursorEl.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
        mx = e.clientX;
        my = e.clientY;
        mouseActive = true;
    });
    window.addEventListener("mouseout", (e) => {
        if (!e.relatedTarget && !e.toElement) mouseActive = false;
    });
    // a real touch shouldn't leave a phantom "cursor" parting the sheet
    stage.addEventListener("touchstart", () => { mouseActive = false; }, { passive: true });

    window.addEventListener("resize", resize);

    /* ---------------------------------------------------------------- start */
    let started = false;
    function start() {
        if (started) return;
        started = true;
        resize();
        updateChrome();
        requestAnimationFrame(frame);
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(start);
        // don't block forever if fonts stall
        setTimeout(start, 1200);
    } else {
        start();
    }
})();
