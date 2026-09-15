# Production configuration

Project: `lifetogether-doing-church-together`. Configure secrets in Netlify environment variables, never in browser code or this repository.

Netlify Identity was enabled in the project UI. Keep email confirmation enabled. The client handles confirmation, recovery and invite callbacks. Existing team membership in the master-library Netlify project does not automatically make someone an application workspace member.

## Shopify

- `SHOPIFY_STORE_DOMAIN`: canonical `your-store.myshopify.com` domain.
- `SHOPIFY_STOREFRONT_TOKEN`: Storefront access token with the necessary product/cart capabilities.
- `SHOPIFY_WEBHOOK_SECRET`: secret used to validate the configured order webhooks.
- `LT_APPROVED_PRODUCTS`: JSON array containing only explicitly approved products. Each entry needs `id`, `title`, `variantId` (Shopify ProductVariant GID), `amount` (two decimal places), `currency`, `license`, and `approved: true`. Optional display fields: `kind`, `attendanceBand`, `delivery`. Define single campaign, annual access, church attendance tiers and sponsorship/gift products in the Shopify store with accurate product and license terms. No example price is a recommendation or approved price.
- Configure `orders/paid` and `orders/cancelled` webhook delivery to `https://lifetogether-doing-church-together.netlify.app/.netlify/functions/commerce?webhook=shopify`.
- A real test checkout, discount/gift-card test, signed webhook delivery and receipt verification remain required after configuration. No payment is enabled merely by publishing this code.

## Lulu

The existing master-library print studio has its own secure Lulu function and guided setup. Its required variables remain `LULU_CLIENT_KEY`, `LULU_CLIENT_SECRET`, `LULU_API_ENVIRONMENT`, `LULU_CONTACT_EMAIL`, and explicit order enablement after sandbox review. They have not been supplied. A browser “save as PDF” document is a proof/export, not automatically a correctly sized Lulu interior and cover pair.

## Content and advisors

Import only content the owner is authorized to use. Keep adaptation, commercial and print rights separate. Public product release still requires actual manuscripts, appropriate editorial/theological review, complete files, correct attribution, and approved permissions.

Advisor intake records are workspace documents. They are not a vetted public directory, and filling a verification field is not independent verification. A public directory requires actual reviewed evidence and consent for the published profile.
