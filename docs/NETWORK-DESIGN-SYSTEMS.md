# Ten individual ministry identities

Each ministry has a dedicated homepage composition in `src/network-designs/<id>.js` and its own theme stylesheet in `src/network-designs/<id>.css`. The common layer preserves navigation, finder, source previews, saved journey briefs, intelligence views, advisor referrals, and the print handoff.

| Ministry | Identity |
|---|---|
| Sermon Curator | Literary archive: paper, burgundy ink, editorial rules, serif headlines, numbered book spines and archive rows. |
| Small Group Curriculum | Welcoming gathering: peach, hand-drawn table illustration, strong rounded typography, friendly cards and conversational pathways. |
| Christian Advisor Network | Quiet advisory practice: midnight navy, restrained gold, classic serif type, compass geometry and considered spacing. |
| 40 Day Campaign | Campaign poster: vermilion, butter yellow, bold sans typography, forty-day calendar marks, high-contrast cards and strong borders. |
| Family Legacy Ministry | Neighborhood of faith: sky blue, illustrated homes, welcoming type, generational pathways and arch-shaped covers. |
| Financial Wisdom Ministry | Stewardship field guide: olive, natural paper, botanical line art, ledger rules and measured editorial typography. |
| Family Legacy by Design | Family heirloom: warm parchment, book-and-letter composition, personal serif type, cloth-inspired covers and quiet spacing. |
| Flourishing Life Together | Botanical garden: plum, lilac, sage and peach, flower illustration, expressive italic headlines, petal-like panels. |
| Christian Marketplace Ministry | Modern workplace: cobalt, slate and chartreuse, oversized directional typography, structural grids and practical resource cards. |
| Doing Church Together | Shared architecture: terracotta, warm stone, nested arches, churchwide pathways and generous serif typography. |

The same identities extend into library results, resource detail, builder, intelligence, referral, purpose, and footer views. Every site has its own browser icon and theme color. Existing content identity and source restrictions are preserved. No new claims about live commerce, validated assessments, or authored manuscripts were introduced by the design pass.

Verification: `scripts/test-network-designs.cjs` runs browser checks on all ten sites: desktop homepage, search, resource detail, saved builder brief, download, mobile navigation, and six mobile routes. Screenshots are reviewed together to check that the sites read as distinct brands. The build also checks all ten catalog payloads and unique themes.
