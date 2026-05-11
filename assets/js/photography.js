/*
 * Photography lightbox controller.
 * Original implementation. Provides keyboard + click navigation through the
 * photo stack, with focus management and body-scroll locking.
 */
(function () {
  "use strict";

  function init() {
    var stack = document.getElementById("photo-gallery-stack");
    var lightbox = document.getElementById("photo-lightbox");
    if (!stack || !lightbox) return;

    var imageEl = document.getElementById("photo-lightbox-image");
    var counterEl = document.getElementById("photo-lightbox-counter");

    var frames = Array.prototype.slice.call(
      stack.querySelectorAll(".photo-gallery__frame")
    );
    var sources = frames.map(function (frame) {
      var img = frame.querySelector("img");
      return img ? img.getAttribute("src") : "";
    });

    var current = -1;
    var lastFocus = null;

    function open(index) {
      if (index < 0 || index >= sources.length) return;
      current = index;
      imageEl.src = sources[index];
      imageEl.alt = "Photograph " + (index + 1) + " of " + sources.length;
      counterEl.textContent = (index + 1) + " / " + sources.length;
      lightbox.hidden = false;
      requestAnimationFrame(function () {
        lightbox.setAttribute("data-open", "true");
        lightbox.setAttribute("aria-hidden", "false");
      });
      document.body.classList.add("photo-lightbox-open");
      lastFocus = document.activeElement;
      var closeBtn = lightbox.querySelector('[data-photo-action="close"]');
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      lightbox.removeAttribute("data-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("photo-lightbox-open");
      // Defer hiding to allow fade-out transition
      window.setTimeout(function () {
        if (lightbox.getAttribute("data-open") !== "true") {
          lightbox.hidden = true;
          imageEl.src = "";
        }
      }, 200);
      current = -1;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }

    function step(delta) {
      if (current < 0) return;
      var next = (current + delta + sources.length) % sources.length;
      open(next);
    }

    frames.forEach(function (frame, idx) {
      frame.setAttribute("tabindex", "0");
      frame.setAttribute("role", "button");
      frame.setAttribute("aria-label", "Open photograph " + (idx + 1));
      frame.addEventListener("click", function () { open(idx); });
      frame.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(idx);
        }
      });
    });

    lightbox.addEventListener("click", function (event) {
      var target = event.target;
      var action = target && target.getAttribute && target.getAttribute("data-photo-action");
      if (action === "close") {
        close();
        return;
      }
      if (action === "prev") {
        step(-1);
        return;
      }
      if (action === "next") {
        step(1);
        return;
      }
      // Click on the dim backdrop (outside the image / controls) closes too.
      if (target === lightbox) close();
    });

    document.addEventListener("keydown", function (event) {
      if (lightbox.getAttribute("data-open") !== "true") return;
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          close();
          break;
        case "ArrowLeft":
          event.preventDefault();
          step(-1);
          break;
        case "ArrowRight":
          event.preventDefault();
          step(1);
          break;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
