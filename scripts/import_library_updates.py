"""Import exact, supplied catalog fields. Do not generate missing manuscripts."""
import json

def load_library_updates(root, sections):
    data=json.loads((root/'data/library-updates.json').read_text())
    assert data['schemaVersion']==1 and len(data['journeys'])==3000
    columns=['Master ID','Campaign Title','Subtitle','Category','Best For / Audience','Core Felt Need / Theme','Format / Product Type','Source Item Type','Source Document','Build Decision','Notes']
    section={'id':len(sections),'name':'September 16 — journeys, toolbox and editorial outlines','columns':columns,'rows':[],'rowOffset':1}
    records=[]
    def add(ident,title,subtitle,category,audience,need,format_,kind,source,notes,metadata):
        record=dict(zip(columns,[ident,title,subtitle,category,audience,need,format_,kind,source,'Proposed; full manuscript and editions require production',notes]))
        record.update(_section=section['id'],_row=len(section['rows']),_updates=metadata)
        section['rows'].append([record[k] for k in columns]);records.append(record)
    for row in data['journeys']:
        add('DWT-'+row['id'],row['title'],row['subtitle'],row['category'],row['businessAudience']+'; '+row['churchAudience'],row.get('feltNeed',row.get('businessNeed','')),f"{row['days']}-day journey concept",'Supplied journey concept','Doing Work Together master catalog · September 16, 2026',row['businessDescription']+' Church application: '+row['churchDescription'],{'kind':'journey','sourceId':row['id'],'status':'concept'})
    for row in data['tools']:
        add('DWT-TOOL-'+str(row['rank']).zfill(2),row['name'],'','Practical toolbox','Workplace and church teams',row['need'],'Tool specification','Proposed tool specification','Doing Work Together master catalog · September 16, 2026',row['business']+' Church application: '+row['church']+' Expected output: '+row['output'],{'kind':'tool','status':'specification'})
    for book in data.get('books',[]):
        add(book['id'],book['title'],book['subtitle'],'Churchwide formation','Pastors and church teams','Connect teaching, families, groups, and mission','Book outline','Proposed editorial outline','Doing Church Together book and 21-day challenge · September 16, 2026',book['status'],{'kind':'book','status':'outline','chapters':book['chapters']})
    assert len({r['Master ID'] for r in records})==len(records)
    sections.append(section)
    return records,data
