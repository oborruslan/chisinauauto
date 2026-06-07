(function () {
  const body = document.body;
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#primary-nav");
  const bookingForm = document.querySelector("#booking-form");
  const bookingStatus = document.querySelector("#booking-status");
  const carSelect = document.querySelector("#car-select");
  const rentalDate = document.querySelector("#rental-date");
  const cookieBanner = document.querySelector("#cookie-banner");
  const acceptCookies = document.querySelector("#accept-cookies");
  const currentYear = document.querySelector("#current-year");
  const galleryLightbox = document.querySelector("#gallery-lightbox");
  const galleryImage = document.querySelector("#gallery-image");
  const galleryTitle = document.querySelector("#gallery-title");
  const galleryLines = document.querySelector("#gallery-lines");
  const galleryClose = document.querySelector("#gallery-close");
  const galleryPrev = document.querySelector("#gallery-prev");
  const galleryNext = document.querySelector("#gallery-next");
  const phoneNumber = "37378967777";
  let activeGallery = [];
  let activeGalleryIndex = 0;
  let activeGalleryCard = null;
  let galleryOpener = null;
  let touchStartX = 0;

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  if (rentalDate) {
    rentalDate.min = new Date().toISOString().slice(0, 10);
  }

  function getCarName(card) {
    return card?.querySelector(".car-title h3")?.textContent.trim() || "Galerie auto";
  }

  function getCardGallery(card) {
    return Array.from(card?.querySelectorAll(".image-strip a") || []).map(function (link) {
      const thumbnail = link.querySelector("img");

      return {
        src: link.getAttribute("href") || thumbnail?.getAttribute("src") || "",
        alt: thumbnail?.getAttribute("alt") || getCarName(card)
      };
    });
  }

  function setCardPhoto(card, index) {
    const gallery = getCardGallery(card);
    const photo = gallery[index];
    const mainImage = card?.querySelector(".car-media > img");

    if (!photo || !mainImage) {
      return;
    }

    mainImage.src = photo.src;
    mainImage.alt = photo.alt;

    card.querySelectorAll(".image-strip a").forEach(function (link, linkIndex) {
      const isActive = linkIndex === index;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function renderGalleryLines() {
    if (!galleryLines) {
      return;
    }

    galleryLines.innerHTML = "";

    activeGallery.forEach(function (_, index) {
      const line = document.createElement("button");
      line.type = "button";
      line.className = "gallery-line";
      line.setAttribute("aria-label", "Deschide poza " + (index + 1));
      line.addEventListener("click", function () {
        setGalleryIndex(index);
      });
      galleryLines.appendChild(line);
    });
  }

  function setGalleryIndex(index) {
    if (!activeGallery.length || !galleryImage || !galleryTitle) {
      return;
    }

    activeGalleryIndex = (index + activeGallery.length) % activeGallery.length;
    const photo = activeGallery[activeGalleryIndex];

    galleryImage.src = photo.src;
    galleryImage.alt = photo.alt;
    galleryTitle.textContent =
      getCarName(activeGalleryCard) +
      " - poza " +
      (activeGalleryIndex + 1) +
      " din " +
      activeGallery.length;

    galleryLines?.querySelectorAll(".gallery-line").forEach(function (line, lineIndex) {
      const isActive = lineIndex === activeGalleryIndex;
      line.classList.toggle("is-active", isActive);
      line.setAttribute("aria-current", String(isActive));
    });

    setCardPhoto(activeGalleryCard, activeGalleryIndex);
  }

  function openGallery(card, index) {
    if (!galleryLightbox) {
      return;
    }

    activeGallery = getCardGallery(card);

    if (!activeGallery.length) {
      return;
    }

    activeGalleryCard = card;
    galleryOpener = document.activeElement;
    galleryLightbox.hidden = false;
    body.classList.add("gallery-open");
    renderGalleryLines();
    setGalleryIndex(index);
    galleryClose?.focus();
  }

  function closeGallery() {
    if (!galleryLightbox) {
      return;
    }

    galleryLightbox.hidden = true;
    body.classList.remove("gallery-open");

    if (galleryImage) {
      galleryImage.removeAttribute("src");
      galleryImage.alt = "";
    }

    galleryOpener?.focus?.();
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

  document.querySelectorAll(".car-card").forEach(function (card) {
    const galleryLinks = Array.from(card.querySelectorAll(".image-strip a"));
    const mainImage = card.querySelector(".car-media > img");

    if (!galleryLinks.length || !mainImage) {
      return;
    }

    setCardPhoto(card, 0);
    mainImage.tabIndex = 0;
    mainImage.setAttribute("role", "button");
    mainImage.setAttribute("aria-label", "Deschide galeria " + getCarName(card));

    function openCurrentCardGallery() {
      const currentIndex = galleryLinks.findIndex(function (link) {
        return link.classList.contains("is-active");
      });

      openGallery(card, currentIndex >= 0 ? currentIndex : 0);
    }

    mainImage.addEventListener("click", openCurrentCardGallery);
    mainImage.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCurrentCardGallery();
      }
    });

    galleryLinks.forEach(function (link, index) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        setCardPhoto(card, index);
        openGallery(card, index);
      });
    });
  });

  galleryClose?.addEventListener("click", closeGallery);
  galleryPrev?.addEventListener("click", function () {
    setGalleryIndex(activeGalleryIndex - 1);
  });
  galleryNext?.addEventListener("click", function () {
    setGalleryIndex(activeGalleryIndex + 1);
  });

  galleryLightbox?.addEventListener("click", function (event) {
    if (event.target === galleryLightbox) {
      closeGallery();
    }
  });

  galleryLightbox?.addEventListener(
    "touchstart",
    function (event) {
      touchStartX = event.changedTouches[0]?.clientX || 0;
    },
    { passive: true }
  );

  galleryLightbox?.addEventListener(
    "touchend",
    function (event) {
      const touchEndX = event.changedTouches[0]?.clientX || 0;
      const deltaX = touchEndX - touchStartX;

      if (Math.abs(deltaX) < 50) {
        return;
      }

      setGalleryIndex(activeGalleryIndex + (deltaX < 0 ? 1 : -1));
    },
    { passive: true }
  );

  document.addEventListener("keydown", function (event) {
    if (!galleryLightbox || galleryLightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeGallery();
    } else if (event.key === "ArrowLeft") {
      setGalleryIndex(activeGalleryIndex - 1);
    } else if (event.key === "ArrowRight") {
      setGalleryIndex(activeGalleryIndex + 1);
    }
  });

  if (bookingForm) {
    bookingForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!bookingForm.reportValidity()) {
        return;
      }

      const submitter = event.submitter;
      const formData = new FormData(bookingForm);
      const action = submitter?.dataset.submitAction || "whatsapp";

      if (action === "paynet") {
        await startPaynetCheckout(formData, submitter);
        return;
      }

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

  async function startPaynetCheckout(formData, submitter) {
    setBookingStatus("Pregatim plata Paynet...", "pending");
    toggleFormButtons(true);

    try {
      const response = await fetch("/api/paynet/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Paynet nu a acceptat cererea.");
      }

      setBookingStatus("Redirectionam catre Paynet...", "success");
      submitPaynetForm(data.gatewayUrl, data.fields);
    } catch (error) {
      setBookingStatus(
        (error && error.message ? error.message : "Plata Paynet nu este disponibila.") +
          " Poti trimite cererea pe WhatsApp.",
        "error"
      );
      submitter?.focus();
    } finally {
      toggleFormButtons(false);
    }
  }

  function submitPaynetForm(action, fields) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.hidden = true;

    Object.entries(fields || {}).forEach(function ([name, value]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  function toggleFormButtons(isDisabled) {
    bookingForm?.querySelectorAll("button[type='submit']").forEach(function (button) {
      button.disabled = isDisabled;
    });
  }

  function setBookingStatus(message, type) {
    if (!bookingStatus) {
      return;
    }

    bookingStatus.textContent = message;
    bookingStatus.dataset.type = type || "";
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
