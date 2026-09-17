# Print Studio: Shopify payments and Lulu production

Customers prepare a book in `/#/print-studio`, upload the interior and full-wrap cover PDFs, request a shipping estimate, and continue to the existing Shopify store's hosted payment page. The Master Library stores the print request; verified Shopify payment starts Lulu fulfillment in a background function. Customers return to Print Studio for order status and tracking.

## Current release status

Implemented and locally verified with provider fixtures. Live checkout remains disabled until the real store and production Lulu account are connected. No real Shopify payment or Lulu API production order has been placed as part of the implementation tests. The previously prepared direct Lulu project is separate from this integration.

## Production configuration

Use Functions scope, Production deploy context in Netlify; mark all credentials as secret. Redeploy after changing settings.

| Variable | Value / purpose |
| --- | --- |
| `LULU_API_ENVIRONMENT` | `production` |
| `LULU_CLIENT_KEY`, `LULU_CLIENT_SECRET` | Credentials from the verified production Lulu account, not sandbox credentials |
| `LULU_CONTACT_EMAIL` | Team order/billing contact |
| `SHOPIFY_STORE_DOMAIN` | Exact existing store address, such as `your-store.myshopify.com`; no scheme/path |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Installed app's Admin API access token; must support draft orders and reading orders. Use `write_draft_orders`, `read_draft_orders`, `read_orders` scopes and any required customer-data access. If using an expiring token, renewal must be configured before enabling customer checkout. |
| `SHOPIFY_WEBHOOK_SECRET` | Signing secret for the configured webhook/app, not the Admin access token |
| `SHOPIFY_CHECKOUT_DOMAIN` | Optional exact custom checkout hostname if Shopify returns one |
| `LT_PRINT_CHECKOUT_ENABLED` | Keep `false` until all release checks below pass; then `true` |
| `LULU_ENABLE_ORDERS` | Keep `false` in production. This old flag only controls the separate sandbox testing path; the old endpoint rejects all production submissions. |

Configure Shopify's `orders/paid` webhook for:

`https://lifetogethermasterlibary.netlify.app/.netlify/functions/print-checkout?webhook=shopify`

The callback verifies raw-body HMAC, store and topic, saves the event in a private blob store, and invokes `print-paid-background`. Netlify immediately acknowledges background dispatch, avoiding long Lulu calls in Shopify's delivery window. Payment work verifies the saved Shopify draft's actual order ID, payment amount and customer currency before acquiring an atomic order claim. Uncertain printer responses are held rather than retried. Worker failures before the order claim receive Netlify's background retries; inspect failed worker logs and `payment-events/` for unresolved events.

Lulu billing is separate from Shopify customer payment. Configure and verify Lulu production billing/automatic payment before enabling checkout. A received print job is not a guarantee that Lulu has begun printing.

## Release checks requiring real accounts

1. Confirm the existing Shopify store and install/configure its integration credentials. Verify that its payment gateway is ready for real payments.
2. Connect the verified Lulu production account and production billing. Confirm OAuth and a real cost estimate.
3. Resolve Netlify team-only SSO with the owner. Customers, Shopify webhooks, the internal background dispatch, and Lulu PDF downloads need reachable production endpoints. Do not remove site access protection silently. Anonymous PDFs require the unguessable file token; order and upload APIs require their own session cookie even after site-level access changes.
4. Verify the deployed PDF link from outside the signed-in Netlify browser, run Lulu's real PDF checks, and ensure the selected print format and cover dimensions are acceptable.
5. Verify Shopify can prepare a draft invoice and that the webhook reaches the deployed worker. Real test payments are deliberately rejected by the fulfillment service (`order.test`); use fixtures for simulated fulfillment, then a separately authorized low-cost real proof order for the final integration check.
6. Review Shopify's customer taxes, Lulu supplier tax and payment fees. Initial proof checkout charges the quoted Lulu total, with Shopify customer tax added according to store settings. The saved book's selling price is only a margin estimate, not the checkout price. This release does not add a profit markup or payment fee allowance.
7. Enable `LT_PRINT_CHECKOUT_ENABLED`, redeploy, and obtain approval for the exact proof order and total before paying. Verify the Shopify paid order, Lulu job and billing status, and return to Print Studio to refresh tracking.

## Operations and limits

- PDFs: up to 3 MB each, 1–800 interior pages, one full-wrap cover page, 20 uploads per guest session. Larger book workflows need a direct storage upload extension before acceptance.
- Files are held in Netlify Blobs, never Git or public static assets. Unguessable printer links expire after 90 days; checkout and payment submission reject files with less than two days remaining. Expiration disables retrieval, but automatic deletion of stored bytes is not implemented yet; staff must manage retention in the private store.
- Uploads and order access belong to a secure, HttpOnly 30-day browser session. They are not yet synchronized across accounts/devices. Save the Shopify order receipt for support. Book metadata remains in the existing device-local shelf.
- Changing the shipping address in Shopify holds fulfillment for staff review. Increased print cost, disabled production settings or an ambiguous Lulu submission also hold the order. Staff should inspect the Shopify order and Lulu dashboard by the `LT-<order UUID>` external reference, then fulfill or refund manually. Never blindly resubmit an ambiguous job.
- Exact duplicate unpaid requests reuse their draft checkout. Completed requests with the same inputs are blocked from accidental repetition; intentional reorder requires a future explicit reorder flow or team handling.
- Status and tracking are refreshed on demand in Print Studio. This release does not mark Shopify fulfillment complete or send custom tracking emails. Shopify's existing payment receipts still apply.
- Provider credentials are server-only. Do not put any secrets in frontend code, book notes, screenshots, or Git.

## Build and verification

From the repository root, using the available Node executable:

```sh
node --test platform/tests/print-checkout.test.mjs platform/tests/print-handler.test.mjs
node platform/build-print.mjs
python3 scripts/build.py
node --check dist/app.js
node scripts/test-lulu.cjs
node scripts/test-lulu-connection.cjs
node scripts/test-lulu-shipping.cjs
```

The bundled functions are committed because the existing Netlify project deploys prebuilt `dist` and `netlify/functions` without a build command. Source lives in `platform/functions`; rebuild both functions after edits. Frontend source is `src/lulu-studio.js`, `src/lulu-checkout.js`, and the existing stylesheet.
