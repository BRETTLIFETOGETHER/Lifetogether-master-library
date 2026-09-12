# Campaign finder

Open `#/campaign-finder` from Home, the sidebar, or the campaign builder. Search original titles, subtitles, themes, and sermon Scripture or notes; combine ministry goal, source duration, audience, starting-point type, and intelligence-library filters. Filter URLs can be bookmarked or saved through the existing saved-search feature. Pagination and filters survive a trip into a preview and back.

The finder uses source metadata to identify campaigns, journeys, series, and Catalytic Sunday concepts. Structural tools, modules, removed/deferred records, and held LifeTogether records are excluded. Distinct source IDs stay distinct, even when titles repeat. It searches the catalog already loaded in the browser, not a live global church search or a hosted AI service.

Source day counts are shown only when stated in a title, subtitle, or format. Multiple lengths remain alternatives; session counts are not converted to days. A personal sermon is a starting point with an unconfirmed campaign length. Its title mentioning forty days does not establish a campaign schedule.

Church benchmark references remain browsable with their restrictions visible. Held references have no campaign-start form, and the submit handler independently rejects them. Archived or restricted personal sermons are unavailable in the finder.

Preview an idea to inspect the exact title, subtitle, source ID, audience, format, match evidence, and original record. Select the intended goal, planned length, and audience before creating a campaign. These are development choices, not claims of existing finished editions. The new campaign retains the church profile and a source-preserving copy of the record or personal sermon; existing campaigns and source records are unchanged. Personal sermon text stays in the current browser.

## Implementation and verification

- `src/campaign-core.js`: deterministic `LTCampaignFinder` index, eligibility, duration extraction, evidence, and ranking; exported as `LTCampaign.Finder` and `.finder` for Node checks.
- `src/campaign-builder.js`: finder routes, preview, and validated handoff into the existing builder.
- `src/campaign-builder.css`: responsive editorial presentation and accessibility preferences.
- `src/workspace-core.js`: finder destinations retained in saved searches and workspace backups.
- `scripts/test-campaign-finder.cjs`: 13 source classification, filter, restriction, duration, and real-catalog checks.
- `scripts/test-finder-ui.cjs`: 9 built-app checks, including the browser-discovered regression where a named `id` form input shadows `HTMLFormElement.id`. The handoff uses `candidateId`.

Browser verification covers desktop and phone layouts, original-source previews, filter selection, and the actual creation of a 21-day outreach campaign with the source title and subtitle retained. Existing workspace/campaign checks and catalog route regressions also pass. No catalog payload, source-import script, or Netlify access settings are changed by this feature.
