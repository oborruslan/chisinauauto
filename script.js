(function () {
  const body = document.body;
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#primary-nav");
  const bookingForm = document.querySelector("#booking-form");
  const carSelect = document.querySelector("#car-select");
  const rentalDate = document.querySelector("#rental-date");
  const cookieBanner = document.querySelector("#cookie-banner");
  const acceptCookies = document.querySelector("#accept-cookies");
  const currentYear = document.querySelector("#current-year");
  const phoneNumber = "37378967777";

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  if (rentalDate) {
    rentalDate.min = new Date().toISOString().slice(0, 10);
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      body.classList.toggle("nav-open", !isOpen);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        body.classList.remove("nav-open");
      });
    });
  }

  document.querySelectorAll("[data-car]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (carSelect) {
        carSelect.value = button.dataset.car || "";
      }

      document.querySelector("#rezervare")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () {
        rentalDate?.focus();
      }, 420);
    });
  });

  if (bookingForm) {
    bookingForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!bookingForm.reportValidity()) {
        return;
      }

      const formData = new FormData(bookingForm);
      const message = [
        "Salut, vreau sa rezerv o masina de la Chirie Auto A.N.B.",
        "",
        "Masina: " + formData.get("car"),
        "Data preluarii: " + formData.get("date"),
        "Numar de zile: " + formData.get("days"),
        "Nume: " + formData.get("name"),
        "Telefon: " + formData.get("phone"),
        "Detalii: " + (formData.get("details") || "Nu am detalii suplimentare")
      ].join("\n");

      window.open("https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(message), "_blank", "noopener");
    });
  }

  if (cookieBanner && acceptCookies) {
    const hasAcceptedCookies = localStorage.getItem("anbCookieNotice") === "accepted";
    cookieBanner.hidden = hasAcceptedCookies;

    acceptCookies.addEventListener("click", function () {
      localStorage.setItem("anbCookieNotice", "accepted");
      cookieBanner.hidden = true;
    });
  }
})();
