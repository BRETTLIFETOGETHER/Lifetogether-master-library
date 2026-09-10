# Campaign Intelligence v2

## Product goal
Turn the LifeTogether source-preserving master catalog into an executive-quality discovery and production environment rather than a spreadsheet-like list.

## Core flow
**Discover → Compare → Select → Build → Deploy**

The studio intentionally reads the existing embedded catalog and preserves its source identity. It does not deduplicate, rewrite, or silently promote generated concepts over historic LifeTogether IP.

## Five primary surfaces
1. **Discover** — full-text campaign search with category and source-layer filtering.
2. **30 Pathways** — thirty practical entry points into the shared catalog, including churchwide campaigns, pastor library, biblical characters, Bible books/passages, family legacy, financial wisdom, marketplace, advisor, seasonal, leadership and more.
3. **Compare** — up to three records side-by-side before canonicalization.
4. **Production Studio** — selected campaign expands into a 30-deliverable production map.
5. **Source Governance** — explicit source hierarchy and provenance discipline.

## 30 production deliverables
1. Weekend Sermon Series
2. 40-Day Devotional
3. 6-Session Small Group Guide
4. Leader Guide
5. Participant Guide
6. Host Training
7. Campaign Launch Playbook
8. Prayer Guide
9. Scripture Memory Plan
10. Family Discussion Guide
11. Children’s Edition
12. Student Edition
13. Young Adult Edition
14. Men’s Edition
15. Women’s Edition
16. Marketplace Edition
17. Christian Advisor Edition
18. Legacy Family Edition
19. Video Teaching Scripts
20. Testimony Story Kit
21. Social Media Pack
22. Email Journey
23. Text Message Sequence
24. Landing Page Copy
25. Campaign Graphics Brief
26. Print-Ready Book Brief
27. Assessment
28. Follow-Up Pathway
29. Outcome Dashboard
30. Partner / White-Label Edition

## Source hierarchy
1. Historic / deployed LifeTogether IP
2. Approved partner IP with permissions and provenance
3. Current developed catalogs
4. Newly generated concept inventory

## Release behavior
The studio is published under `dist/studio/index.html` and consumes the same embedded catalog as the existing Master Library. This avoids a second drifting database and keeps the ten existing branded doors intact.
