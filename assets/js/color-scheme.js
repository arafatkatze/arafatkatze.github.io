// Color Scheme Picker
// Allows users to switch between 10 color schemes.
// The chosen scheme is saved to localStorage and applied site-wide via
// the `data-color-scheme` attribute on <html>.
// The picker UI only exists on the front/about page, but the scheme
// persists and is applied on every page via an inline <head> script.

(function () {
  "use strict";

  var STORAGE_KEY = "color-scheme";
  var DEFAULT_SCHEME = "purple";

  // Valid scheme names (must match CSS selectors in _color-schemes.scss)
  var VALID_SCHEMES = [
    "purple",
    "rose",
    "red",
    "orange",
    "amber",
    "green",
    "teal",
    "blue",
    "indigo",
    "slate",
  ];

  /**
   * Read the stored color scheme from localStorage, falling back to default.
   */
  function getStoredScheme() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_SCHEMES.indexOf(stored) !== -1) {
      return stored;
    }
    return DEFAULT_SCHEME;
  }

  /**
   * Apply a color scheme to the page.
   */
  function setColorScheme(scheme) {
    if (VALID_SCHEMES.indexOf(scheme) === -1) return;

    // Use the existing transition helper from theme.js if available
    if (typeof transTheme === "function") {
      transTheme();
    }

    document.documentElement.setAttribute("data-color-scheme", scheme);
    localStorage.setItem(STORAGE_KEY, scheme);
    updateActiveDot(scheme);
  }

  /**
   * Update the active indicator on the picker dots.
   */
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

  /**
   * Initialize: set up click handlers and mark the active dot.
   */
  function init() {
    var currentScheme = getStoredScheme();

    // Ensure the attribute is set (should already be from inline <head> script,
    // but just in case)
    document.documentElement.setAttribute("data-color-scheme", currentScheme);

    // Mark the active dot
    updateActiveDot(currentScheme);

    // Attach click handlers to dots (only if picker exists on this page)
    var dots = document.querySelectorAll(".color-dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].addEventListener("click", function () {
        var scheme = this.getAttribute("data-scheme");
        setColorScheme(scheme);
      });
    }
  }

  // Run on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
