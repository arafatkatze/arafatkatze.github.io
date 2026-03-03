// Color Scheme Picker
// Allows users to switch between color schemes.
// When a color scheme (non-default) is selected, it forces light mode
// so the colorful backgrounds are visible. Selecting "default" restores
// the user's dark/light preference.

(function () {
  "use strict";

  var STORAGE_KEY = "color-scheme";
  var DEFAULT_SCHEME = "default";

  var VALID_SCHEMES = [
    "default",
    "rose",
    "orange",
    "green",
    "teal",
    "blue",
    "indigo",
    "slate",
  ];

  function getStoredScheme() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_SCHEMES.indexOf(stored) !== -1) {
      return stored;
    }
    return DEFAULT_SCHEME;
  }

  /**
   * Apply a color scheme. Non-default schemes force light mode.
   * "default" restores the user's theme preference (light/dark/system).
   */
  function setColorScheme(scheme) {
    if (VALID_SCHEMES.indexOf(scheme) === -1) return;

    // Smooth transition
    if (typeof transTheme === "function") {
      transTheme();
    }

    // Set the color scheme attribute
    document.documentElement.setAttribute("data-color-scheme", scheme);
    localStorage.setItem(STORAGE_KEY, scheme);

    if (scheme !== "default") {
      // Force light mode so colorful backgrounds show through
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      // Restore the user's original theme preference
      if (typeof applyTheme === "function") {
        applyTheme();
      }
    }

    updateActiveDot(scheme);
  }

  function updateActiveDot(scheme) {
    var dots = document.querySelectorAll(".color-dot");
    if (!dots.length) return;

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      if (dot.getAttribute("data-scheme") === scheme) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    }
  }

  function init() {
    var currentScheme = getStoredScheme();

    // Apply scheme attribute
    document.documentElement.setAttribute("data-color-scheme", currentScheme);

    // If a non-default scheme is active, force light mode
    if (currentScheme !== "default") {
      document.documentElement.setAttribute("data-theme", "light");
    }

    // Mark active dot
    updateActiveDot(currentScheme);

    // Click handlers
    var dots = document.querySelectorAll(".color-dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].addEventListener("click", function () {
        var scheme = this.getAttribute("data-scheme");
        setColorScheme(scheme);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
