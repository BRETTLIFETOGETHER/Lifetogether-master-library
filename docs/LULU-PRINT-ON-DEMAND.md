# Lulu print-on-demand integration

The master library now includes a server-backed print studio at `#/print-studio`. It prepares source-linked print editions, requests shipping methods and delivered-cost estimates from Lulu, submits enabled print jobs, and tracks their status. Credentials remain in the Netlify function environment and are never placed in browser JavaScript or downloaded briefs.

## Sandbox setup

Create a separate Lulu sandbox account and add these Netlify environment variables:

- `LULU_CLIENT_KEY` — sandbox API client key
- `LULU_CLIENT_SECRET` — sandbox API client secret
- `LULU_API_ENVIRONMENT=sandbox`
- `LULU_CONTACT_EMAIL` — operational contact used for print jobs
- `LULU_ENABLE_ORDERS=false`

Optional controls:

- `LULU_REQUIRE_IDENTITY=true` requires a Netlify Identity user with the `print-admin` role before a print job can be submitted.
- `LULU_ALLOWED_ORIGIN` adds one explicit same-origin deployment URL when Netlify's standard URL variables are insufficient.

Cost estimates and shipping options work after credentials are configured. Order submission stays disabled until `LULU_ENABLE_ORDERS=true`.

## Production readiness

Each print edition needs a durable public HTTPS URL for a multipage interior PDF and a single-page cover spread PDF, plus the Lulu POD package ID and page count. Before switching `LULU_API_ENVIRONMENT` to `production`, approve a physical proof, configure Lulu account billing, complete checkout and tax decisions, restrict order creation to authorized staff, and verify order status and tracking behavior end to end.

The production switch can cause real charges. Keep `LULU_ENABLE_ORDERS=false` until those checks are complete.


## Guided print studio (September 2026)

The studio separates book preparation, delivery estimates, and order tracking. A 6 × 9 paperback preset avoids requiring a format code; custom Lulu codes remain available. Draft books can be saved before PDFs are ready. File-link checks validate HTTPS syntax and offer preview links; they do not claim to inspect or approve PDF contents.

Shipping and quote requests preserve form inputs. Delivery details live only in page memory and never enter localStorage or downloaded estimates. Changing address, quantity, or shipping invalidates the previous quote. Order submission uses the exact quoted payload, requires a final review confirmation, locks duplicate clicks, and consumes the quote before submission. On an ambiguous failure, check the Lulu dashboard before requesting another order.

Without configured Lulu credentials, the interface provides an administrator setup panel, a connection recheck, and a downloadable checklist. It does not fabricate prices or orders. A configured health response confirms environment settings. The Check connection button now also verifies OAuth with Lulu without creating an order. An estimate tests the pricing service. Sandbox jobs do not create physical proofs.

### Verification

`node scripts/test-lulu.cjs` validates server payloads. `node scripts/test-lulu-ui.cjs` uses Playwright and a local server on port 8765. The browser test mocks Lulu responses and verifies saving, editing, exports, file links, shipping, errors, quote invalidation, duplicate submission prevention, tracking, missing credentials, and mobile layout. No real Lulu orders are placed by the test. Set `CHROME_PATH` if Chrome is installed elsewhere.
