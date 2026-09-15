# Connected ministry studios — September 15, 2026

The master library and ten ministry sites link to a shared, authenticated production dashboard on Doing Church Together. Existing saved local drafts remain on their original device; cloud studio documents use the existing shared workspace and role checks.

## Implemented features

1. Print workflow with country dropdown, US/Canada/Australia region selectors, address autocomplete attributes, clear progress, and focused price results.
2. PDF upload with dimension, page-count and embedded-font checks; reviewed printer links expire after 90 days and can be revoked. Hosted PDFs currently have a 3 MB limit.
3. PDF.js page viewer with next/previous/page jump; full-spread cover review; named server-recorded upload review. Lulu validation and exact cover dimensions are available in the master print editor. Physical proof approval remains a separate step.
4. Actual Lulu quantity comparisons for 25, 50, 100 and 250 copies, including printing, shipping, fees, tax and per-copy total. Selecting a row requests a fresh estimate.
5. Recording upload/direct-media transcription integration, status/resume, transcript review, editorial metadata suggestions, and shared source saving. YouTube/Vimeo watch pages need the owned original media file. Uploaded recordings currently have a 3 MB limit; direct media URLs support longer recordings.
6. Shared dashboard with recent documents, assigned review requests, production tools and links to all eleven websites.
7. Passage comments, named assignments and version-specific review decisions. Private-document reviews are filtered by source visibility; server identity records the reviewer.
8. Saved brand kits with logo, colors, type and wording. ZIP export contains cover concept, participant guide, presentation slide and invitation PDFs. Cover concepts are not printer-ready full wraps.
9. Linked English/Spanish editions with preserved source version, side-by-side review, glossary, optional machine translation and review workflow. Source changes are flagged; private-source editions remain private.
10. Daily-reader-to-message schedules, previews, drafts, explicit activation/cancellation, own-account email consent, verified-phone SMS consent and unsubscribe links. Durable dispatch claims prevent automatic duplicate retries. Sender acceptance is labeled separately from confirmed delivery.

## External connections required

On the **lifetogether-doing-church-together** Netlify project, Functions scope / Production context:

- `ASSEMBLYAI_API_KEY` for transcription.
- `OPENAI_API_KEY` and `STUDIO_TEXT_MODEL` for translation and sermon suggestions. Choose a model available to your account that supports Chat Completions.
- `RESEND_API_KEY` and `CAMPAIGN_FROM_EMAIL` from a verified sender domain for email.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, and `TWILIO_VERIFY_SERVICE_SID` for verified-phone SMS.
- `CAMPAIGN_DELIVERY_ENABLED=true` only after sender configuration and review. Without it the scheduled function exits without sending. The UI supports drafts while delivery is off.

No real campaign messages, paid AI requests, or print orders were sent in implementation testing. Live provider end-to-end tests still require these accounts. Existing Lulu sandbox credentials remain in the master-library project. Production Lulu ordering remains disabled.

## Verification

Automated tests cover PDF font/page validation, schedule bounds, consent/current membership, send deadlines, repeat dispatch prevention, ambiguous failures, review identity, version conflicts, and private review visibility. Existing workspace, commerce, proof generation and Lulu payload/OAuth regressions also run.

Local seeded browser checks exercise brand save/export, bilingual save, review assignment and dashboard notification, daily schedule preview, real PDF page rendering/navigation, and quantity comparison/select/requote. Local provider fixtures do not represent live provider verification.

## Provider references

- [Lulu API schema](https://api.lulu.com/api-docs/openapi-specs/openapi_public.yml)
- [AssemblyAI transcript API](https://www.assemblyai.com/docs/pre-recorded-audio/api-reference/transcripts/submit)
- [OpenAI Chat API](https://developers.openai.com/api/reference/resources/chat)
- [PDF.js examples](https://mozilla.github.io/pdf.js/examples/)
- [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Twilio messages API](https://www.twilio.com/docs/messaging/api/message-resource)
