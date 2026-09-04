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

  /* Optional mailto contact form */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector('[name="name"]') || {}).value || "";
      var org = (form.querySelector('[name="organization"]') || {}).value || "";
      var email = (form.querySelector('[name="email"]') || {}).value || "";
      var phone = (form.querySelector('[name="phone"]') || {}).value || "";
      var interest = (form.querySelector('[name="interest"]') || {}).value || "";
      var message = (form.querySelector('[name="message"]') || {}).value || "";

      var subject = encodeURIComponent("Website inquiry: Velocity Contracting LLC");
      var body = encodeURIComponent(
        "Name: " + name + "\n" +
        "Organization: " + org + "\n" +
        "Email: " + email + "\n" +
        "Phone: " + phone + "\n" +
        "Interest: " + interest + "\n\n" +
        message
      );
      window.location.href =
        "mailto:guess@velocitycontractingllc.com?subject=" + subject + "&body=" + body;
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
