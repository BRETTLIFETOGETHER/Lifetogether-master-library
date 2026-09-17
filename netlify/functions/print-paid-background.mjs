var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// netlify/functions/lulu-core.cjs
var require_lulu_core = __commonJS({
  "netlify/functions/lulu-core.cjs"(exports, module) {
    "use strict";
    var SHIPPING_LEVELS = /* @__PURE__ */ new Set(["MAIL", "PRIORITY_MAIL", "GROUND_HD", "GROUND_BUS", "GROUND", "EXPEDITED", "EXPRESS"]);
    var CURRENCIES = /* @__PURE__ */ new Set(["AUD", "CAD", "EUR", "GBP", "USD"]);
    var InputError = class extends Error {
      constructor(message, status = 400) {
        super(message);
        this.status = status;
      }
    };
    var text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
    var integer = (value, min, max, label) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < min || n > max) throw new InputError(`${label} must be between ${min} and ${max}.`);
      return n;
    };
    var money2 = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 1e6) throw new InputError("Retail price is invalid.");
      return n.toFixed(2);
    };
    var identifier = (value, label = "Identifier") => {
      const s = text(value, 100);
      if (!/^[A-Za-z0-9._-]{1,100}$/.test(s)) throw new InputError(`${label} is invalid.`);
      return s;
    };
    var pod = (value) => {
      const s = text(value, 40).toUpperCase();
      const legacy = s.match(/^(\d{4}X\d{4})([A-Z]{2})([A-Z]{3})([A-Z]{2})([A-Z0-9]{8})([A-Z0-9]{3})$/);
      if (legacy) return legacy.slice(1).join(".");
      if (!/^\d{4}X\d{4}\.[A-Z]{2}\.[A-Z]{3}\.[A-Z]{2}\.[A-Z0-9]+\.[A-Z0-9]{3}$/.test(s)) throw new InputError("Add a valid Lulu pod package ID.");
      return s;
    };
    var pdfUrl = (value, label) => {
      let url;
      try {
        url = new URL(text(value, 2e3));
      } catch {
        throw new InputError(`${label} must be a complete HTTPS URL.`);
      }
      if (url.protocol !== "https:" || url.username || url.password) throw new InputError(`${label} must be a public HTTPS URL without embedded credentials.`);
      return url.href;
    };
    var currency = (value) => {
      const s = text(value, 3).toUpperCase() || "USD";
      if (!CURRENCIES.has(s)) throw new InputError("Currency is not supported by Lulu.");
      return s;
    };
    var shippingLevel = (value) => {
      const s = text(value, 30).toUpperCase();
      if (!SHIPPING_LEVELS.has(s)) throw new InputError("Choose a supported shipping level.");
      return s;
    };
    function address(raw = {}) {
      const out = { name: text(raw.name, 120), organization: text(raw.organization, 120), street1: text(raw.street1, 160), street2: text(raw.street2, 160), city: text(raw.city, 100), state_code: text(raw.state_code, 10).toUpperCase(), postcode: text(raw.postcode, 24), country_code: text(raw.country_code, 2).toUpperCase(), phone_number: text(raw.phone_number, 24), email: text(raw.email, 254), is_business: raw.is_business === true };
      if (!out.name && !out.organization) throw new InputError("Add a recipient or organization name.");
      for (const [key, label] of [["street1", "street address"], ["city", "city"], ["postcode", "postal code"], ["country_code", "country code"], ["phone_number", "phone number"]]) if (!out[key]) throw new InputError(`Add the ${label}.`);
      if (!/^[A-Z]{2}$/.test(out.country_code)) throw new InputError("Use a two-letter country code.");
      if (!/^\+?[\d\s\-./()]{8,20}$/.test(out.phone_number)) throw new InputError("Add a valid recipient phone number.");
      if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new InputError("Add a valid recipient email.");
      if (["US", "CA", "AU", "MX"].includes(out.country_code) && !out.state_code) throw new InputError("Add the state or province code.");
      return out;
    }
    function quotePayload(raw = {}) {
      const item = raw.line_item || {};
      return { currency: currency(raw.currency), line_items: [{ page_count: integer(item.page_count, 1, 3e3, "Page count"), pod_package_id: pod(item.pod_package_id), quantity: integer(item.quantity, 1, 1e4, "Quantity") }], shipping_address: address(raw.shipping_address), shipping_option: shippingLevel(raw.shipping_option) };
    }
    function shippingPayload(raw = {}) {
      const item = raw.line_item || {};
      const { country_code, state_code, email, ...destination } = address(raw.shipping_address);
      return { currency: currency(raw.currency), line_items: [{ page_count: integer(item.page_count, 1, 3e3, "Page count"), quantity: integer(item.quantity, 1, 1e4, "Quantity"), pod_package_id: pod(item.pod_package_id) }], shipping_address: { ...destination, country: country_code, state_code } };
    }
    function orderPayload(raw = {}, fallbackEmail = "") {
      const quote = quotePayload(raw), item = raw.line_item || {}, contact = text(raw.contact_email || fallbackEmail, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) throw new InputError("Configure or provide a valid order contact email.");
      return { contact_email: contact, external_id: identifier(raw.external_id || `LT-${Date.now()}`, "Order reference"), line_items: [{ external_id: identifier(item.external_id || `BOOK-${Date.now()}`, "Line-item reference"), printable_normalization: { cover: { source_url: pdfUrl(item.cover_url, "Cover PDF") }, interior: { source_url: pdfUrl(item.interior_url, "Interior PDF") }, pod_package_id: pod(item.pod_package_id) }, quantity: integer(item.quantity, 1, 1e4, "Quantity"), title: text(item.title, 200) || "LifeTogether print edition" }], shipping_address: quote.shipping_address, shipping_level: quote.shipping_option };
    }
    function safeJobId(value) {
      return identifier(value, "Lulu print-job ID");
    }
    function publicError(error) {
      return error instanceof InputError ? { statusCode: error.status, message: error.message } : { statusCode: 500, message: "The print service could not complete this request." };
    }
    module.exports = { InputError, SHIPPING_LEVELS, CURRENCIES, text, integer, money: money2, identifier, pod, pdfUrl, currency, shippingLevel, address, quotePayload, shippingPayload, orderPayload, safeJobId, publicError };
  }
});

// platform/functions/print-staff.mjs
import { randomUUID as randomUUID2 } from "node:crypto";

// platform/functions/print-checkout-core.mjs
var import_lulu_core = __toESM(require_lulu_core(), 1);
import { createHash, createHmac, timingSafeEqual, randomUUID } from "node:crypto";
var PrintError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
var digest = (text) => createHash("sha256").update(text).digest("hex");
var money = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1e5) throw new PrintError("The provider returned an invalid price.", 502);
  return Math.round(n * 100);
};
function signedWebhook(raw, signature, secret) {
  if (!secret || !signature) return false;
  const actual = Buffer.from(signature, "base64"), expected = createHmac("sha256", secret).update(raw).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function readiness(env) {
  return { production: env.LULU_API_ENVIRONMENT === "production", lulu: !!(env.LULU_CLIENT_KEY && env.LULU_CLIENT_SECRET), shopify: !!(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.SHOPIFY_STORE_DOMAIN || "") && env.SHOPIFY_ADMIN_ACCESS_TOKEN && env.SHOPIFY_WEBHOOK_SECRET), enabled: env.LT_PRINT_CHECKOUT_ENABLED === "true" };
}
function checkoutReady(env) {
  const r = readiness(env);
  return r.production && r.lulu && r.shopify && r.enabled;
}
function shopifyAddress(a) {
  const names = a.name.trim().split(/\s+/);
  return { firstName: names.shift(), lastName: names.join(" ") || ".", company: a.organization || "", address1: a.street1, address2: a.street2 || "", city: a.city, provinceCode: a.state_code, countryCode: a.country_code, zip: a.postcode, phone: a.phone_number };
}
var normalized = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function sameAddress(a, b) {
  return !!b && [["street1", "address1"], ["street2", "address2"], ["city", "city"], ["state_code", "province_code"], ["postcode", "zip"], ["country_code", "country_code"]].every(([l, r]) => normalized(a[l]) === normalized(b[r]));
}
function publicOrder(o) {
  return { id: o.id, title: o.title, quantity: o.quantity, status: o.status, currency: o.currency, amount: o.checkoutAmount ?? o.amount, createdAt: o.createdAt, shopifyOrder: o.shopifyNumber, luluId: o.luluId, tracking: o.tracking || [], message: o.message || "", checkoutUrl: o.status === "awaiting_payment" ? o.checkoutUrl : void 0 };
}
function createPrintCheckout({ env, store, lulu, shopify, now = () => Date.now() }) {
  const read = (key) => store.get(key, { type: "json" });
  async function owned(id, owner) {
    if (!/^[a-f0-9-]{36}$/.test(id || "")) throw new PrintError("Order not found.", 404);
    const o = await read("orders/" + id);
    if (!o || o.owner !== owner) throw new PrintError("Order not found.", 404);
    return o;
  }
  async function validatedFile(id, owner, kind) {
    const f = await read("files-meta/" + id);
    if (!f || f.owner !== owner || f.kind !== kind || f.expiresAt < now() + 2 * 864e5) throw new PrintError("Upload both PDFs in this browser before checkout. Expired uploads must be uploaded again.");
    return f;
  }
  async function validate(body, owner) {
    const files = await Promise.all(["interior", "cover"].map((kind) => validatedFile(body[kind + "_id"], owner, kind)));
    const format = import_lulu_core.default.pod(body.pod_package_id), pages = files[0].pageCount;
    const results = {};
    for (const f of files) {
      const key = "validation/" + digest([f.id, format, pages, env.LULU_API_ENVIRONMENT].join(":"));
      let record = await read(key);
      let result;
      if (record) result = await lulu(`/validate-${f.kind}/${import_lulu_core.default.safeJobId(record.id)}/`);
      else {
        result = await lulu(`/validate-${f.kind}/`, { method: "POST", body: { source_url: f.url, pod_package_id: format, ...f.kind === "cover" ? { interior_page_count: pages } : {} } });
        if (!result.id) throw new PrintError("Lulu did not return a validation ID.", 502);
        await store.setJSON(key, { id: result.id });
      }
      results[f.kind] = { status: result.status, errors: result.errors || [] };
    }
    return { files, format, pages, results, valid: Object.values(results).every((r) => ["VALIDATED", "NORMALIZED"].includes(r.status)) };
  }
  async function checkout(body, owner) {
    if (!checkoutReady(env)) throw new PrintError("Customer checkout is not enabled yet. Production Lulu, Shopify, and billing must be connected first.", 503);
    const v = await validate(body, owner);
    if (!v.valid) throw new PrintError("Lulu is still checking your PDFs, or a file needs correction. Refresh the file checks before paying.", 409);
    const payload = { ...body, line_item: { ...body.line_item, page_count: v.pages, pod_package_id: v.format, interior_url: v.files[0].url, cover_url: v.files[1].url } };
    const clean = import_lulu_core.default.quotePayload(payload), quantity = clean.line_items[0].quantity;
    if (quantity > 1e3) throw new PrintError("Contact the team for orders above 1,000 copies.");
    const email = String(body.contact_email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PrintError("Add your email for the receipt and order updates.");
    const quote = await lulu("/print-job-cost-calculations/", { method: "POST", body: clean });
    if (quote.currency !== clean.currency) throw new PrintError("The quote currency changed. Request a new estimate.", 409);
    const amount = money(quote.total_cost_incl_tax);
    if (amount < 1) throw new PrintError("Lulu did not return a payable total.", 502);
    if (amount !== money(body.expected_total)) throw new PrintError("The print price changed. Request a new estimate before paying.", 409);
    const id = randomUUID(), title = String(body.line_item?.title || "My print book").trim().slice(0, 200);
    const row = { id, owner, title, quantity, currency: clean.currency, amount, createdAt: new Date(now()).toISOString(), status: "preparing_checkout", payload: { ...payload, contact_email: email, external_id: "LT-" + id }, environment: env.LULU_API_ENVIRONMENT };
    const fingerprint = digest(JSON.stringify({ owner, files: v.files.map((f) => f.id), format: v.format, pages: v.pages, address: clean.shipping_address, shipping: clean.shipping_option, quantity, email, amount }));
    const claim = await store.setJSON("checkout-claims/" + fingerprint, { id }, { onlyIfNew: true });
    if (!claim.modified) {
      const old = await read("checkout-claims/" + fingerprint);
      const prior = await read("orders/" + old.id);
      if (prior?.status === "awaiting_payment") return publicOrder(prior);
      throw new PrintError("This print request already exists. Check Your orders before creating another copy of the same order.", 409);
    }
    await store.setJSON("orders/" + id, row);
    await store.setJSON("owner-orders/" + owner + "/" + id, { id });
    try {
      const input = { email, presentmentCurrencyCode: row.currency, shippingAddress: shopifyAddress(clean.shipping_address), allowDiscountCodesInCheckout: false, acceptAutomaticDiscounts: false, tags: ["LifeTogether-Print"], customAttributes: [{ key: "lt_print_order", value: id }], note: "Print fulfillment: " + id + "; includes quoted printing, delivery and Lulu fulfillment costs.", lineItems: [{ title: title + " \u2014 " + quantity + " printed " + (quantity === 1 ? "copy" : "copies") + " with delivery", sku: "LT-PRINT-" + id, quantity: 1, originalUnitPriceWithCurrency: { amount: (amount / 100).toFixed(2), currencyCode: row.currency }, requiresShipping: true, taxable: true }], shippingLine: { title: "Lulu " + clean.shipping_option + " (included in print bundle)", priceWithCurrency: { amount: "0.00", currencyCode: row.currency } } };
      const data = await shopify("mutation PrintDraft($input:DraftOrderInput!){draftOrderCreate(input:$input){draftOrder{id invoiceUrl totalPriceSet{presentmentMoney{amount currencyCode}}}userErrors{message}}}", { input });
      const result = data.draftOrderCreate;
      if (result?.userErrors?.length || !result?.draftOrder?.invoiceUrl) throw new PrintError("Shopify could not prepare checkout. The team must check this request before retrying.", 502);
      const d = result.draftOrder, u = new URL(d.invoiceUrl);
      if (u.protocol !== "https:" || !(u.hostname.endsWith(".shopify.com") || u.hostname === env.SHOPIFY_STORE_DOMAIN || u.hostname === env.SHOPIFY_CHECKOUT_DOMAIN)) throw new PrintError("Shopify returned an unexpected checkout destination.", 502);
      const total = d.totalPriceSet?.presentmentMoney;
      if (total?.currencyCode !== row.currency || money(total.amount) < amount) throw new PrintError("Shopify returned an unexpected checkout total.", 502);
      Object.assign(row, { status: "awaiting_payment", draftId: d.id, checkoutUrl: u.href, checkoutAmount: money(total.amount) });
      await store.setJSON("orders/" + id, row);
      return publicOrder(row);
    } catch (e) {
      await store.setJSON("orders/" + id, { ...row, status: "checkout_needs_review", message: "No print job submitted. The team needs to review the Shopify checkout request." });
      throw e;
    }
  }
  async function paid(order) {
    const id = order.note_attributes?.find((x) => x.name === "lt_print_order")?.value;
    if (!/^[a-f0-9-]{36}$/.test(id || "")) return { ignored: true };
    const saved = await store.getWithMetadata("orders/" + id, { type: "json" });
    if (!saved) return { ignored: true };
    const row = saved.data;
    if (row.status !== "awaiting_payment") return { duplicate: true };
    if (order.financial_status !== "paid" || order.cancelled_at || order.test || (order.presentment_currency || order.currency) !== row.currency || money(order.total_price_set?.presentment_money?.amount ?? order.total_price) < row.checkoutAmount || !order.line_items?.some((x) => x.sku === "LT-PRINT-" + id && x.quantity === 1)) throw new PrintError("Payment does not match the saved print checkout.", 409);
    const data = await shopify("query VerifyPrintDraft($id:ID!){draftOrder(id:$id){order{id}}}", { id: row.draftId });
    if (data.draftOrder?.order?.id !== "gid://shopify/Order/" + order.id) throw new PrintError("Payment is not linked to this print draft.", 409);
    const updated = { ...row, shopifyOrder: String(order.id), shopifyNumber: String(order.name || order.id), status: "paid_needs_review", message: "Payment received. The print team is checking your order." };
    const claim = await store.setJSON("orders/" + id, updated, { onlyIfMatch: saved.etag });
    if (!claim.modified) return { duplicate: true };
    if (!checkoutReady(env) || row.environment !== "production" || !sameAddress(row.payload.shipping_address, order.shipping_address)) {
      await store.setJSON("orders/" + id, { ...updated, message: "Payment received. Delivery details or production settings need staff review before printing." });
      return { held: true };
    }
    try {
      await Promise.all(["interior", "cover"].map((kind) => validatedFile(row.payload[kind + "_id"], row.owner, kind)));
      const fresh = await lulu("/print-job-cost-calculations/", { method: "POST", body: import_lulu_core.default.quotePayload(row.payload) });
      if (fresh.currency !== row.currency || money(fresh.total_cost_incl_tax) > row.amount) {
        await store.setJSON("orders/" + id, { ...updated, message: "Payment received. The printing price changed; staff will review fulfillment or arrange a refund." });
        return { held: true };
      }
      await store.setJSON("orders/" + id, { ...updated, status: "submitting_to_printer", message: "Payment received. Sending the book to Lulu." });
      const job = await lulu("/print-jobs/", { method: "POST", body: import_lulu_core.default.orderPayload(row.payload, env.LULU_CONTACT_EMAIL) });
      if (!job.id) throw Error("Missing print job ID");
      await store.setJSON("orders/" + id, { ...updated, status: "submitted", luluId: String(job.id), message: "Lulu received your order. Printing begins after Lulu billing and file checks complete." });
      return { submitted: true };
    } catch {
      await store.setJSON("orders/" + id, { ...updated, status: "fulfillment_needs_review", message: "Payment received. The team must confirm the Lulu result before retrying to prevent duplicate printing." });
      return { held: true };
    }
  }
  async function orders(owner) {
    const result = [];
    for (const item of (await store.list({ prefix: "owner-orders/" + owner + "/" })).blobs) {
      const { id } = await read(item.key);
      const row = await owned(id, owner);
      result.push(publicOrder(row));
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async function status(id, owner) {
    const row = await owned(id, owner);
    if (row.luluId) {
      const job = await lulu("/print-jobs/" + import_lulu_core.default.safeJobId(row.luluId) + "/");
      row.status = String(job.status?.name || job.status || row.status);
      row.tracking = (job.line_items || []).flatMap((x) => x.tracking_urls || []).filter((x) => {
        try {
          return new URL(x).protocol === "https:";
        } catch {
          return false;
        }
      });
      await store.setJSON("orders/" + id, row);
    }
    return publicOrder(row);
  }
  return { validate, checkout, paid, orders, status };
}

// platform/functions/print-staff.mjs
var import_lulu_core2 = __toESM(require_lulu_core(), 1);
function staffAccess(env, owner, now = Date.now()) {
  const expires = Date.parse(env.LULU_STAFF_ACCESS_EXPIRES || "");
  return !!owner && /^[a-f0-9]{64}$/.test(env.LULU_STAFF_SESSION_HASH || "") && env.LULU_STAFF_SESSION_HASH === owner && expires > now && expires <= now + 864e5;
}
function staffReady(env, owner, now = Date.now()) {
  return staffAccess(env, owner, now) && env.LULU_STAFF_PROOFS_ENABLED === "true" && env.LULU_API_ENVIRONMENT === "production" && !!env.LULU_CLIENT_KEY && !!env.LULU_CLIENT_SECRET;
}
function createStaffProof({ env, store, lulu, service, now = () => Date.now() }) {
  const read = (k) => store.get(k, { type: "json" });
  function guard(owner) {
    if (!staffReady(env, owner, now())) throw new PrintError("An administrator must approve this browser for a production test copy first.", 403);
  }
  async function prepare(body, owner) {
    guard(owner);
    const v = await service.validate(body, owner);
    if (!v.valid) throw new PrintError("Both uploaded PDFs must pass Lulu checks before ordering.", 409);
    const payload = { ...body, line_item: { ...body.line_item, page_count: v.pages, pod_package_id: v.format, interior_url: v.files[0].url, cover_url: v.files[1].url } };
    const clean = import_lulu_core2.default.quotePayload(payload);
    if (clean.line_items[0].quantity !== 1 || clean.currency !== "USD") throw new PrintError("Staff test orders are limited to one copy in USD.");
    const quote = await lulu("/print-job-cost-calculations/", { method: "POST", body: clean }), amount = money(quote.total_cost_incl_tax);
    if (quote.currency !== "USD" || amount < 1 || amount > 1e4) throw new PrintError("Test orders must total $100 or less. Contact the team for other orders.");
    if (amount !== money(body.expected_total)) throw new PrintError("The price changed. Calculate a new estimate before reviewing your order.", 409);
    const id = randomUUID2(), row = { id, owner, title: String(body.line_item?.title || "Test book").slice(0, 200), quantity: 1, currency: "USD", amount, createdAt: new Date(now()).toISOString(), reviewExpiresAt: now() + 15 * 6e4, status: "awaiting_staff_confirmation", method: "staff_lulu", payload: { ...payload, external_id: "LT-" + id } };
    import_lulu_core2.default.orderPayload(row.payload, env.LULU_CONTACT_EMAIL);
    await store.setJSON("orders/" + id, row);
    await store.setJSON("owner-orders/" + owner + "/" + id, { id });
    return { ...publicOrder(row), delivery: clean.shipping_address, shipping: clean.shipping_option, reviewExpiresAt: row.reviewExpiresAt };
  }
  async function submit(body, owner) {
    guard(owner);
    if (body.confirm !== true) throw new PrintError("Review and explicitly confirm the Lulu charge.");
    const row = await read("orders/" + body.id);
    if (!row || row.owner !== owner || row.method !== "staff_lulu") throw new PrintError("Test order not found.", 404);
    if (row.status !== "awaiting_staff_confirmation") return publicOrder(row);
    if (row.reviewExpiresAt < now() || money(body.confirmed_total) !== row.amount) throw new PrintError("Review a fresh estimate before confirming.", 409);
    const v = await service.validate(row.payload, owner);
    if (!v.valid) throw new PrintError("The PDFs need attention. No order was submitted.", 409);
    const quote = await lulu("/print-job-cost-calculations/", { method: "POST", body: import_lulu_core2.default.quotePayload(row.payload) });
    if (quote.currency !== "USD" || money(quote.total_cost_incl_tax) > row.amount) throw new PrintError("The price increased. Review a fresh estimate before ordering.", 409);
    const grant = "staff-proof-grants/" + digest(owner + ":" + env.LULU_STAFF_ACCESS_EXPIRES);
    const claim = await store.setJSON(grant, { orderId: row.id, claimedAt: new Date(now()).toISOString() }, { onlyIfNew: true });
    if (!claim.modified) {
      const prior = await read(grant);
      if (prior?.orderId === row.id) return publicOrder(await read("orders/" + row.id));
      throw new PrintError("This staff approval has already been used. Check Your print orders before requesting another.", 409);
    }
    row.status = "submitting_to_printer";
    row.message = "Sending your test copy to Lulu. Your Lulu account handles printing and shipping charges.";
    await store.setJSON("orders/" + row.id, row);
    try {
      const job = await lulu("/print-jobs/", { method: "POST", body: import_lulu_core2.default.orderPayload(row.payload, env.LULU_CONTACT_EMAIL) });
      if (!job.id) throw Error("Missing job ID");
      row.luluId = String(job.id);
      row.status = "submitted";
      row.message = "Lulu received your test copy order. Printing starts after Lulu billing and file checks complete. No Shopify payment is involved.";
    } catch {
      row.status = "fulfillment_needs_review";
      row.message = "The Lulu response was uncertain. Staff must check the Lulu dashboard before retrying; this approval cannot submit a second order.";
    }
    await store.setJSON("orders/" + row.id, row);
    return publicOrder(row);
  }
  return { prepare, submit };
}

// platform/node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
var getEnvironment = () => {
  const { Deno, Netlify: Netlify2, process } = globalThis;
  return Netlify2?.env ?? Deno?.env ?? {
    delete: (key) => delete process?.env[key],
    get: (key) => process?.env[key],
    has: (key) => Boolean(process?.env[key]),
    set: (key, value) => {
      if (process?.env) {
        process.env[key] = value;
      }
    },
    toObject: () => process?.env ?? {}
  };
};

// platform/node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// platform/node_modules/@netlify/blobs/dist/chunk-FWVYH726.js
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header?.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response) => {
  if (!response.headers) {
    return {};
  }
  const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    return `Netlify Blobs could not write to store '${storeName}' (${details}). Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  return `Netlify Blobs has generated an internal error (${details})`;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}) {
    super(blobsErrorMessage(res, context));
    this.name = "BlobsInternalError";
  }
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch2, url, options, attemptsLeft = MAX_RETRY) => {
  try {
    const res = await fetch2(url, options);
    if (attemptsLeft > 0 && (res.status === 429 || res.status >= 500)) {
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      return fetchAndRetry(fetch2, url, options, attemptsLeft - 1);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    return fetchAndRetry(fetch2, url, options, attemptsLeft - 1);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  constructor({ apiURL, consistency, edgeURL, fetch: fetch2, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch2 ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw new BlobsInternalError(res, { method, storeName });
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    conditions = {},
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers["if-none-match"] = "*";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    return fetchAndRetry(this.fetch, url, options);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// platform/node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, { method: "delete", storeName: this.name });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        throw new BlobsInternalError(res, { method: "delete", storeName: this.name });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200) {
        throw new BlobsInternalError(res);
      }
      if (type === void 0 || type === "text") {
        return res.text();
      }
      if (type === "arrayBuffer") {
        return res.arrayBuffer();
      }
      if (type === "blob") {
        return res.blob();
      }
      if (type === "json") {
        return res.json();
      }
      if (type === "stream") {
        return res.body;
      }
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const etag = res?.headers.get("etag") ?? void 0;
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag,
        metadata
      };
      return result;
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag: responseETag,
        metadata
      };
      if (res.status === 304 && requestETag) {
        return { data: null, ...result };
      }
      if (type === void 0 || type === "text") {
        return { data: await res.text(), ...result };
      }
      if (type === "arrayBuffer") {
        return { data: await res.arrayBuffer(), ...result };
      }
      if (type === "blob") {
        return { data: await res.blob(), ...result };
      }
      if (type === "json") {
        return { data: await res.json(), ...result };
      }
      if (type === "stream") {
        return { data: res.body, ...result };
      }
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
      const iterator = this.getListIterator(options);
      if (options.paginate) {
        return iterator;
      }
      return collectIterator(iterator).then(
        (items) => items.reduce(
          (acc, item) => ({
            blobs: [...acc.blobs, ...item.blobs],
            directories: [...acc.directories, ...item.directories]
          }),
          { blobs: [], directories: [] }
        )
      );
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, { method: "put", storeName: this.name });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, { method: "put", storeName: this.name });
    });
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters,
                storeName
              });
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                done = true;
              } else {
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                directories = page.directories ?? [];
              }
              return {
                done: false,
                value: {
                  blobs,
                  directories
                }
              };
            });
          }
        };
      }
    };
  }
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const clientOptions = getClientOptions(input);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// platform/functions/print-runtime.mjs
var keys = ["LULU_STAFF_SESSION_HASH", "LULU_STAFF_ACCESS_EXPIRES", "LULU_STAFF_PROOFS_ENABLED", "URL", "DEPLOY_PRIME_URL", "LULU_CLIENT_KEY", "LULU_CLIENT_SECRET", "LULU_API_ENVIRONMENT", "LULU_CONTACT_EMAIL", "LT_PRINT_CHECKOUT_ENABLED", "SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN", "SHOPIFY_WEBHOOK_SECRET", "SHOPIFY_CHECKOUT_DOMAIN"];
function printRuntime() {
  const env = Object.fromEntries(keys.map((k) => [k, Netlify.env.get(k) || ""]));
  const store = getStore({ name: "lifetogether-print-checkout-v1", consistency: "strong" });
  async function lulu(path, options = {}) {
    const base = env.LULU_API_ENVIRONMENT === "production" ? "https://api.lulu.com" : "https://api.sandbox.lulu.com";
    const auth = await fetch(base + "/auth/realms/glasstree/protocol/openid-connect/token", { method: "POST", headers: { authorization: "Basic " + Buffer.from(env.LULU_CLIENT_KEY + ":" + env.LULU_CLIENT_SECRET).toString("base64"), "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(15e3) });
    const token = await auth.json();
    if (!auth.ok || !token.access_token) throw new PrintError("Lulu authentication needs attention.", 503);
    const response = await fetch(base + path, { method: options.method || "GET", headers: { authorization: "Bearer " + token.access_token, "content-type": "application/json" }, body: options.body ? JSON.stringify(options.body) : void 0, signal: AbortSignal.timeout(25e3) });
    const data = await response.json();
    if (!response.ok) throw new PrintError("Lulu could not complete this request. Review the files and delivery address.", 502);
    return data;
  }
  async function shopify(query, variables) {
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.SHOPIFY_STORE_DOMAIN)) throw new PrintError("Shopify setup is incomplete.", 503);
    const r = await fetch("https://" + env.SHOPIFY_STORE_DOMAIN + "/admin/api/2026-07/graphql.json", { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_ACCESS_TOKEN }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(2e4) });
    const data = await r.json();
    if (!r.ok || data.errors) throw new PrintError("Shopify could not complete this request. Check the store connection.", 502);
    return data.data;
  }
  const service = createPrintCheckout({ env, store, lulu, shopify });
  return { env, store, service, staff: createStaffProof({ env, store, lulu, service }) };
}

// platform/functions/print-paid-background.mjs
var createPaidWorker = (runtime) => async (request) => {
  const { env, store, service } = runtime();
  if (request.method !== "POST") return;
  const raw = await request.text();
  if (raw.length > 256 || !signedWebhook(raw, request.headers.get("x-print-signature"), env.SHOPIFY_WEBHOOK_SECRET)) return;
  const { eventId } = JSON.parse(raw);
  if (!/^[a-f0-9]{64}$/.test(eventId || "")) return;
  const key = "payment-events/" + eventId, event = await store.get(key, { type: "json" });
  if (!event || event.state === "processed") return;
  try {
    const result = await service.paid(event.order);
    await store.setJSON(key, { state: "processed", receivedAt: event.receivedAt, completedAt: (/* @__PURE__ */ new Date()).toISOString(), result });
  } catch (e) {
    await store.setJSON(key, { ...event, attempts: (event.attempts || 0) + 1, lastError: e.status < 500 ? e.message : "Provider connection failed; retry or staff reconciliation required." });
    throw Error("Print payment processing requires retry; event " + eventId);
  }
};
var print_paid_background_default = createPaidWorker(printRuntime);
var config = { background: true };
export {
  config,
  createPaidWorker,
  print_paid_background_default as default
};
