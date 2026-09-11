# Whole-site pastor workflow review

The review found that the first campaign builder worked as an individual tool, while reusable church information, source organization, planning, and recovery remained disconnected across the website. This release connects those workflows through a shared, device-local workspace used by all ten website doors.

## Ten implemented improvements

| # | Gap found | Addition and intended behavior |
|---|---|---|
| 1 | Opening the catalog did not explain where to begin or what to resume. | **Home dashboard:** four-step onboarding, recent source records, campaigns to resume, dated preparation tasks, and backup reminders. The root URL opens Home; existing catalog links remain valid. |
| 2 | Searches were confined to individual catalog or archive pages. | **Search everything:** query catalog records, artifacts, initiatives, personal sermons, campaigns, and private notes from one page. Filter by content type; exact title matches rank first. |
| 3 | Useful combinations of filters had to be rebuilt each session. | **Saved searches:** name and reopen a full catalog query or universal search, retaining its URL filters. |
| 4 | Church context had to be typed into every campaign. | **Shared church profile:** reuse mission, context, pastoral voice, theology, translation, and planning assumptions. New campaigns inherit it; applying it to an existing campaign requires an explicit confirmation. Journey Finder can import the matching fields. |
| 5 | A pastor's sermon sources were stored only inside individual campaigns. | **Personal sermon library:** add, edit, search, archive, restore, and import sermons outside a campaign. Exact duplicates are skipped; titles and subtitles remain intact. Copy sources into campaigns, or save campaign sources into the shared personal library. Copies preserve restrictions and can be edited independently. |
| 6 | The website offered only one flat collection. | **Named collections:** organize sources by series, season, or ministry; assign a record to several collections; rename, archive, and restore collections. Start a campaign from eligible LifeTogether sources. The original collection file workflow remains available. |
| 7 | Research decisions and private annotations had no home beside a record. | **Notebook:** record private notes, tags, and personal review status on catalog detail pages. Find them in a site-wide notebook or universal search; export a CSV. Personal review does not alter source holds or imply publication approval. |
| 8 | Campaigns could be planned without seeing other church commitments. | **Church calendar:** view campaign ranges and custom church dates across a year, identify overlapping campaigns and protected dates, edit/archive/restore events, and export an all-day calendar. Campaigns awaiting launch dates are listed separately. |
| 9 | Individual campaign and collection backups did not capture the whole workspace. | **Full workspace backup:** export campaigns, personal sermons, church profile, notes, collections, saved searches, events, preferences, and saved IDs together. Restore validates the file, previews counts, downloads the prior workspace, and rolls back storage writes on failure. Raw stored recovery files are available separately for troubleshooting. |
| 10 | Reading comfort and navigation relied on a single desktop presentation. | **Accessible reading and navigation:** large text, stronger contrast, reduced motion, focus mode, mobile menu, larger action targets, keyboard search shortcuts, route focus management, and a practical help guide. Unsaved form edits receive a leave-page warning. |

## Navigation and data boundaries

- All existing catalog, source, artifact, website, and campaign links remain available. Sidebar sections group the expanded navigation.
- Personal information stays in local browser storage. No hosted model service, cloud synchronization, transcription, live global search, or new external connector has been added.
- The immutable catalog and source restrictions remain unchanged. Catalog notes, personal review decisions, and collection membership are stored separately.
- Reusable sermon copies do not overwrite an existing campaign when the personal library is edited.
- The calendar shows entered dates and campaign dates. It does not claim to know local holidays or church commitments that have not been entered.
- Netlify's private access and deployment settings remain unchanged.

## Limits and recovery

The site workspace supports up to 200 personal sermons, 50 named collections, 40 saved searches, 300 church dates, 2,000 catalog notes, and 12 recent entries. A named collection can hold 5,000 records; a campaign can use at most 200 sources. The existing limit of 25 campaigns remains. Archive actions retain recoverable entries.

The personal workspace checks a 2.2 MB JSON limit, and campaign storage retains its 3.5 MB limit. Browser quotas may be lower in practice; storage errors are shown with backup guidance. Full backup imports are limited to 6.5 MB. Sermon import accepts Word, text, Markdown, CSV, and JSON with a 2 MB per-file limit and 8 MB per batch. The Word parser remains bounded.

Another tab changing the workspace raises a conflict warning. Download current work and reload rather than silently overwriting the newer copy. Full backup restoration deliberately replaces the local workspace only after the user reviews its contents and presses the restore button.

## Validation

Run:

    python3 scripts/build.py
    node scripts/test-workspace.cjs
    node scripts/test-campaign.cjs
    node scripts/verify.cjs
    node scripts/verify-memory.cjs

The workspace tests cover schema limits, duplicate identity, unsafe keys, source-copy independence, restrictions, church profile normalization, search behavior, year boundaries, calendar conflicts and escaping, complete backup identity, rollback on quota failure, internal saved destinations, and end-to-end application event flows.

Browser checks cover the new dashboard, church profile, personal sermon creation, campaign creation with reused context, universal sermon search, saved searches, named collection creation, catalog notes and membership, calendar conflicts, reading preferences, keyboard behavior, and responsive navigation.
