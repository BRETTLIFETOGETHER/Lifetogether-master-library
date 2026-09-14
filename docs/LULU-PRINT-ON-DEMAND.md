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
