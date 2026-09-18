# LifeTogether Journey Studio

Open `index.html` through an HTTP server or at `/journey-studio/` on Netlify.

- Pastor and Advisor starting points; exact source titles and subtitles.
- 21-, 30-, and 40-day guided devotional drafts, editable one day at a time.
- Biblical scene, teaching, point to ponder, practice, three questions, prayer and next step.
- Printable standalone HTML, browser Save as PDF, Markdown, JSON backup and restore.
- Weekly group/family conversations and a source appendix.
- Searchable recovery index linking every original file at its audited Git revision.

## Source integrity

The recovery report reconciles all 1,088 original Git blob hashes in 130 collections. The master payload provides 18,569 main title placements, 48,626 supplementary/source-history placements and 3,000 additional journey concepts. These are placements, not a deduplicated count of unique campaigns. 12,787 main records have a source subtitle; 5,782 do not. Missing subtitles are not invented. Historical placements, holds, benchmarks, removed and deferred records are visible but unavailable for drafting. Exact held titles are also checked before build/export.

Generated devotional text is an original, deterministic, guided editorial framework. It is not an AI adaptation of every source manuscript, a verbatim Purpose Driven Life edition, or evidence that source manuscripts are complete. Each title can receive a working edition, with an explicitly selected formation focus. Editors must develop specialized teaching and review it against their authorized source. Pasted source notes are preserved in the appendix; they are not silently reworded or represented as incorporated teaching. No AI service, payment processing or account system is claimed.

The pinned master payload is verified with SHA-256 in the browser. Recovery verifies files, not source rights or content quality. The download contains drafts and requires review before distribution. User edits and source notes stay in the browser tab until explicitly exported. Do not close the tab without saving a journey backup.

## Maintenance

From the repository root run `python3 scripts/audit_journey_recovery.py /path/to/claude-artifacts`. This pins the current input payload and archive commit. Then run `node scripts/test_journey_studio.cjs`. The deployment is static and requires no keys or build service. When mirroring to the archive website, copy only the `journey-studio` directory; the original artifacts remain untouched. The archive mirror loads the public master data at the audited revision.
