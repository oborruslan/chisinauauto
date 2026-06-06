(function () {
  const body = document.body;
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#primary-nav");
  const bookingForm = document.querySelector("#booking-form");
  const profileForm = document.querySelector("#profile-form");
  const loginForm = document.querySelector("#login-form");
  const registerForm = document.querySelector("#register-form");
  const resetForm = document.querySelector("#reset-form");
  const authTabs = document.querySelectorAll("[data-auth-tab]");
  const authPanels = document.querySelectorAll("[data-auth-panel]");
  const authMessage = document.querySelector("#auth-message");
  const accountState = document.querySelector("#account-state");
  const logoutButton = document.querySelector("#logout-button");
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
  const cartItems = document.querySelector("#cart-items");
  const cartEmpty = document.querySelector("#cart-empty");
  const cartTotalEur = document.querySelector("#cart-total-eur");
  const cartTotalMdl = document.querySelector("#cart-total-mdl");
  const cartNavCount = document.querySelector("#cart-nav-count");
  const mobileCartCount = document.querySelector("#mobile-cart-count");
  const clearCartButton = document.querySelector("#clear-cart");
  const checkoutPaynetButton = document.querySelector("#checkout-paynet");
  const checkoutWhatsappButton = document.querySelector("#checkout-whatsapp");
  const paynetStatus = document.querySelector("#paynet-status");
  const orderList = document.querySelector("#order-list");
  const ordersEmpty = document.querySelector("#orders-empty");
  const clearOrdersButton = document.querySelector("#clear-orders");
  const paymentList = document.querySelector("#payment-list");
  const paymentsEmpty = document.querySelector("#payments-empty");
  const clearPaymentsButton = document.querySelector("#clear-payments");
  const fillBookingButton = document.querySelector("#fill-booking");
  const phoneNumber = "37378967777";
  const eurToMdl = 19.4;
  const paynetConfig = {
    createPaymentEndpoint: "",
    currencyCode: 498,
    currencyLabel: "MDL",
    successUrl: window.location.origin + window.location.pathname + "#profil",
    cancelUrl: window.location.origin + window.location.pathname + "#cos",
    lang: "ro"
  };
  const firebaseConfig = {
    enabled: false,
    config: {
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    }
  };
  let activeGallery = [];
  let activeGalleryIndex = 0;
  let activeGalleryCard = null;
  let galleryOpener = null;
  let touchStartX = 0;
  let cart = readStorage("anbCart", []);
  let orders = readStorage("anbOrders", []);
  let payments = readStorage("anbPayments", []);
  let profile = readStorage("anbProfile", {});
  let localAccounts = readStorage("anbAccounts", []);
  let currentUser = readStorage("anbCurrentUser", null);
  let firebaseServices = null;

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  if (rentalDate) {
    rentalDate.min = new Date().toISOString().slice(0, 10);
  }

  function readStorage(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  async function hashPassword(password, salt) {
    const input = new TextEncoder().encode(salt + ":" + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", input);
    return Array.from(new Uint8Array(hashBuffer))
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function setAuthMessage(message) {
    if (authMessage) {
      authMessage.textContent = message;
    }
  }

  function setAuthTab(tabName) {
    authTabs.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.authTab === tabName);
    });
    authPanels.forEach(function (panel) {
      panel.classList.toggle("is-active", panel.dataset.authPanel === tabName);
    });
  }

  function getScopedKey(baseKey) {
    return currentUser?.email ? baseKey + ":" + currentUser.email : baseKey + ":guest";
  }

  function loadUserData() {
    profile = readStorage(getScopedKey("anbProfile"), currentUser?.profile || readStorage("anbProfile", {}));
    orders = readStorage(getScopedKey("anbOrders"), readStorage("anbOrders", []));
    payments = readStorage(getScopedKey("anbPayments"), readStorage("anbPayments", []));
  }

  function saveUserData() {
    writeStorage(getScopedKey("anbProfile"), profile);
    writeStorage(getScopedKey("anbOrders"), orders);
    writeStorage(getScopedKey("anbPayments"), payments);
  }

  function renderAccount() {
    const mode = firebaseConfig.enabled ? "Firebase" : "local";

    if (accountState) {
      accountState.textContent = currentUser
        ? "Conectat: " + currentUser.email + " (" + mode + ")"
        : "Nu esti conectat. Modul curent: " + mode + ".";
    }

    if (logoutButton) {
      logoutButton.hidden = !currentUser;
    }
  }

  async function getFirebaseServices() {
    if (!firebaseConfig.enabled) {
      return null;
    }

    if (firebaseServices) {
      return firebaseServices;
    }

    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const app = appModule.initializeApp(firebaseConfig.config);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);

    firebaseServices = { authModule, firestoreModule, auth, db };
    return firebaseServices;
  }

  async function syncProfileToFirebase() {
    const services = await getFirebaseServices();

    if (!services || !currentUser?.uid) {
      return;
    }

    const { firestoreModule, db } = services;
    await firestoreModule.setDoc(firestoreModule.doc(db, "clients", currentUser.uid), {
      ...profile,
      email: currentUser.email,
      updatedAt: new Date().toISOString()
    });
  }

  async function syncOrderToFirebase(order) {
    const services = await getFirebaseServices();

    if (!services || !currentUser?.uid) {
      return;
    }

    const { firestoreModule, db } = services;
    await firestoreModule.setDoc(
      firestoreModule.doc(db, "clients", currentUser.uid, "orders", order.id),
      order
    );
  }

  async function syncPaymentToFirebase(payment) {
    const services = await getFirebaseServices();

    if (!services || !currentUser?.uid) {
      return;
    }

    const { firestoreModule, db } = services;
    await firestoreModule.setDoc(
      firestoreModule.doc(db, "clients", currentUser.uid, "payments", payment.id),
      payment
    );
  }

  function makeId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function formatMoney(value, currency) {
    return Math.round(value).toLocaleString("ro-MD") + " " + currency;
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

  function getCartTotals() {
    const totalEur = cart.reduce(function (sum, item) {
      return sum + item.price * item.days;
    }, 0);
    return {
      totalEur,
      totalMdl: totalEur * eurToMdl
    };
  }

  function renderCart() {
    if (!cartItems) {
      return;
    }

    cartItems.innerHTML = "";
    const totals = getCartTotals();
    const count = cart.length;

    cartEmpty.hidden = count > 0;
    cartNavCount.textContent = String(count);
    mobileCartCount.textContent = String(count);
    cartTotalEur.textContent = formatMoney(totals.totalEur, "EUR");
    cartTotalMdl.textContent = formatMoney(totals.totalMdl, "MDL");

    cart.forEach(function (item) {
      const row = document.createElement("article");
      row.className = "cart-row";
      row.innerHTML =
        '<div><strong>' +
        escapeHtml(item.car) +
        "</strong><span>" +
        escapeHtml(item.date || "Data de confirmat") +
        " · " +
        item.days +
        " zile · " +
        item.price +
        " EUR/zi</span></div>" +
        '<div class="cart-row-actions"><strong>' +
        formatMoney(item.price * item.days, "EUR") +
        '</strong><button type="button" data-remove-cart="' +
        item.id +
        '">Sterge</button></div>';
      cartItems.appendChild(row);
    });

    cartItems.querySelectorAll("[data-remove-cart]").forEach(function (button) {
      button.addEventListener("click", function () {
        cart = cart.filter(function (item) {
          return item.id !== button.dataset.removeCart;
        });
        writeStorage("anbCart", cart);
        renderCart();
      });
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addToCart(item) {
    cart.push({
      id: makeId("cart"),
      car: item.car,
      price: Number(item.price) || getCarPrice(item.car),
      date: item.date || "",
      days: Math.max(1, Number(item.days) || 1),
      details: item.details || ""
    });
    writeStorage("anbCart", cart);
    renderCart();
    document.querySelector("#cos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getCarPrice(carName) {
    const option = Array.from(document.querySelectorAll("[data-car]")).find(function (button) {
      return button.dataset.car === carName;
    });
    return Number(option?.dataset.price || 25);
  }

  function renderProfile() {
    if (!profileForm) {
      return;
    }

    Object.entries(profile).forEach(function ([key, value]) {
      const field = profileForm.elements[key];
      if (field) {
        field.value = value || "";
      }
    });
  }

  function renderOrders() {
    if (!orderList) {
      return;
    }

    orderList.innerHTML = "";
    ordersEmpty.hidden = orders.length > 0;

    orders
      .slice()
      .reverse()
      .forEach(function (order) {
        const item = document.createElement("article");
        item.className = "order-item";
        item.innerHTML =
          '<div><strong>' +
          escapeHtml(order.id) +
          '</strong><span class="order-status">' +
          escapeHtml(order.status) +
          "</span></div>" +
          "<p>" +
          escapeHtml(order.summary) +
          "</p>" +
          "<small>" +
          escapeHtml(order.createdAt) +
          " · " +
          formatMoney(order.totalMdl, "MDL") +
          "</small>";
        orderList.appendChild(item);
      });
  }

  function renderPayments() {
    if (!paymentList) {
      return;
    }

    paymentList.innerHTML = "";
    paymentsEmpty.hidden = payments.length > 0;

    payments
      .slice()
      .reverse()
      .forEach(function (payment) {
        const item = document.createElement("article");
        item.className = "order-item payment-item";
        item.innerHTML =
          '<div><strong>' +
          escapeHtml(payment.id) +
          '</strong><span class="order-status">' +
          escapeHtml(payment.status) +
          "</span></div>" +
          "<p>" +
          escapeHtml(payment.method) +
          " · Comanda " +
          escapeHtml(payment.orderId) +
          "</p>" +
          "<small>" +
          escapeHtml(payment.createdAt) +
          " · " +
          formatMoney(payment.amountMdl, "MDL") +
          "</small>";
        paymentList.appendChild(item);
      });
  }

  function getCheckoutPayload(status) {
    const totals = getCartTotals();
    const orderId = makeId("ANB");
    return {
      id: orderId,
      status,
      createdAt: new Date().toLocaleString("ro-MD"),
      totalEur: totals.totalEur,
      totalMdl: totals.totalMdl,
      currency: paynetConfig.currencyLabel,
      currencyCode: paynetConfig.currencyCode,
      lang: paynetConfig.lang,
      successUrl: paynetConfig.successUrl,
      cancelUrl: paynetConfig.cancelUrl,
      customer: profile,
      items: cart.map(function (item, index) {
        return {
          lineNo: index + 1,
          code: item.car.replace(/\s+/g, "-").toUpperCase(),
          name: item.car,
          description: (item.date || "Data de confirmat") + ", " + item.days + " zile",
          quantity: item.days,
          unitPriceEur: item.price,
          unitPriceMdl: item.price * eurToMdl
        };
      }),
      summary: cart
        .map(function (item) {
          return item.car + " (" + item.days + " zile)";
        })
        .join(", ")
    };
  }

  async function saveOrder(order) {
    orders.push(order);
    writeStorage("anbOrders", orders);
    saveUserData();
    renderOrders();
    await syncOrderToFirebase(order);
  }

  async function savePayment(payment) {
    payments.push(payment);
    writeStorage("anbPayments", payments);
    saveUserData();
    renderPayments();
    await syncPaymentToFirebase(payment);
  }

  function createWhatsappMessage(order) {
    return [
      "Salut, vreau sa confirm o comanda la Chirie Auto A.N.B.",
      "",
      "Comanda: " + order.id,
      "Client: " + (profile.name || "Nu este completat"),
      "Telefon: " + (profile.phone || "Nu este completat"),
      "Email: " + (profile.email || "Nu este completat"),
      "Total estimativ: " + formatMoney(order.totalEur, "EUR") + " / " + formatMoney(order.totalMdl, "MDL"),
      "",
      "Rezervari:",
      order.items.map(function (item) {
        return "- " + item.name + ": " + item.description;
      }).join("\n")
    ].join("\n");
  }

  async function startPaynetCheckout() {
    if (!cart.length) {
      setPaynetStatus("Cosul este gol. Adauga mai intai o rezervare.");
      return;
    }

    const order = getCheckoutPayload("In asteptarea platii Paynet");
    await saveOrder(order);
    await savePayment({
      id: makeId("PAY"),
      orderId: order.id,
      status: "Initiata",
      method: "Paynet card online",
      amountMdl: order.totalMdl,
      createdAt: order.createdAt
    });

    if (!paynetConfig.createPaymentEndpoint) {
      setPaynetStatus(
        "Comanda a fost salvata. Pentru plata live trebuie conectat endpointul server-side Paynet."
      );
      window.open("https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(createWhatsappMessage(order)), "_blank", "noopener");
      return;
    }

    try {
      setPaynetStatus("Se initiaza plata Paynet...");
      const response = await fetch(paynetConfig.createPaymentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      const data = await response.json();

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.formHtml) {
        const holder = document.createElement("div");
        holder.hidden = true;
        holder.innerHTML = data.formHtml;
        document.body.appendChild(holder);
        holder.querySelector("form")?.submit();
        return;
      }

      throw new Error("Raspunsul endpointului Paynet nu contine redirectUrl sau formHtml.");
    } catch (error) {
      setPaynetStatus("Plata Paynet nu a pornit: " + error.message);
    }
  }

  function setPaynetStatus(message) {
    if (paynetStatus) {
      paynetStatus.textContent = message;
    }
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
      addToCart({
        car: button.dataset.car || "",
        price: button.dataset.price || 25,
        days: bookingForm?.elements.days?.value || 1,
        date: rentalDate?.value || ""
      });
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
    bookingForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!bookingForm.reportValidity()) {
        return;
      }

      const formData = new FormData(bookingForm);
      profile = {
        ...profile,
        name: formData.get("name") || profile.name || "",
        phone: formData.get("phone") || profile.phone || ""
      };
      writeStorage("anbProfile", profile);
      saveUserData();
      renderProfile();
      addToCart({
        car: formData.get("car"),
        price: getCarPrice(formData.get("car")),
        date: formData.get("date"),
        days: formData.get("days"),
        details: formData.get("details")
      });
    });
  }

  authTabs.forEach(function (button) {
    button.addEventListener("click", function () {
      setAuthTab(button.dataset.authTab);
    });
  });

  registerForm?.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!registerForm.reportValidity()) {
      return;
    }

    const formData = new FormData(registerForm);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");
    const newProfile = {
      name: formData.get("name") || "",
      phone: formData.get("phone") || "",
      email,
      address: ""
    };

    try {
      const services = await getFirebaseServices();

      if (services) {
        const credential = await services.authModule.createUserWithEmailAndPassword(
          services.auth,
          email,
          password
        );
        currentUser = { uid: credential.user.uid, email, profile: newProfile };
      } else {
        if (localAccounts.some(function (account) { return account.email === email; })) {
          setAuthMessage("Exista deja un cont cu acest email.");
          return;
        }
        const salt = makeId("salt");
        const passwordHash = await hashPassword(password, salt);
        currentUser = { uid: makeId("LOCAL"), email, profile: newProfile };
        localAccounts.push({ uid: currentUser.uid, email, salt, passwordHash, profile: newProfile });
        writeStorage("anbAccounts", localAccounts);
      }

      writeStorage("anbCurrentUser", currentUser);
      profile = newProfile;
      saveUserData();
      await syncProfileToFirebase();
      renderAccount();
      renderProfile();
      renderOrders();
      renderPayments();
      setAuthTab("login");
      setAuthMessage("Cont creat si conectat: " + email);
      registerForm.reset();
    } catch (error) {
      setAuthMessage("Crearea contului a esuat: " + error.message);
    }
  });

  loginForm?.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!loginForm.reportValidity()) {
      return;
    }

    const formData = new FormData(loginForm);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");

    try {
      const services = await getFirebaseServices();

      if (services) {
        const credential = await services.authModule.signInWithEmailAndPassword(
          services.auth,
          email,
          password
        );
        currentUser = { uid: credential.user.uid, email };
      } else {
        const account = localAccounts.find(function (item) {
          return item.email === email;
        });

        if (!account) {
          setAuthMessage("Nu exista cont cu acest email.");
          return;
        }

        const passwordHash = await hashPassword(password, account.salt);

        if (passwordHash !== account.passwordHash) {
          setAuthMessage("Parola nu este corecta.");
          return;
        }

        currentUser = { uid: account.uid, email, profile: account.profile };
      }

      writeStorage("anbCurrentUser", currentUser);
      loadUserData();
      renderAccount();
      renderProfile();
      renderOrders();
      renderPayments();
      setAuthMessage("Conectat: " + email);
      loginForm.reset();
    } catch (error) {
      setAuthMessage("Conectarea a esuat: " + error.message);
    }
  });

  resetForm?.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!resetForm.reportValidity()) {
      return;
    }

    const email = normalizeEmail(new FormData(resetForm).get("email"));

    try {
      const services = await getFirebaseServices();

      if (services) {
        await services.authModule.sendPasswordResetEmail(services.auth, email);
        setAuthMessage("Emailul de resetare a parolei a fost trimis.");
      } else {
        const exists = localAccounts.some(function (account) {
          return account.email === email;
        });
        setAuthMessage(
          exists
            ? "Mod local: resetarea prin email necesita Firebase. Creeaza o parola noua dupa conectarea Firebase."
            : "Nu exista cont local cu acest email."
        );
      }

      resetForm.reset();
    } catch (error) {
      setAuthMessage("Resetarea parolei a esuat: " + error.message);
    }
  });

  logoutButton?.addEventListener("click", async function () {
    try {
      const services = await getFirebaseServices();
      if (services) {
        await services.authModule.signOut(services.auth);
      }
    } catch (error) {
      setAuthMessage("Deconectarea Firebase a esuat: " + error.message);
    }

    currentUser = null;
    writeStorage("anbCurrentUser", currentUser);
    loadUserData();
    renderAccount();
    renderProfile();
    renderOrders();
    renderPayments();
    setAuthMessage("Te-ai deconectat.");
  });

  profileForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const formData = new FormData(profileForm);
    profile = Object.fromEntries(formData.entries());
    writeStorage("anbProfile", profile);
    if (currentUser?.email) {
      localAccounts = localAccounts.map(function (account) {
        return account.email === currentUser.email ? { ...account, profile } : account;
      });
      writeStorage("anbAccounts", localAccounts);
      currentUser = { ...currentUser, profile };
      writeStorage("anbCurrentUser", currentUser);
    }
    saveUserData();
    await syncProfileToFirebase();
    renderProfile();
    setAuthMessage("Profilul a fost salvat.");
  });

  fillBookingButton?.addEventListener("click", function () {
    if (!bookingForm) {
      return;
    }
    if (profile.name) {
      bookingForm.elements.name.value = profile.name;
    }
    if (profile.phone) {
      bookingForm.elements.phone.value = profile.phone;
    }
    document.querySelector("#rezervare")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  clearCartButton?.addEventListener("click", function () {
    cart = [];
    writeStorage("anbCart", cart);
    renderCart();
  });

  clearOrdersButton?.addEventListener("click", function () {
    orders = [];
    writeStorage("anbOrders", orders);
    saveUserData();
    renderOrders();
  });

  clearPaymentsButton?.addEventListener("click", function () {
    payments = [];
    writeStorage("anbPayments", payments);
    saveUserData();
    renderPayments();
  });

  checkoutPaynetButton?.addEventListener("click", startPaynetCheckout);

  checkoutWhatsappButton?.addEventListener("click", function () {
    if (!cart.length) {
      setPaynetStatus("Cosul este gol. Adauga mai intai o rezervare.");
      return;
    }
    const order = getCheckoutPayload("Trimisa pe WhatsApp");
    saveOrder(order);
    window.open("https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(createWhatsappMessage(order)), "_blank", "noopener");
  });

  if (cookieBanner && acceptCookies) {
    const hasAcceptedCookies = localStorage.getItem("anbCookieNotice") === "accepted";
    cookieBanner.hidden = hasAcceptedCookies;

    acceptCookies.addEventListener("click", function () {
      localStorage.setItem("anbCookieNotice", "accepted");
      cookieBanner.hidden = true;
    });
  }

  loadUserData();
  renderAccount();
  renderProfile();
  renderCart();
  renderOrders();
  renderPayments();
})();
