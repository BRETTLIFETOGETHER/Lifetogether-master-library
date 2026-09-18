# Churchwide formation — content and launch handoff

This collection was added September 17, 2026 from Brett Eastman's Churchwide Formation conversation. All strategy, chapter outlines, and commercial illustrations remain proposed unless the source states otherwise. Recovered third-party original archives are not copied into this public repository.

## Open the experience

- Formation guide: https://lifetogether-doing-church-together.netlify.app/formation/
- Existing ministry catalog: https://lifetogether-doing-church-together.netlify.app/
- Existing church studio: https://lifetogether-doing-church-together.netlify.app/workspace/

## What was added

`src/formation/` contains an accessible responsive guide, seven-day interaction, both 21-chapter outlines, downloadable Markdown planning resources, a Netlify Forms inquiry, and a confirmation page. `sites/doingchurch/formation/` is the deployable copy. `scripts/build-formation.cjs` copies source assets into the existing site. The network build invokes this step so regeneration preserves the new experience. Existing studio/catalog capabilities remain in place.

The site uses the LifeTogether navy/gold palette and the repository's licensed DM Serif and Manrope fonts. Those fonts substitute for the canonical Playfair/Spectral/Archivo brand set, avoiding new external font dependencies.

## What to put in a repository

| Component | What belongs here | What is still needed |
|---|---|---|
| Product definition | Audience, problem, deliverable, scope, owner, acceptance criteria | Choose the first paid offering and delivery commitment |
| Website source | Pages, styles, accessible interactions, assets, build script | Ongoing updates as the offer is tested |
| Content data | Stable IDs, titles, audience, duration, source, approval status | Approved full manuscripts and final editions |
| Source provenance | Original source references and permitted uses | Record rights before reproducing other people's full materials |
| Real product samples | Actual pages, screenshots, video, group experience | One complete approved sermon-to-week sample with age adaptations |
| Commerce configuration | Product/SKU mapping and checkout integration code | Verify configured payment provider, live products, final prices, refund terms, and successful fulfillment |
| Delivery operations | Fulfillment process, review owners, response expectations | Named inquiry owner, response schedule, booking link, CRM/email routing |
| Deployment and maintenance | Netlify config, tests, release notes, rollback instructions | Custom domain choice/DNS and an ongoing technical owner |

Never store passwords, API credentials, private pastoral responses, customer lists, or payment details in the repository. Put credentials in the host's environment settings and customer data in the appropriate access-controlled service.

## Lead inquiry operations

The form is named `churchwide-pilot`. Fields: name, email, church, role, interest, goal, contact-consent, and the spam honeypot. It asks permission for contact about this inquiry; it does not subscribe someone to general marketing. No file upload or sensitive pastoral details are requested.

Netlify Forms detection must be enabled for the Doing Church Together project. View inquiries in the Netlify project's Forms section. Configure notifications only to a verified recipient and configure any CRM integration deliberately. A captured submission is not a booked call, payment, or automatic custom curriculum delivery. The website makes no promise of an unconfigured response time.

Free planning downloads are accessible without submitting a form. They are templates and proposed outlines, not full completed curricula.

## The three commercial improvements to prioritize

1. **An offer buyers understand:** one buyer, one problem, a specific deliverable, and an actual example. Start with a pastor's sermon series becoming a coordinated week or campaign.
2. **A complete inquiry-to-delivery path:** reliable inquiry capture, a responsible follow-up owner, booking/proposal/payment as appropriate, and a clear delivery process.
3. **Trust through product experience:** readable sample pages, useful free resources, transparent scope, and permissioned outcomes when available. Do not imply endorsements or finished inventory from draft records.

Qualified traffic and reliable follow-up are necessary. Deploying a website or adding a button does not guarantee clients.

## Rebuild and deploy

From repository root: `node scripts/build-formation.cjs` rebuilds only this addition. The existing `node scripts/build-network-sites.cjs` rebuilds the full network and its platform, then copies the formation guide. Respect existing platform dependency requirements for the full build.

The current Doing Church Together Netlify project is `8e83e99a-eebe-408d-afc5-ae44fa6fef8e`, connected to this repository's `main` branch. Preserve its existing publish and function settings. This change does not introduce credentials or alter payment/identity services.

## Content boundaries

The complete master is a planning collection; it is not a finished 21-chapter manuscript. Large historical catalog counts refer to records, not finished products. The full recovered archive remains available in Brett's source collection and includes retrieval gaps. Brand/domain availability and rights for future commercial editions still need to be established where applicable.
