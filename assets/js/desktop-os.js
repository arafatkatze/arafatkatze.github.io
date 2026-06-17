/* ───────────────────────────────────────────────────────────────────────────
 * araOS — a tiny desktop operating system for the browser.
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

  // ── window controls (event delegation) ───────────────────────────────────────
  windows.forEach((win) => {
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
  });

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
        return "araOS — Ara Khan's website as a desktop. inspired by zvava.org. built with vanilla JS.";
      },
      whoami() { return "guest@araOS"; },
      date() { return new Date().toString(); },
      ls() {
        return "about  projects  writing  reading  gallery  contact  terminal  read.me";
      },
      neofetch() {
        return [
          "        ◈◈◈        guest@araOS",
          "      ◈     ◈      -----------",
          "     ◈  ara  ◈     os:      araOS 1.0 (web)",
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

    print("araOS terminal — type <b>help</b> to get started.");

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const raw = input.value.trim();
      input.value = "";
      if (!raw) return;
      print('<span style="color:#8affc1">ara@araOS:~$</span> ' + escapeHtml(raw));
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

  // ── boot: open a couple of windows so it doesn't look empty ───────────────────
  if (desktop.clientWidth > 660) {
    openWindow("win-readme");
    openWindow("win-about");
  } else {
    openWindow("win-readme");
  }
})();
