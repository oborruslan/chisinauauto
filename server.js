"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URLSearchParams } = require("url");

const rootDir = __dirname;
loadEnv(path.join(rootDir, ".env"));

const carPricesEur = {
  "Opel Meriva": 25,
  "Volkswagen Jetta": 30,
  "Ford Focus": 25,
  "Skoda Rapid": 20
};

const config = {
  port: toInteger(process.env.PORT, 8080),
  publicBaseUrl: trimTrailingSlash(process.env.PUBLIC_BASE_URL || "http://localhost:8080"),
  paynetApiBaseUrl: trimTrailingSlash(process.env.PAYNET_API_BASE_URL || "https://api-merchant.test.paynet.md"),
  paynetGatewayUrl: process.env.PAYNET_GATEWAY_URL || "https://test.paynet.md/acquiring/getecom",
  merchantCode: process.env.PAYNET_MERCHANT_CODE || "",
  saleAreaCode: process.env.PAYNET_SALE_AREA_CODE || "",
  merchantUser: process.env.PAYNET_MERCHANT_USER || "",
  merchantPassword: process.env.PAYNET_MERCHANT_PASSWORD || "",
  authIncludeContext: String(process.env.PAYNET_AUTH_INCLUDE_CONTEXT || "false").toLowerCase() === "true",
  currency: toInteger(process.env.PAYNET_CURRENCY, 498),
  lang: process.env.PAYNET_LANG || "ro",
  signVersion: process.env.PAYNET_SIGN_VERSION || "v01",
  eurToMdl: toNumber(process.env.PAYNET_EUR_TO_MDL, 20)
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async function (request, response) {
  try {
    const requestUrl = new URL(request.url, config.publicBaseUrl);

    if (request.method === "GET" && requestUrl.pathname === "/api/paynet/status") {
      return sendJson(response, 200, {
        configured: isPaynetConfigured(),
        merchantCode: mask(config.merchantCode),
        saleAreaCode: config.saleAreaCode || null,
        apiBaseUrl: config.paynetApiBaseUrl,
        gatewayUrl: config.paynetGatewayUrl
      });
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/paynet/checkout") {
      return handlePaynetCheckout(request, response);
    }

    if (request.method === "GET" && requestUrl.pathname === "/paynet/success") {
      return sendStatusPage(response, "Plata a fost trimisa spre confirmare", "Multumim. Daca plata a fost aprobata, agentia va confirma rezervarea telefonic.");
    }

    if (request.method === "GET" && requestUrl.pathname === "/paynet/cancel") {
      return sendStatusPage(response, "Plata a fost anulata", "Rezervarea nu a fost achitata prin Paynet. Poti reveni pe site si trimite cererea prin WhatsApp.");
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return sendJson(response, 405, { error: "Metoda nu este permisa." });
    }

    return serveStatic(requestUrl.pathname, response, request.method === "HEAD");
  } catch (error) {
    if (error instanceof PaynetError) {
      return sendJson(response, 502, {
        error: error.message,
        paynetStatus: error.status,
        details: error.details
      });
    }

    console.error(error);
    return sendJson(response, 500, { error: "Eroare interna. Incearca din nou." });
  }
});

server.listen(config.port, function () {
  console.log("Chirie Auto A.N.B ruleaza pe " + config.publicBaseUrl);
  console.log("Paynet configurat: " + (isPaynetConfigured() ? "da" : "nu"));
});

async function handlePaynetCheckout(request, response) {
  if (!isPaynetConfigured()) {
    return sendJson(response, 500, {
      error: "Paynet nu este configurat. Completeaza PAYNET_MERCHANT_USER, PAYNET_MERCHANT_PASSWORD si PAYNET_MERCHANT_CODE in .env."
    });
  }

  const body = await readJson(request);
  const booking = normalizeBooking(body);
  const validationError = validateBooking(booking);

  if (validationError) {
    return sendJson(response, 400, { error: validationError });
  }

  const paymentRequest = buildPaymentRequest(booking);
  const token = await getPaynetToken();
  const payment = await sendPaynetPayment(paymentRequest, token);
  const paymentId = payment.PaymentId || payment.PaymentID || payment.paymentId || payment.paymentID;
  const signature = payment.Signature || payment.signature;

  if (!paymentId || !signature) {
    return sendJson(response, 502, {
      error: "Paynet nu a returnat PaymentId/Signature.",
      details: sanitizePaynetResponse(payment)
    });
  }

  return sendJson(response, 200, {
    gatewayUrl: config.paynetGatewayUrl,
    invoice: paymentRequest.Invoice,
    amountMdl: paymentRequest.Services[0].Amount / 100,
    fields: {
      operation: String(paymentId),
      LinkUrlSucces: paymentRequest.LinkUrlSuccess,
      LinkUrlCancel: paymentRequest.LinkUrlCancel,
      ExpiryDate: paymentRequest.ExpiryDate,
      Signature: signature,
      Lang: config.lang
    }
  });
}

async function getPaynetToken() {
  const authBody = new URLSearchParams({
    grant_type: "password",
    username: config.merchantUser,
    password: config.merchantPassword
  });

  if (config.authIncludeContext) {
    authBody.set("merchantcode", config.merchantCode);
    if (config.saleAreaCode) {
      authBody.set("salearea", config.saleAreaCode);
    }
  }

  const response = await fetch(config.paynetApiBaseUrl + "/auth", {
    method: "POST",
    headers: {
      "Accept-Language": "ro-RO",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: authBody
  });
  const data = await parsePaynetResponse(response);

  if (!response.ok || !data.access_token) {
    throw new PaynetError("Autentificarea Paynet a esuat.", response.status, sanitizePaynetResponse(data));
  }

  return data.access_token;
}

async function sendPaynetPayment(paymentRequest, token) {
  const response = await fetch(config.paynetApiBaseUrl + "/api/Payments/Send", {
    method: "POST",
    headers: {
      Authorization: "bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(paymentRequest)
  });
  const data = await parsePaynetResponse(response);

  if (!response.ok || data.Code) {
    throw new PaynetError("Paynet a refuzat crearea platii.", response.status, sanitizePaynetResponse(data));
  }

  return data;
}

function buildPaymentRequest(booking) {
  const invoice = Date.now();
  const days = toInteger(booking.days, 1);
  const priceEur = carPricesEur[booking.car];
  const unitPriceMdlBani = Math.round(priceEur * config.eurToMdl * 100);
  const quantity = days * 100;
  const totalAmount = unitPriceMdlBani * days;
  const description = "Rezervare " + booking.car + " pentru " + days + " zile din " + booking.date;
  const customerName = booking.name.trim();
  const nameParts = customerName.split(/\s+/);
  const firstName = nameParts[0] || customerName;
  const lastName = nameParts.slice(1).join(" ") || "-";
  const successUrl = config.publicBaseUrl + "/paynet/success?invoice=" + encodeURIComponent(invoice);
  const cancelUrl = config.publicBaseUrl + "/paynet/cancel?invoice=" + encodeURIComponent(invoice);
  const now = new Date();
  const expires = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  return {
    Invoice: invoice,
    MerchantCode: config.merchantCode,
    SaleAreaCode: config.saleAreaCode || undefined,
    LinkUrlSuccess: successUrl,
    LinkUrlCancel: cancelUrl,
    Signature: null,
    SignVersion: config.signVersion,
    Customer: {
      Code: booking.email || booking.phone,
      Name: customerName,
      NameFirst: firstName,
      NameLast: lastName,
      email: booking.email || "client@chirieauto.local",
      Country: "Moldova",
      City: "Ungheni",
      Address: booking.details || "Chirie Auto A.N.B",
      PhoneNumber: booking.phone
    },
    Payer: null,
    Currency: config.currency,
    ExternalDate: formatPaynetDate(now),
    ExpiryDate: formatPaynetDate(expires),
    Services: [
      {
        Name: "Chirie Auto A.N.B",
        Description: description,
        Amount: totalAmount,
        Products: [
          {
            GroupName: null,
            QualitiesConcat: null,
            LineNo: 1,
            GroupId: null,
            Code: booking.car.replace(/\s+/g, "-").toLowerCase(),
            Barcode: invoice,
            Name: booking.car,
            Description: description,
            UnitPrice: unitPriceMdlBani,
            UnitProduct: "zi",
            Quantity: quantity,
            Amount: null,
            Dimensions: null,
            Qualities: null,
            TotalAmount: totalAmount
          }
        ]
      }
    ],
    MoneyType: null
  };
}

function normalizeBooking(body) {
  return {
    car: cleanText(body.car),
    date: cleanText(body.date),
    days: cleanText(body.days),
    name: cleanText(body.name),
    phone: cleanPhone(body.phone),
    email: cleanText(body.email).toLowerCase(),
    details: cleanText(body.details)
  };
}

function validateBooking(booking) {
  if (!carPricesEur[booking.car]) {
    return "Alege o masina valida.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    return "Alege data preluarii.";
  }

  const days = toInteger(booking.days, 0);
  if (days < 1 || days > 60) {
    return "Numarul de zile trebuie sa fie intre 1 si 60.";
  }

  if (booking.name.length < 2) {
    return "Completeaza numele.";
  }

  if (booking.phone.length < 7) {
    return "Completeaza telefonul.";
  }

  if (booking.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
    return "Emailul nu pare valid.";
  }

  return "";
}

function serveStatic(urlPath, response, headOnly) {
  const decodedPath = decodeURIComponent(urlPath);
  const safePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(rootDir, "." + safePath);

  if (!filePath.startsWith(rootDir)) {
    return sendJson(response, 403, { error: "Acces interzis." });
  }

  fs.stat(filePath, function (error, stats) {
    if (error || !stats.isFile()) {
      return sendJson(response, 404, { error: "Fisier negasit." });
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stats.size,
      "Cache-Control": "no-store"
    });

    if (headOnly) {
      return response.end();
    }

    fs.createReadStream(filePath).pipe(response);
  });
}

function sendStatusPage(response, title, message) {
  const html = "<!doctype html><html lang=\"ro\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" +
    escapeHtml(title) +
    "</title><link rel=\"stylesheet\" href=\"/styles.css\"></head><body><main class=\"paynet-status-page\"><section><p class=\"eyebrow\">Paynet</p><h1>" +
    escapeHtml(title) +
    "</h1><p>" +
    escapeHtml(message) +
    "</p><a class=\"button button-primary\" href=\"/\">Inapoi la site</a></section></main></body></html>";

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function parsePaynetResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function isPaynetConfigured() {
  return Boolean(config.merchantCode && config.merchantUser && config.merchantPassword);
}

function sanitizePaynetResponse(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const copy = Array.isArray(data) ? data.slice() : { ...data };
  delete copy.access_token;
  delete copy.refresh_token;
  delete copy.token;
  return copy;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 300);
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").slice(0, 24);
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPaynetDate(date) {
  const pad = function (value) {
    return String(value).padStart(2, "0");
  };

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

function mask(value) {
  const text = String(value || "");
  if (text.length <= 3) {
    return text ? "***" : "";
  }
  return text.slice(0, 2) + "***" + text.slice(-1);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach(function (line) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

class PaynetError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
