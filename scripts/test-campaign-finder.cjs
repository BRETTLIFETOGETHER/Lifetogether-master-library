'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const C=require('../src/campaign-core.js'),F=C.Finder;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const row=(id,fields={})=>({'Master ID':id,'Campaign Title':'Life Together','Subtitle':'A 40-Day Journey to Community','Format / Product Type':'Churchwide Campaign','Best For / Audience':'Whole church / small groups','_section':1,...fields});

test('Discovery requires explicit campaign or series identity, and excludes structural products',()=>{
 const fixtures=[row('campaign'),row('series',{'Format / Product Type':'6-Session Small Group Series',Subtitle:''}),row('sunday',{'Format / Product Type':'Catalytic Sunday sermon concept',Subtitle:''}),row('book',{'Format / Product Type':'Book',Subtitle:''}),row('notes',{'Format / Product Type':'Book',Subtitle:'',Notes:'A possible 40-day campaign in the future.'}),row('builder',{'Source Item Type':'Builder / Platform Module'}),row('toolkit',{'Campaign Title':'Campaign Toolkit'}),row('module',{'Format / Product Type':'Six-Session Company-Wide Campaign Session'}),row('daily',{'Format / Product Type':'40-Day Devotional Day'}),row('category',{'Source Item Type':'Catalytic Sunday Category'}),row('service',{'Campaign Title':'90-Day Campaign Accelerator','Source Item Type':'Service Offering'}),row('wise',{'Campaign Title':'The Wise Builder'})];
 assert.deepEqual(F.index(fixtures).map(x=>x.recordId),['campaign','series','sunday','wise']);
});
test('Reference discovery preserves AI holds while removed/deferred rows stay absent',()=>{
 const ref=row('reference',{'Priority Grade':'REFERENCE','Source Item Type':'Third-Party Market Benchmark','Format / Product Type':'Third-Party Small Group Product / Market Reference','Do Not Send to AI Yet?':'Yes'});
 const items=F.index([ref,row('held',{'Do Not Send to AI Yet?':'Yes'}),row('removed',{'Build Decision':'Removed / Do not build'}),{...ref,'Master ID':'deferred','Build Decision':'Deferred'},row('historical',{_section:3})]);
 assert.equal(items.length,1);assert.equal(items[0].layer,'church');assert.equal(items[0].type,'reference');assert.equal(items[0].restricted,true);assert.equal(items[0].status,'Church reference only');assert.match(items[0].restrictionReason,/held from AI/);assert.ok(F.search(items)[0].reasons.some(x=>x.includes('held from AI')));
});
test('Recovered concepts retain exact title, subtitle, and source identity',()=>{
 const title='“Better Together” <test>',subtitle='A 40‑Day Journey — Finding a place to belong';
 const found=F.index([row('MEM-1',{'Campaign Title':title,Subtitle:subtitle,'Format / Product Type':'Recovered concept',_section:79,_memory:{types:['40_day_campaign']}})])[0];
 assert.equal(found.id,'catalog:MEM-1');assert.equal(found.title,title);assert.equal(found.subtitle,subtitle);assert.match(found.status,/Recovered/);assert.equal(found.duration,40);
});
test('Durations handle Unicode hyphens and spelled numbers without turning sessions into days',()=>{
 for(const phrase of ['40-day','40‑day','40–day','40—day','forty-day','Forty Days'])assert.deepEqual(F.durationInfo({subtitle:phrase+' journey'}).durations,[40]);
 assert.equal(F.durationInfo({format:'Six-session small group series'}).duration,null);
 assert.deepEqual(F.durationInfo({format:'21–40-day campaign'}).durations,[]);
 assert.deepEqual(F.durationInfo({format:'21 to 40 day journey'}).durations,[]);
 assert.equal(F.durationInfo({title:'A 400-day journey'}).duration,null);
});
test('Multiple stated durations remain options; unknown and exact filters do not invent a default',()=>{
 const items=F.index([row('options',{Subtitle:'', 'Format / Product Type':'21/30/40-Day Campaign'}),row('unknown',{Subtitle:'','Format / Product Type':'6-Session Small Group Series'}),row('forty')]);
 assert.equal(items[0].duration,null);assert.deepEqual(items[0].durations,[21,30,40]);assert.equal(items[0].durationLabel,'21 / 30 / 40 days');
 assert.deepEqual(F.search(items,{duration:'unknown'}).map(x=>x.recordId),['unknown']);assert.deepEqual(F.search(items,{duration:30}).map(x=>x.recordId),['options']);assert.equal(F.search(items,{duration:40}).length,2);
});
test('Goal and audience filters use word boundaries and explicit source evidence',()=>{
 const items=F.index([row('rest',{Subtitle:'A 40-day journey of rest','Best For / Audience':'Families'}),row('restoration',{'Campaign Title':'Restoration',Subtitle:'A 40-day journey of restoration','Best For / Audience':'Children'}),row('commissions',{'Campaign Title':'Commissions',Subtitle:'A 40-day journey through work','Best For / Audience':'Adults'})]);
 assert.deepEqual(F.search(items,{goal:'peace'}).map(x=>x.recordId),['rest']);assert.equal(F.search(items,{goal:'mission'}).length,0);
 const family=F.search(items,{audience:'family'});assert.equal(family.length,1);assert.deepEqual(family[0].audienceEvidence.family,['families']);assert.ok(family[0].reasons.some(x=>x.includes('families')));assert.ok(F.search(items,{goal:'peace'})[0].reasons.some(x=>x.includes('rest')));
});
test('Goal classification does not come from generic audience labels or historical notes',()=>{
 const items=F.index([row('plain',{'Campaign Title':'New Beginnings',Subtitle:'','Best For / Audience':'Spiritual formation leaders',Notes:'An old vision and generosity campaign, now focused elsewhere.'})]);
 assert.equal(F.search(items,{goal:'formation'}).length,0);assert.equal(F.search(items,{goal:'generosity'}).length,0);assert.deepEqual(items[0].goals,[]);
});
test('My sermons are starting points and archived/restricted sources never enter discovery',()=>{
 const sermons=[{id:'a',title:'Grace at the Table',subtitle:'Hospitality in everyday life',notes:'Read Romans 12:9–13',permission:'owned'},{id:'b',title:'Archived sermon',archived:true},{id:'c',title:'Restricted sermon',permission:'restricted'},{id:'d',title:'Catalog restriction',catalogRestricted:true}];
 const items=F.index([],sermons);assert.equal(items.length,1);assert.equal(items[0].id,'sermon:a');assert.equal(items[0].status,'Sermon starting point');assert.equal(items[0].duration,null);assert.equal(F.search(items,{layer:'pastor',q:'Romans'}).length,1);assert.equal(F.search(items,{goal:'community'}).length,1);assert.equal(F.search(items,{type:'campaign'}).length,0);
 const wilderness=F.index([],[{id:'w',title:'40 Days in the Wilderness',series:'40-Day Sermon Series'}]);assert.deepEqual(wilderness[0].durations,[]);assert.equal(F.search(wilderness,{duration:40}).length,0);assert.equal(F.search(wilderness,{duration:'unknown'}).length,1);
});
test('Named library campaign seeds are discoverable while an actual library is structural',()=>{
 const items=F.index([row('seed',{'Source Item Type':'Applied Library Campaign Seed','Format / Product Type':'Campaign Seed / Theme Title'}),row('library',{'Source Item Type':'Campaign Library','Format / Product Type':'Campaign Library / Product'})]);assert.deepEqual(items.map(x=>x.recordId),['seed']);
});
test('Filtering composes and title ordering is stable across index order',()=>{
 const input=[row('z',{'Campaign Title':'Zion',Subtitle:'40 days of prayer'}),row('a',{'Campaign Title':'Abide',Subtitle:'40 days of prayer'}),row('b',{'Campaign Title':'Abide',Subtitle:'40 days of prayer'})],items=F.index(input);
 const filters={q:'prayer',duration:40,goal:'formation',layer:'lifetogether',audience:'groups',type:'campaign',sort:'title'};
 assert.deepEqual(F.search(items,filters).map(x=>x.recordId),['a','b','z']);assert.deepEqual(F.search([...items].reverse(),filters).map(x=>x.recordId),['a','b','z']);assert.equal(F.search(items,{q:'not present'}).length,0);
});
test('Search results and nested evidence are copies; record IDs deduplicate without merging editions',()=>{
 const records=[row('same'),row('same'),row('other',{'Best For / Audience':'Families'})],items=F.index(records),before=JSON.stringify(items),out=F.search(items,{goal:'community'});
 assert.equal(items.length,2);out[0].title='Edited';out[0].goals.push('edited');out[0].goalEvidence.community.push('edited');out[0].durationEvidence[0].text='edited';assert.equal(JSON.stringify(items),before);assert.equal(records[0]['Campaign Title'],'Life Together');
});
test('Read-only references remain discoverable but rank below usable matches by default',()=>{
 const items=F.index([row('reference',{'Priority Grade':'REFERENCE','Do Not Send to AI Yet?':'Yes'}),row('usable')]);assert.equal(F.search(items)[0].recordId,'usable');assert.equal(F.search(items,{layer:'church'})[0].recordId,'reference');
});
test('Real catalog yields source-linked campaigns, excludes operational artifacts, and preserves all benchmark holds',()=>{
 const text=fs.readFileSync(path.join(__dirname,'../dist/data.js'),'utf8'),data=JSON.parse(zlib.gunzipSync(Buffer.from(text.match(/LT_PAYLOAD="([^"]+)/)[1],'base64'))),section=data.sections[1],records=section.rows.map((r,i)=>({...Object.fromEntries(section.columns.map((k,j)=>[k,r[j]||''])),_section:1,_row:i})).concat(data.extraRecords),items=F.index(records),byId=new Map(records.map(r=>[r['Master ID'],r]));
 assert.ok(items.length>5000&&items.length<records.length);assert.ok(F.search(items,{duration:40}).length>100);assert.ok(F.search(items,{type:'catalytic'}).length>100);
 for(const title of ['Better Together','Rooted','All In'])assert.ok(items.some(x=>x.title===title&&x.durations.includes(40)));
 for(const title of ['90-Day Campaign Accelerator','The Catalytic Sunday Playbook','The Catalytic Church Calendar','40-Day Christian Advisor Growth Builder'])assert.ok(!items.some(x=>x.title===title),title);
 const refs=items.filter(x=>x.layer==='church');assert.equal(refs.length,81);assert.ok(refs.every(x=>x.restricted&&C.denied(byId.get(x.recordId))));
 for(const item of items){const r=byId.get(item.recordId);assert.equal(item.title,r['Campaign Title']);assert.equal(item.subtitle,String(r.Subtitle||''));if(item.layer!=='church')assert.equal(C.denied(r),false);}
 console.log('Catalog coverage: '+JSON.stringify(F.counts(items)));
});
console.log(JSON.stringify({passed:true,checks}));
