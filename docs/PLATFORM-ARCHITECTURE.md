# Shared platform decision

September 14, 2026. Scope: approved improvements across the master library and ten independently designed ministry websites.

The ten sites remain independently branded public catalogs. A shared account and authenticated application live at the existing Doing Church Together site under `/workspace/`. Every ministry links to this same account origin. This avoids putting credentials in cross-domain links or depending on third-party cookies. The master library remains protected by its existing team access control.

Netlify Identity manages signup, confirmation, sign-in, recovery and session refresh. Netlify Blobs holds workspace snapshots with strong reads and conditional ETag writes. Each mutation checks current membership on the server. An outdated form receives a conflict rather than overwriting another person's work. Membership is authoritative on the workspace, not in an unverified browser role or self-editable account metadata.

Workspace document privacy is independent of membership: private documents and reflections are readable only by their author, including when the workspace owner views the workspace. Owners manage access; editors edit shared documents; members keep private work and shared progress; viewers have read access. Email-bound invitation links expire in seven days. Shared links expose only a deliberately reviewed document snapshot, expire in seven days and can be revoked. Token hashes are stored; raw invitation/share tokens are returned only at creation. No invitations are sent by this application automatically.

The browser never receives storage credentials, Shopify tokens or Lulu credentials. API responses are private/no-store. A supported Identity session and same-origin checks protect mutations. Source review declarations are not represented as independently verified rights or public publishing approval.

The daily reader stores completion separately from private reflections. Draft editions show their actual editorial status; missing readings do not acquire fabricated content. Media links are optional and restricted to HTTPS. Reader exports and calendar reminders are initiated by the participant.

Shopify products are supplied by the operator through approved configuration. The service verifies the current variant price before creating a cart. Shopify performs payment and gift/discount handling. Signed paid-order webhooks are bound to an issued checkout and matching variant before producing an account-scoped order record. The integration remains unavailable until credentials and approved products are configured. It does not fabricate prices, gifts, payments, entitlements or receipts.

## Build

- Install pinned dependencies: `npm ci --prefix platform --ignore-scripts`.
- Run `node scripts/build-network-sites.cjs`; it also builds the shared workspace browser bundle and self-contained Netlify functions.
- Run `python3 scripts/build.py` for the master library.
- Generated sites and bundles are committed. Netlify publishes the configured `sites/<id>` folder; Doing Church Together includes its own functions directory.

## Validation

Core tests exercise access control, private documents, email-bound invites, revocation, expired snapshots, optimistic conflicts, protected editions, Shopify price changes, HMAC validation and receipt ownership. Browser tests use an explicitly isolated Identity stub and the real workspace service against an in-memory test store. No test accounts, emails, paid orders or live print jobs are created by those tests. A production login and purchase require configured accounts and credentials and must be reported separately from these tests.

## References

- [Netlify Identity setup](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/)
- [Identity in functions](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/)
- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- [Shopify Storefront cart flow](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
- [Verify Shopify webhook deliveries](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
