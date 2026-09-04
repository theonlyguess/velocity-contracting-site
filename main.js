(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && nav) {
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    });
  }

  /* Mark current nav item */
  var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (path === "" || path === "/") path = "index.html";
  document.querySelectorAll(".site-nav a[href]").forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
    if (!href) return;
    var file = href.split("/").pop();
    if (file === path || (path === "index.html" && (file === "index.html" || file === "./" || file === ""))) {
      a.setAttribute("aria-current", "page");
    }
  });

  /* Contact form: Formsubmit AJAX. Never claim success unless the API says so. */
  var form = document.getElementById("contact-form");
  if (form) {
    var successBox = document.getElementById("form-success");
    var errorBox = document.getElementById("form-error");
    var fieldsWrap = document.getElementById("form-fields");
    var submitBtn = form.querySelector('[type="submit"]');
    var defaultLabel = submitBtn ? submitBtn.textContent : "Send message";

    function showError(msg) {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = msg;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultLabel;
      }
    }

    function isFormsubmitSuccess(data) {
      if (!data || typeof data !== "object") return false;
      return data.success === true || data.success === "true";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = "";
      }

      var honeypot = form.querySelector('[name="_gotcha"]');
      if (honeypot && String(honeypot.value || "").trim() !== "") {
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending";
      }

      var payload = {
        name: (form.querySelector('[name="name"]') || {}).value || "",
        organization: (form.querySelector('[name="organization"]') || {}).value || "",
        email: (form.querySelector('[name="email"]') || {}).value || "",
        phone: (form.querySelector('[name="phone"]') || {}).value || "",
        interest: (form.querySelector('[name="interest"]') || {}).value || "",
        message: (form.querySelector('[name="message"]') || {}).value || "",
        _subject: "Velocity Contracting website inquiry",
        _template: "table",
        _captcha: "false"
      };

      fetch("https://formsubmit.co/ajax/guess@velocitycontractingllc.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(
            function (data) {
              return data;
            },
            function () {
              return null;
            }
          );
        })
        .then(function (data) {
          if (isFormsubmitSuccess(data)) {
            if (successBox) successBox.hidden = false;
            if (fieldsWrap) fieldsWrap.hidden = true;
            form.reset();
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = defaultLabel;
            }
          } else {
            showError(
              "The message could not be sent. Please email guess@velocitycontractingllc.com or call 806-252-7815."
            );
          }
        })
        .catch(function () {
          showError(
            "The message could not be sent. Please email guess@velocitycontractingllc.com or call 806-252-7815."
          );
        });
    });
  }

  /* Register service worker for installability / offline cache */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* silent; SW optional */
      });
    });
  }
})();
