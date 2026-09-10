"""Reproducible read-only import and dependency-free static HTML build."""
from pathlib import Path
import csv, io, json, re, gzip, base64, hashlib, urllib.parse, collections
from import_memory_catalog import load_memory_catalog
ROOT=Path(__file__).resolve().parents[1]
def dump(path,value):
    path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')))
section_names=['Workbook summary','Updated Master','Raw source history','Duplicate and conflict review','Quality issues','Framework and structural decisions','Priority build queue','Category rename instructions','Master channels','Builder and platform areas','Catalytic calendar','Campaign lifecycle','Removal history','Restoration history','Dedupe rules','Church values','Mission / Vision / Values titles','GOIA Legacy Extract','GOIA Legacy Summary','Pastor Outreach Extract','Pastor Outreach Summary','Pastor Outreach Continuation','Outreach Continuation Summary','White Paper / RBI Expansion','White Paper Summary','White Paper Follow-up','Follow-up Summary','Summer / Campaigns 2.0','Email Example Review','Summer Summary','Advisor Practice Growth','Advisor Growth Summary','50 Master Curriculum Categories','50 Master Curriculum Titles','Curriculum Taxonomy Summary','Church Formation Ecosystem','Advisor Ecosystem','Formation / Advisor Summary','Seven Day Experience — Final 18','Ministry Launch Catalog','Seven Day / Ministry Summary','Allowed Cross-Category Reuse','Third-Party Market Benchmarks','Benchmark Summary','Master Directory — Project Files','Master Directory — Chat Deliverables','Master Directory — Library Layers','Master Directory — Next Actions','Master Directory Summary','Campaign Directory Expansion','Directory Expansion Summary','Life of Christ Study Series','Life of Christ Summary','Red Letter Sessions','Blessed Devotional Days','Red Letter Summary','Purpose Built Campaigns','Purpose Built Architecture','Purpose Built Summary','Purpose Built Business Core','CEO / CHRO Priorities','Purpose Built Business Sessions','Purpose Built Teams','Purpose Built Advisor Journeys','Purpose Built Market Architecture','Market-Entry Summary','Future of Preaching','Applied Christian Life Seeds','Marketplace Ministry Intelligence','Christian Intelligence Taxonomy','Intelligence Product Families','Digital Discipleship Architecture','Harvest','Church Intelligence Domains','Christian Life Formation Map','Family Legacy Future Domains','Christian Intelligence Summary','Workplace Campaign Priorities','Workplace Priorities Summary']
sections=[]
for i,part in enumerate(gzip.decompress((ROOT/'data/source-workbook.csvs.gz').read_bytes()).decode('utf-8').split('\f')):
    rows=list(csv.reader(io.StringIO(part))); columns=rows[0][1:]; data=[]; offset=2
    for row in rows[1:]:
        if any(row[1:]): data.append(row[1:])
    if len(columns)>1 and columns[1].startswith('Unnamed:') and data and i>=59: columns=data.pop(0); offset=3
    sections.append(dict(id=i,name=section_names[i],columns=columns,rows=data,rowOffset=offset))
master=[dict(zip(sections[1]['columns'],r)) for r in sections[1]['rows']]
tree=json.loads((ROOT/'data/github-artifacts-tree.json').read_text())
assert tree.get('truncated') is False
readme=(ROOT/'data/archive-index.md').read_text()
descriptions={}
for line in readme.splitlines():
    m=re.match(r'- \[`([^`]+)`\]\(([^)]+)\) — (.*)',line)
    if m: descriptions[urllib.parse.unquote(m[2])]=m[3]
assets=[]
for item in tree['tree']:
    if item['type']!='blob' or not item['path'].startswith('artifacts/'): continue
    path=item['path']; parts=path.split('/'); name=parts[-1]
    assets.append(dict(id='A-'+hashlib.sha256(path.encode()).hexdigest()[:12],name=name,project=parts[1],path=path,size=item.get('size',0),format=Path(name).suffix[1:].upper() or 'FILE',description=descriptions.get(path,'Indexed in the repository; content has not been individually reviewed.'),url='https://github.com/BRETTLIFETOGETHER/claude-artifacts/blob/main/'+urllib.parse.quote(path),sha=item['sha']))
spokes=[
 dict(id='church',name='Church & Campaigns',title='LifeTogether Campaigns',description='Bring weekend teaching, small groups, daily devotionals, families, and next steps into one churchwide experience.',audience='Pastors and church teams',terms='church|campaign|40.day|seven.day|purpose.driven|formation',deliverables=['Campaign finder and ministry outcome profile','Sermon, curriculum, devotional, and family edition manifest','Launch calendar, host training, and Day 41 follow-through']),
 dict(id='family',name='Family & Legacy',title='Family Legacy by Design',description='Help families pass faith, wisdom, values, stories, responsibility, and generosity to the next generation.',audience='Families, couples, and trusted guides',terms='family|legacy|heirs|next.gen|alignment|clarity|communication|terry.parker',deliverables=['Family readiness profile and curated journey','Family meeting agenda and mission-building brief','Next-generation, story, and stewardship resource collection']),
 dict(id='advisor',name='Christian Advisors',title='Christian Advisor Network',description='Equip Christian advisors to grow themselves, strengthen their practices, serve families, and partner with churches.',audience='Christian advisors and advisor networks',terms='advisor|\bcan\b|\bria\b|practice.growth|wealth',deliverables=['Advisor and client conversation profile','Curated family resource collection','Church partnership pilot and delivery brief']),
 dict(id='finance',name='Financial Wisdom',title='Financial Wisdom Ministry',description='Connect biblical ownership, wise decisions, financial habits, generosity, and whole-life stewardship.',audience='Churches, advisors, and families',terms='financial|financ|money|generos|steward|goia|god.owns|ron.blue|russ.crosson',deliverables=['Financial wisdom needs profile','God Owns It All, Master Your Money, and Generous Living source collections','Audience edition and content review manifest']),
 dict(id='workplace',name='Marketplace',title='Marketplace Ministry',description='Develop employees, leaders, owners, teams, and organizational culture through purposeful work and biblical wisdom.',audience='Business owners, leaders, and employees',terms='workplace|marketplace|purpose.built|business|\bceo\b|\bchro\b|enterprise',deliverables=['Employee, leader, or owner needs profile','Purpose Built campaign and six-session outline collection','Faith-based and workplace edition brief']),
 dict(id='sermon',name='Sermons & Publishing',title='Sermon Curator Network',description='Find and organize teaching sources, then shape them into pastor-authentic books, curriculum, and campaign assets.',audience='Pastors, teachers, authors, and publishers',terms='sermon|preach|pastor.*library|publishing|harvest|studio|book',deliverables=['Source and permission inventory','Message-to-curriculum adaptation brief','Print, digital, and media production manifest']),
 dict(id='groups',name='Groups & Training',title='Small Group Ministry',description='Connect group curriculum, host training, coaching, and leadership pathways to lasting community.',audience='Group leaders, coaches, and discipleship teams',terms='small.group|curriculum|seminary|fellowship|training|coaching|\bsgu\b',deliverables=['Group audience and leader-readiness profile','Curriculum collection and facilitator brief','Host-to-coach and next-study pathway']),
 dict(id='operations',name='Strategy & Operations',title='LifeTogether Control Tower',description='Organize source recovery, funding, relationships, production, and the decisions needed to move existing work forward.',audience='Brett and the LifeTogether team',terms='fund|donor|invest|strategy|skill|instruction|bio|job|contact|proposal|platform|intelligence',deliverables=['Source-linked initiative inventory','Three-priority production queue','Decision, owner, and acceptance register'])
]
context_names={
'church':['LifeTogether Campaigns','40DayCampaigns.com','Doing Church Together','This Changes Everything','Seven Day Experience','Church Formation System','Church Formation Wheel','Campaign Intelligence™','Ministry Builder','Vision & Values Builder','Annual Formation Calendar','Story Engine','Day 41 Strategy'],
'family':['Family Legacy by Design','Family Legacy Ministry','Family Legacy Coach Academy','Family Legacy Readiness Assessment','Family Meeting Toolkit™','Family Mission Builder™','Family Giving Plan™','Family Legacy Roadmap™','Preparing Responsible Heirs™','Family Constitution Builder™','Family Governance Toolkit™','Kingdom Impact Planner™','The Living Pledge','Well Done','Good and Faithful','Entrusted','Finish Well','Leverage Your Legacy','Simplify the Money Conversation'],
'advisor':['Christian Advisor Network','Christian Advisors Network','Advisor Journey Builder','Trusted Guide Facilitator Manual™','The Complete Resource Rack'],
'finance':['Financial Wisdom Ministry','God Owns It All','Master Your Money','Generous Living','Joy of Giving','This Changes Me','Little Stewards','Irrational Obedience','Revolutionary Generosity','Exponential Generosity'],
'workplace':['Marketplace Ministry','Purpose-Built Business™','Purpose Built Business™','Purpose Built Teams™','Marketplace Ministry Intelligence™'],
'sermon':['Sermon Curator Network','Sermon Curator','Sermon Intelligence™','The Pastor’s Library','Church Publishing Ministry','LifeTogether Studios','Message-to-Movement Builder','Harvest'],
'groups':['Small Group Ministry','Small Group University','SGU','Curriculum Intelligence™','Class Intelligence™','Coaching Intelligence™','Adult Bible Fellowship Builder'],
'operations':['LifeTogether Christian Intelligence™','LifeTogether Control Tower','National Pilot Funding Strategy','Tom Conway Digital Content Engine','LifeTogether AI Workspace Operating System']}
initiatives=[]
for spoke,names in context_names.items():
    for name in names:
        exact=[r['Master ID'] for r in master if r.get('Campaign Title','').casefold().replace('™','')==name.casefold().replace('™','')]
        initiatives.append(dict(id='I-'+hashlib.sha256((spoke+name).encode()).hexdigest()[:10],name=name,spoke=spoke,masterIds=exact,source='Workbook exact title match' if exact else 'Conversation context — source asset needs verification',status='PROPOSED',note='Name preserved from prior work. Current completion and release status are not verified.'))
# Preserve all source-defined platform items as individually addressable initiative pages.
for table_idx,title_col,desc_col in [(9,0,2),(35,2,3),(36,2,3),(70,1,2),(71,2,3)]:
    for row_idx,row in enumerate(sections[table_idx]['rows']):
        title=row[title_col]; existing=next((x for x in initiatives if x['name']==title),None)
        source=dict(section=table_idx,row=row_idx)
        if existing: existing.setdefault('sourceRows',[]).append(source); existing['description']=row[desc_col]; continue
        sp=next((s['id'] for s in [spokes[2],spokes[1],spokes[4],spokes[3],spokes[5],spokes[6],spokes[0],spokes[7]] if re.search(s['terms'],title+' '+row[desc_col],re.I)), 'operations')
        initiatives.append(dict(id=f'I-S{table_idx}-{row_idx}',name=title,spoke=sp,description=row[desc_col],sourceRows=[source],masterIds=[],source='Workbook source row',status='PROPOSED',note='Source-defined concept or framework; completion is not implied.'))
# Ten requested branded doors. Domains are requested labels, not ownership or deployment claims.
domains={'sermon':('SermonCurator.com','Sermon Curator'),'groups':('SmallGroupCurriculum.com','Small Group Curriculum'),'advisor':('ChristianAdvisorNetwork.com','Christian Advisor Network'),'church':('40DayCampaign.com','40 Day Campaign'),'familyministry':('FamilyLegacyMinistry.com','Family Legacy Ministry'),'finance':('FinancialWisdomMinistry.com','Financial Wisdom Ministry'),'family':('FamilyLegacybyDesign.com','Family Legacy by Design'),'flourishing':('FlourishingLifeTogetherSeries.com','Flourishing Life Together Series'),'workplace':('ChristianMarketplaceMinistry.com','Christian Marketplace Ministry'),'doingchurch':('DoingChurchTogether.com','Doing Church Together')}
extra_spokes=[dict(id='familyministry',name='Family Legacy Ministry',description='Launch a church-based ministry that helps families pass on faith, wisdom, values, and generosity.',audience='Church families and ministry leaders',terms='family|legacy|generation',deliverables=['Church ministry launch plan','Family journeys and group leader resources','Ministry follow-through and family profiles']),dict(id='flourishing',name='Flourishing Life Together',description='Explore whole-life flourishing through shared learning journeys and the Flourishing Life Intelligence framework.',audience='Individuals, families, groups, and churches',terms='flourish|whole.life|wellbeing|well.being',deliverables=['Flourishing profile','Curated whole-life journey','Group and daily companion editions']),dict(id='doingchurch',name='Doing Church Together',description='The church-facing umbrella for church intelligence, ministry formation, campaigns, and connected discipleship.',audience='Pastors and church leadership teams',terms='church|pastor|ministry|intelligence|formation',deliverables=['Church profile and intelligence map','Connected ministry and campaign catalog','Churchwide formation pathway'])]
spokes=[s for s in spokes if s['id']!='operations']+extra_spokes
for s in spokes: s['domain'],s['title']=domains[s['id']]
order=['sermon','groups','advisor','church','familyministry','finance','family','flourishing','workplace','doingchurch'];spokes.sort(key=lambda s:order.index(s['id']))
for i in initiatives:
    if i['spoke']=='operations':i['spoke']='doingchurch'
    if 'Flourishing' in i['name']:i['spoke']='flourishing'
    if i['name']=='Family Legacy Ministry':i['spoke']='familyministry'
title_headers=['Campaign Title','Campaign / Resource Title','Campaign / Product Title','Campaign / Course Title','Study / Series Title','Session Title','Devotional Day Title','Campaign Seed','Title','Product Name','Builder / Platform Area','Product / Edition / Package','Deliverable','File Name','Name']
extra_records=[]
for s in sections:
    if s['id']==1:continue
    tc=next((h for h in title_headers if h in s['columns']),None)
    if not tc:continue
    for idx,row in enumerate(s['rows']):
        raw=dict(zip(s['columns'],row));title=raw.get(tc,'')
        if not title:continue
        def get(*keys):return next((raw[k] for k in keys if raw.get(k)), '')
        extra_records.append({'Master ID':f'S-{s["id"]:02d}-{idx+1:05d}','Campaign Title':title,'Subtitle':get('Subtitle','Session Subtitle','Subtitle / Description','Subtitle / Scope','Campaign Subtitle','Subtitle / Promise'),'Category':get('Category','Category / Section','Category / Lane','Category / Channel','Source Category','Category / lane') or s['name'],'Best For / Audience':get('Best For / Audience','Audience','Best For','Audience / Market'),'Core Felt Need / Theme':get('Core Theme','Theme / Notes','Theme'),'Format / Product Type':get('Format / Product Type','Format','Product Type','Item Type') or 'Source placement','Priority Grade':get('Priority Grade'),'Build Decision':get('Build Decision','Recommended Treatment','Treatment / Notes'),'Do Not Send to AI Yet?':get('Do Not Send to AI Yet?'),'Source Item Type':get('Source Item Type'),'Source Document':get('Source Document','Source File','Source','Source document'),'Source Sheet / Section':s['name'],'Original Link / Reference':get('Original Reference','Original Reference / Link','Original Link / Reference','Source Line'),'Conflict Flag':get('Conflict Flag'),'Notes':get('Notes','Development Note','Source Note'),'_section':s['id'],'_row':idx,'_canonical':get('Master ID','Active Master ID')})
memory_records, memory_stats = load_memory_catalog(ROOT, sections)
extra_records.extend(memory_records)
intelligence=sorted(set(r[0] for r in sections[69]['rows']))
stats=dict(master=len(master),catalogPlacements=len(master)+len(extra_records),categories=len(set(r.get('Category') for r in master)),sections=len(sections),sourceRows=sum(len(s['rows']) for s in sections),archiveAssets=len(assets),archiveProjects=len(set(a['project'] for a in assets)),htmlAssets=sum(a['format']=='HTML' for a in assets),held=sum(r.get('Do Not Send to AI Yet?','').lower().startswith('yes') for r in master),benchmarks=sum(r.get('Priority Grade')=='REFERENCE' for r in master),initiatives=len(initiatives),intelligenceSystems=len(intelligence))
stats.update(memory_stats)
data=dict(schemaVersion=1,date='2026-09-09',sourceUrl='https://docs.google.com/spreadsheets/d/1UQwgmPLqny7JVyU5POeQrCGMjRqJ7FAy/edit',sections=sections,assets=assets,spokes=spokes,initiatives=initiatives,stats=stats,extraRecords=extra_records,intelligence=intelligence)
dump(ROOT/'data/catalog.json',data)
payload=base64.b64encode(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),mtime=0)).decode()
dist=ROOT/'dist'; dist.mkdir(exist_ok=True)
shell=(ROOT/'src/index.html').read_text(); css=(ROOT/'src/style.css').read_text(); app=(ROOT/'src/app.js').read_text(); core=(ROOT/'src/core.js').read_text(); app=app.replace('/* CATALOG_EXTENSIONS */',(ROOT/'src/catalog-extensions.js').read_text())
complete=shell.replace('/* APP_CSS */',css).replace('/* APP_CORE */',core).replace('/* APP_JS */',app).replace('DATA_PAYLOAD',payload)
(dist/'index.html').write_text(complete)
# Independent entry pages share one immutable catalog payload and UI; no data copies to reconcile.
(dist/'data.js').write_text('window.LT_PAYLOAD='+json.dumps(payload)+';')
(dist/'core.js').write_text(core);(dist/'app.js').write_text(app);(dist/'style.css').write_text(css)
for s in spokes:
    folder=dist/'spokes'/s['id'];folder.mkdir(parents=True,exist_ok=True)
    page=shell.replace('<style>/* APP_CSS */</style>','<link rel="stylesheet" href="../../style.css">').replace('<script id="data-payload" type="application/octet-stream">DATA_PAYLOAD</script>','<script src="../../data.js"></script>').replace('<script>/* APP_CORE */</script>','<script src="../../core.js"></script>').replace('<script>/* APP_JS */</script>',f'<script>if(!location.hash)location.hash="/website/{s["id"]}";</script><script src="../../app.js"></script>')
    (folder/'index.html').write_text(page.replace('<title>LifeTogether · Master Library</title>',f'<title>{s["domain"]} · LifeTogether</title>'))
dump(ROOT/'docs/import-report.json',dict(**stats,sourceSHA256=hashlib.sha256(gzip.decompress((ROOT/'data/source-workbook.csvs.gz').read_bytes())).hexdigest(),archiveCommit=tree['sha'],limitations=['Drive readable export preserves cell values, not original workbook formatting or original worksheet names. Section labels are descriptive navigation names.','18,569 master records include titles, structural items, sessions, and reference-only products. They are not 18,569 completed campaigns.','Archive files are indexed from the verified Git tree and README; individual completeness, rights, and executable behavior are unverified.','Prior context names augment the workbook; proposed scope is not approval.','This version builds curation briefs. It does not generate complete manuscripts or run every proposed platform.']))
print(json.dumps(stats));print('HTML bytes',len(complete.encode()))
