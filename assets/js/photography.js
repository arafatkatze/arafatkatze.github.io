/*
 * Photography page controller.
 *
 * Reads a JSON blob describing all photo projects, renders the active
 * project's grid, wires up the pill switcher (with deep-link via
 * ?project=<slug>), and handles the lightbox (click + keyboard).
 */
(function () {
  "use strict";

  function init() {
    var dataNode = document.getElementById("photo-projects-data");
    var stack = document.getElementById("photo-gallery-stack");
    var pillsContainer = document.getElementById("photo-gallery-projects");
    var titleEl = document.getElementById("photo-gallery-title");
    var captionEl = document.getElementById("photo-gallery-caption");
    var lightbox = document.getElementById("photo-lightbox");

    if (!dataNode || !stack || !pillsContainer || !lightbox) return;

    var projects = [];
    try {
      projects = (JSON.parse(dataNode.textContent) || {}).projects || [];
    } catch (err) {
      console.error("photography: bad project data", err);
      return;
    }
    if (!projects.length) return;

    var bySlug = {};
    projects.forEach(function (p) { bySlug[p.slug] = p; });

    var imageEl = document.getElementById("photo-lightbox-image");
    var counterEl = document.getElementById("photo-lightbox-counter");

    var activeSlug = null;
    var activeImages = [];
    var current = -1;
    var lastFocus = null;

    function readSlugFromUrl() {
      try {
        var params = new URLSearchParams(window.location.search);
        var slug = params.get("project");
        if (slug && bySlug[slug]) return slug;
      } catch (e) { /* no-op */ }
      return projects[0].slug;
    }

    function writeSlugToUrl(slug) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set("project", slug);
        window.history.replaceState({}, "", url.toString());
      } catch (e) { /* no-op */ }
    }

    function renderGrid(project) {
      stack.innerHTML = "";
      var frag = document.createDocumentFragment();
      project.images.forEach(function (src, idx) {
        var fig = document.createElement("figure");
        fig.className = "photo-gallery__frame";
        fig.setAttribute("data-index", String(idx));
        fig.setAttribute("tabindex", "0");
        fig.setAttribute("role", "button");
        fig.setAttribute("aria-label", "Open photograph " + (idx + 1));
        var img = document.createElement("img");
        img.className = "photo-gallery__image";
        img.src = src;
        img.alt = "Photograph " + (idx + 1);
        img.loading = "lazy";
        img.decoding = "async";
        fig.appendChild(img);
        fig.addEventListener("click", function () { openLightbox(idx); });
        fig.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(idx);
          }
        });
        frag.appendChild(fig);
      });
      stack.appendChild(frag);
    }

    function setActiveProject(slug, opts) {
      var project = bySlug[slug];
      if (!project) return;
      activeSlug = slug;
      activeImages = project.images || [];

      if (titleEl) titleEl.textContent = project.title || "";
      if (captionEl) {
        if (project.description) {
          captionEl.textContent = project.description;
          captionEl.hidden = false;
        } else {
          captionEl.textContent = "";
          captionEl.hidden = true;
        }
      }

      var pills = pillsContainer.querySelectorAll(".photo-gallery__pill");
      pills.forEach(function (pill) {
        var isActive = pill.getAttribute("data-project-slug") === slug;
        pill.classList.toggle("is-active", isActive);
        pill.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      renderGrid(project);

      if (opts && opts.updateUrl) writeSlugToUrl(slug);

      document.title = project.title + " · Photography";

      // Reset scroll to the top of the gallery section on switch (but not
      // on initial load, which would fight deep-link anchors).
      if (opts && opts.scrollTo) {
        var top = document.querySelector(".photo-gallery");
        if (top && typeof top.scrollIntoView === "function") {
          top.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }

    /* ---------- Lightbox ---------- */

    function openLightbox(index) {
      if (index < 0 || index >= activeImages.length) return;
      current = index;
      imageEl.src = activeImages[index];
      imageEl.alt = "Photograph " + (index + 1) + " of " + activeImages.length;
      counterEl.textContent = (index + 1) + " / " + activeImages.length;
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

    function closeLightbox() {
      lightbox.removeAttribute("data-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("photo-lightbox-open");
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
      if (current < 0 || !activeImages.length) return;
      var next = (current + delta + activeImages.length) % activeImages.length;
      openLightbox(next);
    }

    lightbox.addEventListener("click", function (event) {
      var target = event.target;
      var action = target && target.getAttribute && target.getAttribute("data-photo-action");
      if (action === "close") return closeLightbox();
      if (action === "prev") return step(-1);
      if (action === "next") return step(1);
      if (target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (event) {
      if (lightbox.getAttribute("data-open") !== "true") return;
      switch (event.key) {
        case "Escape":   event.preventDefault(); closeLightbox(); break;
        case "ArrowLeft":  event.preventDefault(); step(-1); break;
        case "ArrowRight": event.preventDefault(); step(1); break;
      }
    });

    /* ---------- Pill switcher ---------- */

    pillsContainer.addEventListener("click", function (event) {
      var pill = event.target.closest(".photo-gallery__pill");
      if (!pill) return;
      var slug = pill.getAttribute("data-project-slug");
      if (!slug || slug === activeSlug) return;
      setActiveProject(slug, { updateUrl: true, scrollTo: false });
    });

    pillsContainer.addEventListener("keydown", function (event) {
      var pill = event.target.closest(".photo-gallery__pill");
      if (!pill) return;
      var pills = Array.prototype.slice.call(
        pillsContainer.querySelectorAll(".photo-gallery__pill")
      );
      var idx = pills.indexOf(pill);
      if (idx < 0) return;
      var next = null;
      switch (event.key) {
        case "ArrowRight": next = pills[(idx + 1) % pills.length]; break;
        case "ArrowLeft":  next = pills[(idx - 1 + pills.length) % pills.length]; break;
        case "Home":       next = pills[0]; break;
        case "End":        next = pills[pills.length - 1]; break;
      }
      if (next) {
        event.preventDefault();
        next.focus();
        next.click();
      }
    });

    /* ---------- Back/forward nav between projects ---------- */

    window.addEventListener("popstate", function () {
      var slug = readSlugFromUrl();
      if (slug && slug !== activeSlug) setActiveProject(slug, { updateUrl: false });
    });

    /* ---------- Boot ---------- */

    setActiveProject(readSlugFromUrl(), { updateUrl: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
