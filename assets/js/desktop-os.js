/* ───────────────────────────────────────────────────────────────────────────
 * arOS: a tiny desktop operating system for the browser.
 * Inspired by zvava.org. Vanilla JS, no dependencies.
 *
 * Handles: opening/closing windows, minimize/maximize, focus + z-order,
 * dragging by the title bar (mouse + touch), the start menu, a live taskbar
 * with running apps, a clock, and a small toy terminal.
 * ─────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const root = document.getElementById("araos");
  if (!root) return;

  const desktop = root.querySelector("#os-desktop");
  const tasksEl = root.querySelector("#os-tasks");
  const startBtn = root.querySelector("#os-start");
  const startMenu = root.querySelector("#os-startmenu");
  const clockEl = root.querySelector("#os-clock");

  let zCounter = 10;
  const taskButtons = new Map(); // windowId -> taskbar button

  const windows = Array.from(root.querySelectorAll(".os-window"));

  // ── focus / z-order ────────────────────────────────────────────────────────
  function focusWindow(win) {
    windows.forEach((w) => w.classList.remove("is-focused"));
    win.classList.add("is-focused");
    win.style.zIndex = ++zCounter;
    taskButtons.forEach((btn, id) => {
      btn.classList.toggle("is-active", id === win.id && win.classList.contains("is-open") && !win.classList.contains("is-min"));
    });
  }

  // ── taskbar ─────────────────────────────────────────────────────────────────
  function ensureTask(win) {
    if (taskButtons.has(win.id)) return taskButtons.get(win.id);
    const btn = document.createElement("button");
    btn.className = "os-task";
    btn.type = "button";
    btn.innerHTML =
      '<span class="os-task-ico">' + (win.dataset.icon || "🗔") + "</span>" +
      "<span>" + (win.dataset.title || "window") + "</span>";
    btn.addEventListener("click", () => {
      if (win.classList.contains("is-min")) {
        win.classList.remove("is-min");
        focusWindow(win);
      } else if (win.classList.contains("is-focused")) {
        // already focused -> minimize
        win.classList.add("is-min");
        btn.classList.remove("is-active");
      } else {
        focusWindow(win);
      }
    });
    tasksEl.appendChild(btn);
    taskButtons.set(win.id, btn);
    return btn;
  }

  function removeTask(win) {
    const btn = taskButtons.get(win.id);
    if (btn) {
      btn.remove();
      taskButtons.delete(win.id);
    }
  }

  // ── open / close ─────────────────────────────────────────────────────────────
  function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    const firstOpen = !win.classList.contains("is-open");
    win.classList.add("is-open");
    win.classList.remove("is-min");
    if (firstOpen) placeWindow(win);
    ensureTask(win);
    focusWindow(win);
    if (id === "win-terminal") {
      const input = win.querySelector("#os-term-input");
      if (input) setTimeout(() => input.focus(), 30);
    }
  }

  function closeWindow(win) {
    win.classList.remove("is-open", "is-max", "is-min", "is-focused");
    removeTask(win);
  }

  // initial placement from data attributes (kept inside the desktop bounds)
  function placeWindow(win) {
    const x = parseInt(win.dataset.x || "120", 10);
    const y = parseInt(win.dataset.y || "80", 10);
    const w = parseInt(win.dataset.w || "520", 10);
    const maxX = Math.max(8, desktop.clientWidth - 80);
    const maxY = Math.max(8, desktop.clientHeight - 60);
    win.style.left = Math.min(x, maxX) + "px";
    win.style.top = Math.min(y, maxY) + "px";
    if (desktop.clientWidth > 660) win.style.width = w + "px";
  }

  // ── window controls + drag wiring (reused for static AND dynamic windows) ─────
  function wireWindow(win) {
    if (win.dataset.wired) return;
    win.dataset.wired = "1";

    win.addEventListener("mousedown", () => focusWindow(win), true);
    win.addEventListener("touchstart", () => focusWindow(win), { capture: true, passive: true });

    const min = win.querySelector(".os-min");
    const max = win.querySelector(".os-max");
    const close = win.querySelector(".os-close");

    if (min) min.addEventListener("click", (e) => {
      e.stopPropagation();
      win.classList.add("is-min");
      const btn = taskButtons.get(win.id);
      if (btn) btn.classList.remove("is-active");
    });
    if (max) max.addEventListener("click", (e) => {
      e.stopPropagation();
      win.classList.toggle("is-max");
      focusWindow(win);
    });
    if (close) close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeWindow(win);
    });

    makeDraggable(win);
  }

  windows.forEach(wireWindow);

  // ── dragging by the title bar (mouse + touch) ────────────────────────────────
  function makeDraggable(win) {
    const bar = win.querySelector(".os-window-bar");
    if (!bar) return;
    let dragging = false;
    let startX = 0, startY = 0, originLeft = 0, originTop = 0;

    function pointerDown(e) {
      if (win.classList.contains("is-max")) return;
      if (e.target.closest(".os-window-controls")) return;
      const pt = e.touches ? e.touches[0] : e;
      dragging = true;
      startX = pt.clientX;
      startY = pt.clientY;
      const rect = win.getBoundingClientRect();
      const dRect = desktop.getBoundingClientRect();
      originLeft = rect.left - dRect.left;
      originTop = rect.top - dRect.top;
      bar.style.cursor = "grabbing";
      focusWindow(win);
      document.addEventListener("mousemove", pointerMove);
      document.addEventListener("mouseup", pointerUp);
      document.addEventListener("touchmove", pointerMove, { passive: false });
      document.addEventListener("touchend", pointerUp);
    }

    function pointerMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      const pt = e.touches ? e.touches[0] : e;
      let nx = originLeft + (pt.clientX - startX);
      let ny = originTop + (pt.clientY - startY);
      const maxX = desktop.clientWidth - 40;
      const maxY = desktop.clientHeight - 36;
      nx = Math.max(-win.offsetWidth + 80, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));
      win.style.left = nx + "px";
      win.style.top = ny + "px";
    }

    function pointerUp() {
      dragging = false;
      bar.style.cursor = "";
      document.removeEventListener("mousemove", pointerMove);
      document.removeEventListener("mouseup", pointerUp);
      document.removeEventListener("touchmove", pointerMove);
      document.removeEventListener("touchend", pointerUp);
    }

    bar.addEventListener("mousedown", pointerDown);
    bar.addEventListener("touchstart", pointerDown, { passive: false });
    // double-click the bar to (un)maximize
    bar.addEventListener("dblclick", (e) => {
      if (e.target.closest(".os-window-controls")) return;
      win.classList.toggle("is-max");
      focusWindow(win);
    });
  }

  // ── openers: desktop icons + start menu items ────────────────────────────────
  root.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => {
      openWindow(el.dataset.open);
      closeStartMenu();
    });
  });

  // ── start menu ───────────────────────────────────────────────────────────────
  function openStartMenu() {
    startMenu.classList.add("is-open");
    startMenu.setAttribute("aria-hidden", "false");
    startBtn.setAttribute("aria-expanded", "true");
  }
  function closeStartMenu() {
    startMenu.classList.remove("is-open");
    startMenu.setAttribute("aria-hidden", "true");
    startBtn.setAttribute("aria-expanded", "false");
  }
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startMenu.classList.contains("is-open") ? closeStartMenu() : openStartMenu();
  });
  document.addEventListener("click", (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) closeStartMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeStartMenu();
  });

  // ── clock ─────────────────────────────────────────────────────────────────────
  function tickClock() {
    if (!clockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    clockEl.textContent = h + ":" + m;
  }
  tickClock();
  setInterval(tickClock, 15000);

  // ── toy terminal ────────────────────────────────────────────────────────────
  setupTerminal();
  function setupTerminal() {
    const out = root.querySelector("#os-term-out");
    const input = root.querySelector("#os-term-input");
    const body = root.querySelector("#os-term");
    if (!out || !input) return;

    const print = (html) => {
      const line = document.createElement("div");
      line.innerHTML = html;
      out.appendChild(line);
      if (body) body.scrollTop = body.scrollHeight;
    };

    const commands = {
      help() {
        return "available commands: <b>help, about, ls, open &lt;app&gt;, whoami, date, clear, neofetch</b>";
      },
      about() {
        return "arOS: Ara Khan's website as a desktop. inspired by zvava.org. built with vanilla JS.";
      },
      whoami() { return "guest@arOS"; },
      date() { return new Date().toString(); },
      ls() {
        return "about  projects  writing  reading  gallery  contact  terminal  read.me";
      },
      neofetch() {
        return [
          "        ◈◈◈        guest@arOS",
          "      ◈     ◈      ----------",
          "     ◈  ara  ◈     os:      arOS 1.0 (web)",
          "      ◈     ◈      shell:   vanilla-js",
          "        ◈◈◈        uptime:  just now",
          "                   theme:   purple dream",
        ].join("\n");
      },
      open(arg) {
        const map = {
          about: "win-about", projects: "win-projects", writing: "win-writing",
          reading: "win-reading", gallery: "win-gallery", contact: "win-contact",
          terminal: "win-terminal", "read.me": "win-readme", readme: "win-readme",
        };
        const id = map[(arg || "").toLowerCase()];
        if (!id) return "open: app not found. try <b>ls</b>.";
        openWindow(id);
        return "opening " + arg + "…";
      },
      clear() { out.innerHTML = ""; return ""; },
    };

    print("arOS terminal: type <b>help</b> to get started.");

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const raw = input.value.trim();
      input.value = "";
      if (!raw) return;
      print('<span style="color:#8affc1">ara@arOS:~$</span> ' + escapeHtml(raw));
      const [cmd, ...rest] = raw.split(/\s+/);
      const fn = commands[cmd.toLowerCase()];
      if (fn) {
        const result = fn(rest.join(" "));
        if (result) print(result);
      } else {
        print(escapeHtml(cmd) + ": command not found. type <b>help</b>.");
      }
    });

    // clicking anywhere in the terminal focuses the input
    body.addEventListener("click", () => input.focus());
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ── Documents + Writing apps: list posts/projects and open them inside the OS ──
  setupDocuments();
  function setupDocuments() {
    const dataEl = document.getElementById("os-docs");
    if (!dataEl) return;

    let data;
    try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { data = {}; }
    const posts = data.posts || [];
    const projects = data.projects || [];

    // Documents = everything; Writing = just the blog. Both open in-OS windows.
    const docsList = root.querySelector("#os-files");
    if (docsList) {
      populateList(docsList, [
        { label: "Blog", items: posts, icon: "📝" },
        { label: "Projects", items: projects, icon: "🗂️" },
      ], "no documents found.");
    }

    const writingList = root.querySelector("#os-writing");
    if (writingList) {
      populateList(writingList, [{ label: "Blog", items: posts, icon: "📝" }], "no posts yet.");
    }
  }

  // Render grouped, clickable file rows into a container; each opens in a window.
  function populateList(container, groups, emptyMsg) {
    const total = groups.reduce((n, g) => n + (g.items ? g.items.length : 0), 0);
    if (!total) {
      container.innerHTML = '<p class="os-doc-status">' + (emptyMsg || "nothing here.") + "</p>";
      return;
    }
    const multi = groups.filter((g) => g.items && g.items.length).length > 1;
    container.innerHTML = "";

    groups.forEach((g) => {
      if (!g.items || !g.items.length) return;
      const group = document.createElement("div");
      group.className = "os-files-group";
      if (multi) {
        const head = document.createElement("div");
        head.className = "os-files-head";
        head.textContent = g.label;
        group.appendChild(head);
      }
      g.items.forEach((it) => {
        const btn = document.createElement("button");
        btn.className = "os-file";
        btn.innerHTML =
          '<span class="os-file-ico">' + g.icon + "</span>" +
          '<span class="os-file-name">' + escapeHtml(it.title || "untitled") + "</span>" +
          '<span class="os-file-date">' + escapeHtml(it.date || "") + "</span>";
        btn.addEventListener("click", () => openDoc(it, g.icon));
        group.appendChild(btn);
      });
      container.appendChild(group);
    });
  }

  let docCascade = 0;
  function openDoc(item, icon) {
    const id = "doc-" + slugify(item.url || item.title);
    let win = document.getElementById(id);

    if (!win) {
      win = document.createElement("section");
      win.className = "os-window os-window--doc";
      win.id = id;
      win.dataset.title = item.title || "document";
      win.dataset.icon = icon || "📄";
      win.dataset.w = "660";
      const cx = 170 + (docCascade % 5) * 26;
      const cy = 70 + (docCascade % 5) * 26;
      docCascade++;
      win.dataset.x = cx;
      win.dataset.y = cy;
      win.innerHTML =
        '<header class="os-window-bar"><span class="os-window-title"><span class="os-window-ico">' +
        (icon || "📄") + "</span> " + escapeHtml(item.title || "document") + "</span>" +
        '<div class="os-window-controls">' +
        '<button class="os-ctl os-min" title="Minimize" aria-label="Minimize"></button>' +
        '<button class="os-ctl os-max" title="Maximize" aria-label="Maximize"></button>' +
        '<button class="os-ctl os-close" title="Close" aria-label="Close"></button></div></header>' +
        '<div class="os-window-body os-doc-body"><p class="os-doc-status">opening ' +
        escapeHtml(item.title || "document") + "…</p></div>";
      desktop.appendChild(win);
      windows.push(win);
      wireWindow(win);
      fetchDoc(win, item);
    }

    openWindow(id);
  }

  function fetchDoc(win, item) {
    const body = win.querySelector(".os-doc-body");
    const fallback =
      '<p class="os-doc-status">couldn\'t load this one here. ' +
      '<a href="' + item.url + '">open the full page →</a></p>';

    fetch(item.url, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const article =
          doc.querySelector(".post article") ||
          doc.querySelector("article") ||
          doc.querySelector(".post");
        if (!article) { body.innerHTML = fallback; return; }
        body.innerHTML =
          '<article class="os-doc-article">' +
          '<h2 class="os-doc-title">' + escapeHtml(item.title || "") + "</h2>" +
          (item.date ? '<div class="os-doc-meta">' + escapeHtml(item.date) + "</div>" : "") +
          article.innerHTML +
          '<p class="os-doc-source"><a href="' + item.url + '">view this on the normal site →</a></p>' +
          "</article>";
        enhanceDoc(body, item.url);
      })
      .catch(() => { body.innerHTML = fallback; });
  }

  // Re-activate interactive embeds inside freshly injected content.
  // innerHTML never runs <script> tags, so tweets/zoom/math must be kicked manually.
  function enhanceDoc(scope, baseUrl) {
    // make relative srcset/src absolute is unnecessary (same origin), but resolve
    // any anchor links so they still work from /desktop/.
    scope.querySelectorAll("a[href^='#']").forEach((a) => {
      a.setAttribute("href", baseUrl + a.getAttribute("href"));
    });

    // image lightbox (medium-zoom), if the library is present site-wide
    if (typeof window.mediumZoom === "function") {
      try { window.mediumZoom(scope.querySelectorAll("[data-zoomable]")); } catch (e) {}
    }

    // twitter / X embeds
    if (scope.querySelector(".twitter-tweet")) loadTweets(scope);

    // math, if any
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      try { window.MathJax.typesetPromise([scope]); } catch (e) {}
    }
  }

  function loadTweets(scope) {
    const render = () => {
      if (window.twttr && window.twttr.widgets) {
        try { window.twttr.widgets.load(scope); } catch (e) {}
      }
    };
    if (window.twttr && window.twttr.widgets) { render(); return; }

    let s = document.getElementById("twitter-wjs");
    if (!s) {
      s = document.createElement("script");
      s.id = "twitter-wjs";
      s.async = true;
      s.src = "https://platform.twitter.com/widgets.js";
      s.addEventListener("load", render);
      document.head.appendChild(s);
    } else {
      // script already requested, poll until the API is ready
      let n = 0;
      const t = setInterval(() => {
        if ((window.twttr && window.twttr.widgets) || n++ > 50) {
          clearInterval(t);
          render();
        }
      }, 150);
    }
  }

  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // ── boot: open a couple of windows so it doesn't look empty ───────────────────
  if (desktop.clientWidth > 660) {
    openWindow("win-readme");
    openWindow("win-about");
  } else {
    openWindow("win-readme");
  }
})();
