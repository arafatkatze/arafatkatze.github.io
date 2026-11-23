window.MathJax = {
  tex: {
    tags: "ams",
    // Inline math is \\( ... \\) only. A single "$" is not a delimiter: any
    // sentence with two prices in it ("$49.8 ... $65") was being typeset as a
    // formula. Display math ($$ ... $$) is unaffected.
    inlineMath: [["\\(", "\\)"]],
  },
  options: {
    renderActions: {
      addCss: [
        200,
        function (doc) {
          const style = document.createElement("style");
          style.innerHTML = `
          .mjx-container {
            color: inherit;
          }
        `;
          document.head.appendChild(style);
        },
        "",
      ],
    },
  },
};
