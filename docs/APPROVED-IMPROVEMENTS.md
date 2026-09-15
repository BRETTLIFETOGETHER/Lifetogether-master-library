# Approved implementation register

User approval: September 14, 2026, “implement all 28 improvements and anything else you found.”

Status is evidence-based. Implemented code, tested local behavior, live deployment, and external dependencies are recorded separately. A prepared integration is not a connected production service.

| # | Improvement | Status | Evidence / remaining work |
|---|---|---|---|
| 1 | Browse and guided choice | Implemented | Browse / Help me choose entry points in the master and network. |
| 2 | Quick and deeper matching questionnaire | Implemented | Six-question and fourteen-question paths; browser save/resume and profile export. |
| 3 | Evidence-based contextual filters | Implemented with data gaps | Strict verified-metadata filters; missing video, difficulty and size metadata remains unknown. |
| 4 | Explained recommendations and shortlist | Implemented | Source-based reasons, missing-detail explanations and shortlist of three. |
| 5 | Complete, honest package preview | Partly implemented | Source outlines and reader previews are real; complete approved commercial bundles need source files and review. |
| 6 | Ready-made, personalize and sermon branching | Partly implemented | Personalize / sermon starting modes; use-as-written cannot be enabled without a complete approved edition. |
| 7 | Audience-specific finder modes | Implemented | Church, group, class/ABF, family and workplace matching contexts. |
| 8 | Reusable ministry and pastor profiles | Implemented | Cloud profile documents and profile-to-campaign reuse. |
| 9 | Three-source intake and provenance | Partly implemented | Separate source layers, transcript/media intake, citations and distinct rights; automated media recovery remains unconnected. |
| 10 | One complete flagship campaign package | Complete pilot draft prepared; review pending | A new original 21-day Doing LifeTogether manuscript, three teaching manuscripts, group/leader guide, age companions and launch kit are prepared for review outside the public catalog. Reader JSON import validated. Editorial, theological and safeguarding review remains required. |
| 11 | Consistent durations and teaching schedules | Implemented | Seven lengths, coherent default gathering counts, explicit override validation and dated schedules. |
| 12 | Catalytic Sunday pack | Implemented editor | Dedicated Catalytic Sunday pack with Scripture, gospel, response, invitation and follow-up fields; save/export. |
| 13 | Weekend service run sheet | Implemented editor | Service run sheet calculates times and includes worship, scripts, bulletin and social fields. Planning Center integration not claimed. |
| 14 | Controlled editions and review trail | Implemented core flow | Protected-core edition modes, personalization, named review fields and version history. |
| 15 | Annual formation and continuation plan | Implemented planner | Seasonal/yearly pathway, leader rhythm, owners/milestones and Day 41 continuation planning. |
| 16 | Shared accounts, workspaces and roles | Deployed; real-account walkthrough pending | Netlify Identity enabled; server storage, role checks, private docs, email-bound invites and expiring/revocable snapshots. Local ACL/browser tests passed. Public workspace loads and anonymous protected API requests correctly return 401. |
| 17 | Transparent needs questionnaires | Implemented planning questionnaires | Transparent preferences, no invented spiritual score; connected recommendations. |
| 18 | Daily participant reader | Implemented | Daily edition editor/reader, private reflections, completion, media URLs, exports and opt-in calendar reminders. |
| 19 | Private circles and invitation links | Implemented core flow | Private circle workspaces, email-bound invitations, shared plans and participant progress. No automatic messages sent. |
| 20 | Approved commerce, licenses and gifts | Prepared; external configuration required | Price-verified Shopify carts and HMAC-verified account receipts; store, token and approved products/prices absent. |
| 21 | Proof-to-print production pipeline | Partly implemented; external configuration required | Real 6×9 interior proof PDFs, manifests, PDF validation and expiring/revocable file hosting. Exact approved cover templates and live Lulu credentials remain required. |
| 22 | Contributor rights and editorial workflow | Implemented intake/review; public release pending | Source/media inventory, distinct rights, production states, editorial/theological notes and version history; no unreviewed author content published. |
| 23 | Verified advisor and referral workflow | Implemented interface; verified data required | Separate practice/family intake, referral stages, consent, gifting plans and directory filtering. No actual verified profiles supplied. |
| 24 | Ministry operations modules | Implemented planners | Host/coaching, volunteer/staff and ministry launch modules with action/owner/due/status register. |
| 25 | Family practical tools | Implemented | Seven practical family tools with save/export; no invented finished-tool count. |
| 26 | Doing LifeTogether and Doing WorkTogether | Implemented | Doing LifeTogether / Doing WorkTogether with six formation areas, preserving the original ten brands. |
| 27 | Real usage and outcome measures | Implemented initial measures | Real workspace actions, reader completion and contextual outcome observations; no fabricated success metrics. |
| 28 | Functional release integrity | Deployed and checked | All ten public app.js hashes match f7e675d. Public workspace, Identity, protected endpoints and unconfigured commerce/advisor states verified. Real-account, purchase and fulfillment walkthroughs still require configuration. |

## External inputs

- Shopify store, approved product prices and license terms have been requested; no charges will be enabled using invented prices.
- Lulu sandbox and production credentials must be configured securely in Netlify; none are present as of the print release.
- Existing author content must have permission for adaptation/commercial/print use. A new draft does not constitute editorial or theological approval.
- Verified advisor profiles require actual verification evidence before inclusion in public matching.

## Design release

Ten distinct ministry identities published in GitHub commit 30eb84df9a28dbbb141c433b801079bc52dca41d; all ten live app.js hashes matched the release. See NETWORK-DESIGN-SYSTEMS.md.
