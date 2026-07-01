// Inline (no-redirect) newsletter signup for Buttondown.
//
// Happy path: POST the email to Buttondown's public embed endpoint in the
// background (fetch) and swap the form for an inline confirmation — the visitor
// never leaves the page.
//
// Fallback: Buttondown's firewall can decide a given signup needs a CAPTCHA
// ("Verify Your Subscription"), which cannot be solved from a background fetch.
// In that case we re-submit the same form into a small popup window so the
// visitor can complete verification without the blog page navigating away.
(function () {
  function setup(container) {
    var form = container.querySelector(".newsletter-form");
    if (!form || container.dataset.newsletterReady === "1") return;
    container.dataset.newsletterReady = "1";

    var input = container.querySelector(".newsletter-form-input");
    var success = container.querySelector(".newsletter-success");
    var errorBox = container.querySelector(".newsletter-error");
    var backBtn = container.querySelector(".newsletter-back-button");
    var submitBtn = container.querySelector(".newsletter-form-button");
    var loadingBtn = container.querySelector(".newsletter-loading-button");

    function show(el, mode) {
      if (el) el.style.display = mode;
    }

    function reset() {
      show(success, "none");
      show(errorBox, "none");
      show(backBtn, "none");
      show(loadingBtn, "none");
      show(input, "");
      show(submitBtn, "");
    }

    function showSuccess() {
      show(loadingBtn, "none");
      show(success, "flex");
      show(backBtn, "block");
      form.reset();
    }

    // Re-submit the (still-populated) form into a popup so Buttondown can show
    // its verification page there. Keeps the blog page exactly where it is.
    function verifyInPopup() {
      var popup = window.open("", "bd_subscribe", "width=480,height=700,scrollbars=yes,resizable=yes");
      if (!popup) {
        // Popup blocked: last resort is a normal submit so signup still works.
        form.submit();
        return;
      }
      var prevTarget = form.target;
      form.target = "bd_subscribe";
      form.submit();
      form.target = prevTarget;
      reset();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = input.value.trim();
      if (!email) return;

      show(submitBtn, "none");
      show(input, "none");
      show(loadingBtn, "flex");

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "email=" + encodeURIComponent(email) + "&embed=1",
      })
        .then(function (res) {
          if (res.ok) {
            showSuccess();
          } else {
            // Firewall/CAPTCHA challenge — finish in a popup.
            verifyInPopup();
          }
        })
        .catch(function () {
          // Network/CORS failure — finish in a popup.
          verifyInPopup();
        });
    });

    if (backBtn) backBtn.addEventListener("click", reset);
  }

  var containers = document.getElementsByClassName("newsletter-form-container");
  for (var i = 0; i < containers.length; i++) setup(containers[i]);
})();
