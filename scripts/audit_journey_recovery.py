"""Reconcile the master payload with exact archive git objects. Does not execute artifacts."""
import argparse,base64,gzip,hashlib,json,re,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('archive');a=p.parse_args()
root=Path(__file__).resolve().parents[1]
payload=(root/'dist/data.js').read_text()
d=json.loads(gzip.decompress(base64.b64decode(re.search(r'"([^\"]+)"',payload).group(1))))
raw=subprocess.check_output(['git','-C',a.archive,'ls-tree','-rz','HEAD','artifacts/'])
files={}
for row in raw.split(b'\0'):
 if row:
  meta,path=row.split(b'\t',1);files[path.decode()]=meta.decode().split()[2]
indexed={x['path']:x['sha'] for x in d['assets']}
missing=sorted(set(files)-set(indexed));stale=sorted(set(indexed)-set(files));changed=[x for x in indexed if x in files and indexed[x]!=files[x]]
master=d['sections'][1];rows=[dict(zip(master['columns'],r)) for r in master['rows']]
report={'schema':1,'checkedOn':'2026-09-18','archiveCommit':subprocess.check_output(['git','-C',a.archive,'rev-parse','HEAD']).decode().strip(),'masterInputCommit':subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD']).decode().strip(),'archiveFiles':len(files),'indexedFiles':len(indexed),'hashMatchedFiles':sum(files.get(p)==sha for p,sha in indexed.items()),'collections':len(set(x['project'] for x in d['assets'])),'missingFromMaster':missing,'missingFromArchive':stale,'changedHashes':changed,'masterTitlePlacements':len(rows),'masterTitlesWithSubtitles':sum(bool(str(x.get('Subtitle','')).strip()) for x in rows),'additionalSourcePlacements':len(d['extraRecords']),'additionalJourneyConcepts':len(d.get('libraryUpdates',{}).get('journeys',[])),'inputPayloadSHA256':hashlib.sha256(payload.encode()).hexdigest(),'scope':'File recovery verified by Git blob hash. Content completeness, reuse rights, manuscript quality and publication approval are not inferred from recovery. Titles with no subtitle retain the missing field. Source/history/hold records remain available for inspection, not automatic building.'}
(root/'dist/journey-studio/recovery-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if missing or stale or changed:raise SystemExit('Recovery mismatch: resolve before publishing a verification claim.')
