"""Export one requested website as a standalone, independently hostable catalog.

Usage: python3 scripts/export-spoke.py advisor /absolute/output/directory
The complete private catalog is embedded. Exporting is not publishing.
"""
from pathlib import Path
import argparse,json
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('spoke');p.add_argument('destination');a=p.parse_args()
data=json.loads((ROOT/'data/catalog.json').read_text());spoke=next((s for s in data['spokes'] if s['id']==a.spoke),None)
if not spoke:raise SystemExit('Choose one: '+', '.join(s['id'] for s in data['spokes']))
target=Path(a.destination).resolve();target.mkdir(parents=True,exist_ok=True)
if (target/'index.html').exists():raise SystemExit('Destination already contains index.html; choose an empty directory.')
html=(ROOT/'dist/index.html').read_text().replace('<title>LifeTogether · Master Library</title>',f'<title>{spoke["domain"]} · LifeTogether</title>')
html=html.replace('<body>',f'<body><script>if(!location.hash)location.hash="/website/{spoke["id"]}";</script>',1)
(target/'index.html').write_text(html)
(target/'README.md').write_text(f'# {spoke["domain"]}\n\nStandalone LifeTogether catalog entry. Open index.html in a current browser. This includes the private master dataset; do not publish without approving access and source scope.\n\nThis is a generated view of the shared master. Edit the master repository, then export again; do not fork content edits into this copy.\n')
print(str(target/'index.html'))
