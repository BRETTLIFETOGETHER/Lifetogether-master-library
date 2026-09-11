# Campaign builder

The campaign builder turns a pastor's selected teaching and church context into a complete, editable campaign planning workspace. It is available at `#/campaigns`, in the main navigation, from the journey finder, and from eligible catalog records. All ten website doors share it.

## Pastor workflow

1. **Vision:** define the transformation goal, audience, church context, mission, pastoral voice, theological direction, title, subtitle, duration, and launch date. Plan the catalytic experience, champions, participation channels, stories, multiplication, and next step.
2. **Intelligence:** import or paste your own sermons; search LifeTogether's catalog; inspect indexed global church references. Preserve title, subtitle, speaker, church, Scripture, source location, teaching notes, and permission status. Choose which sources belong in this campaign.
3. **Experience:** use a pilot, whole-church, or full-experience preset, then choose each component as included now, planned later, or excluded. Children, youth, and family editions remain explicit choices.
4. **Blueprint:** edit each teaching week, Scripture, big idea, practice, group question, and household connection. Attach specific sources. A 40-day campaign contains exactly 40 calendar days and six teaching weeks; other durations adjust accordingly.
5. **Resource studio:** create missing drafts and edit each resource. Assign its owner, reviewer, and status. Regeneration requires confirmation and affects only the selected resource. Changes to the blueprint flag older drafts for review; existing wording is preserved.
6. **Launch:** work through Decide, Build, Recruit, Prime, Run, and Land. Dates recalculate from the opening gathering. Assign task owners, mark completed work, and calculate participants, groups, additional hosts, and print quantities from stated assumptions.
7. **Review & export:** record observed outcomes, complete the readiness checklist, record pastoral review, and download the campaign playbook, Markdown, calendar, CSV inventories, or editable campaign backup.

## Seventeen component types

Weekend sermons; small groups; daily devotion and practice; family conversations; children; youth; host recruitment and training; prayer; testimony stories; email and text invitations; social content; teaching video briefs; landing-page copy; design and print brief; entry and exit reflection; next-step pathway; generosity initiative.

Resources are working editorial drafts. A default 40-day scope produces 69 editable resource drafts. A full scope can include more. A weekly source title does not establish that a complete manuscript exists. The source's exact wording is kept distinct from suggested structure and applications.

## Libraries and source boundaries

- **Sermon intelligence:** material supplied by the pastor through notes or file imports. Structured fields and labeled big ideas, Scripture, and practices can shape weekly plans. Audio/video/PDF can be linked as references; paste the relevant transcript or notes.
- **LifeTogether intelligence:** eligible master records and recovered concepts from the existing catalog. Title-only records require teaching content before they count as teaching-ready.
- **Church intelligence:** global church reference records already in the master catalog, plus resources the pastor adds. This is not a live crawl of every church. Catalog-held references can inform planning but cannot supply teaching drafts or be silently promoted to authorized material.

The builder never changes the source catalog. Held, restricted, and deselected teaching is excluded from new drafts. Global teaching requires a recorded adaptation permission, and original catalog holds cannot be lifted by changing an option in the builder.

## Saving, import, and export

Campaigns save in browser local storage. No sermon or church profile is sent to a server or model service. Up to 25 active campaigns and 200 sources per campaign are supported within the device's storage capacity. Storage failures and conflicting edits from another tab are reported; a campaign backup can preserve current work.

Sermon import accepts `.docx`, `.txt`, `.md`, `.csv`, and `.json`. Files must be smaller than 2 MB; individual sermon notes must be within 60,000 characters. Larger documents should be split. Word archive extraction is bounded and rejects malformed archives. CSV supports quoted commas and multiline fields. Importing a campaign backup creates a new copy and validates its structure.

Use **Save a backup** before clearing browser storage or moving devices. The backup includes supplied sermon notes. The printable HTML playbook is a standalone document with Print / save PDF. Calendar exports use dated, all-day events. Downloads and review controls do not publish, email, or schedule anything automatically.

## Validation and release scope

Automated checks cover supported durations, daylight-saving boundaries, capacity calculations, catalog source partitioning, holds, import validation, Word extraction, source-grounded planning, edit retention, stale-resource detection, readiness, backups, export formats, task rescheduling, route rendering, persistence, and HTML escaping. Existing catalog routes, recommendation checks, and recovered-title behavior also pass.

Browser verification covers campaign creation, church profile saving, manual sermon entry, library search and selection, Word and CSV import, resource generation, saved edits after reload, mobile layout without horizontal page overflow, and dated launch-task assignments. Chrome's automated file chooser required extension support; file imports were subsequently verified in the in-app browser. No real church data was used for testing.

The current app creates deterministic editorial planning drafts. Hosted AI generation, automatic transcription, a live global search connector, shared accounts, and cloud synchronization are not connected. The UI describes these boundaries rather than simulating unavailable services. Netlify's existing access settings remain unchanged.

The hosted homepage loads the shared `data.js`, `core.js`, `app.js`, and `style.css` files, matching the website doors. Builder releases do not need to re-embed the existing catalog in the homepage. The standalone export command still embeds these assets when a portable file is explicitly requested.

## Content review

The built-in prompts are planning and editorial scaffolds. They use suggested Scripture references, default to NIV, and do not reproduce translation text. Pastors review the passage, exposition, and application before use. No testimony, endorsement, partnership, permission, financial return, or ministry outcome is invented. Giving invitations are voluntary; children and family prompts avoid compelled disclosure. Imported teaching, actual manuscripts, licensing, safeguarding, and final denominational review remain the responsible church team's decisions.
