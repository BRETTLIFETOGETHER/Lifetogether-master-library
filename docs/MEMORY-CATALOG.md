# Recovered sermon and campaign titles

The public `data/memory-catalog.json` contains exact titles and subtitles, type labels, status, stable IDs, and aggregate source counts. It must not contain private chat titles, conversation URLs or IDs, locators, excerpts, transcripts, personal notes, or raw exports.

Each entry uses `id`, `title`, `subtitle`, `types`, `status`, and `sourceCount`. Missing subtitles use an empty string. Types are `catalytic_sunday` and/or `40_day_campaign`. The detailed audit export is retained locally outside this repository.

The build appends section 79 and preserves every existing workbook section and ID. Imported concepts are browseable from Sermon Curator and 40 Day Campaign, with recovered-title and type filters. They do not participate in manuscript recommendations and do not inherit outlines from merely matching titles.

Build: `python3 scripts/build.py`. Validate: `python3 scripts/test_memory_import.py`, `node scripts/verify.cjs`, and `node scripts/verify-memory.cjs`.
