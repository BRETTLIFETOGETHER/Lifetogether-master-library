# September 16 library and website update

The master library and all ten existing website packages now share a source-preserving journey browser, practical toolbox, connected experience descriptions, and downloadable starting plans.

## Imported sources

- 3,000 concepts from the supplied Doing Work Together master HTML: 2,000 organization/cohort, 500 team, and 500 personal journeys. Original titles, subtitles, IDs, church and workplace applications, participant and leader needs, editions, and proposed 21/30-day durations are retained.
- 50 proposed tool specifications from the same source. They are not represented as validated assessments or functioning software.
- Two 21-chapter church formation outlines. The 42 supplied chapter titles are visible on their master records. Manuscripts have not been supplied.
- Complete text from all 1,088 files in the existing public Claude artifact archive, verified against the catalog's original Git blob hashes before importing. Archive search loads this compressed index on demand; source/build files are searched as text, never executed.

The resulting catalog contains 67,195 source-preserving placements across 81 sections. This includes historical placements and concepts; it is not a count of completed products. Existing master rows and holds remain unchanged. The source HTML SHA-256 is recorded in `data/library-updates.json`.

## Experiences

`#/journeys` filters by need, 12 life areas, source category, audience, edition, participation and duration. Each concept has church and workplace views and a printable planning brief. Briefs use the source duration, real calendar dates and the user's stated goal. Missing teaching is labeled explicitly. Answers are not sent or saved by this form.

`#/toolbox` presents all 50 specifications. `#/pathways` records the Family Legacy sample-to-personalization offer, weekly sermon-to-family/group production, Flourishing program direction, and distinct human-question/AI-companion requirements. These descriptions link to the existing shared workspace.

The master-only `#/library-register` records progress and the next source or implementation requirement. Owners remain unassigned until the team assigns them.

## Remaining source and configuration requirements

The Flourishing workbook's reported 291 assets and 12,978 entries are not included in imported counts. Its source workbook was not available for reconciliation. Existing overlap must be checked before adding it.

The approved Family Legacy assessment, actual sample package, completed devotional, approved products and credentials remain prerequisites for their respective releases. Recording a pathway does not activate payment, AI replies, a team inbox or automated email delivery. Existing authentication, workspace functions and access settings are preserved.

## Validation

Source/catalog verification, campaign core, campaign finder, discovery core, finder UI, network package and workspace tests pass. The new browser tests cover filtering, concept detail, escaped printable downloads, toolbox, pathways, home and mobile layout on the master and all ten standalone sites. They also confirm a match beyond the old archive preview limit, the register, and chapter outline rendering.

Run `node scripts/test-library-updates.cjs` for source/core checks. With a local repository-root server on port 8765 and Playwright installed, use `BROWSER_TEST=1 node scripts/test-library-updates.cjs` for browser coverage. No real payments, emails or print orders are created by these tests.
