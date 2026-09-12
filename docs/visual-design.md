# LifeTogether visual system

The site uses a warm editorial workspace: ivory paper, forest ink, restrained clay accents, original book illustrations, DM Serif Display headings, and Manrope interface text.

The shared home, catalog, search, sermon library, collections, notebook, profile, calendar, settings, and help pages use `src/workspace.css`, following the base stylesheet. Its named sections contain the visual system, original cover artwork, and catalog gallery. The campaign workspace uses `src/campaign-builder.css`. All ten website entry points share these assets.

The catalog opens in Gallery view. Gallery/List links preserve filters and pagination; both display the same source identities, review states, and collection/compare controls. Home cover titles and subtitles come directly from three indexed campaign concepts.

Fonts are self-hosted in `dist/fonts`. The matching originals and OFL licenses are retained in `src/fonts`; standalone exports copy that folder. Keep both font folders in the repository. The existing build preserves static distribution assets and regenerates the application and stylesheet.

Validation included 32 workspace and campaign checks, 114 catalog routes, 128 recommendation cases, recovered-title checks, and browser review at 320, 390, 800, 1100 pixels and the normal desktop viewport. Gallery/list filter equivalence, active campaign-step visibility, larger text, stronger contrast, reduced motion, and mobile navigation were checked. Existing source data and Netlify access settings were retained.
