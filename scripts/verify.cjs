const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),D=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8')),core=require(path.join(root,'src/core.js'));
const master=D.sections[1].rows.map((r,i)=>({...Object.fromEntries(D.sections[1].columns.map((h,j)=>[h,r[j]||''])),_section:1,_row:i}));
assert.equal(master.length,18569);assert.equal(D.sections.length,79);assert.equal(D.assets.length,1088);assert.equal(D.spokes.length,10);assert.equal(D.intelligence.length,23);
assert.equal(master.length+D.extraRecords.length,56853);assert.equal(new Set([...master,...D.extraRecords].map(r=>r['Master ID'])).size,56853);
assert.equal(D.sections.reduce((n,s)=>n+s.rows.length,0),62826);
for(const a of D.assets)assert.ok(a.url.startsWith('https://github.com/BRETTLIFETOGETHER/claude-artifacts/blob/main/'));
for(const r of D.extraRecords){assert.ok(D.sections[r._section].rows[r._row]);assert.ok(core.blocked(r),'Historical source placements cannot bypass a hold');}
const byId=new Map(master.map(r=>[r['Master ID'],r]));
let recommendationCases=0;
for(const audience of Object.keys(core.audiences))for(const goal of Object.keys(core.themes))for(const duration of ['7','21','30','40']){
const out=core.recommend(master,{audience,goal,duration});assert.ok(out.length<=12);for(const x of out){assert.ok(byId.has(x.id));assert.ok(!core.blocked(byId.get(x.id)));assert.equal(x.reasons.length,3)}recommendationCases++;
}
assert.ok(core.blocked({'Do Not Send to AI Yet?':'Yes until approved'}));assert.ok(core.blocked({'Priority Grade':'REFERENCE'}));
assert.equal(core.escape('<script>"&'), '&lt;script&gt;&quot;&amp;');assert.ok(core.csv([['=HYPERLINK("x")']]).startsWith('"\''));
// Exercise application rendering in a minimal document harness; not browser/visual QA.
const nodes={app:{innerHTML:''},toast:{textContent:'',style:{}}},listeners={},errors=[];
const document={activeElement:null,querySelector(sel){return nodes[sel.replace('#','')]||null},getElementById(id){return nodes[id]||null},addEventListener(name,fn){listeners['document:'+name]=fn},createElement(){return {click(){},remove(){}}},body:{append(){}}};
const location={hash:'#/catalog'};
const sandbox={console:{log(){},error(e){errors.push(e)}},document,location,localStorage:{getItem(){return '[]'},setItem(){}},Blob,Response,DecompressionStream,Uint8Array,atob,URL,URLSearchParams,FormData,Set,Map,TextDecoder,TextEncoder,clearTimeout,setTimeout,confirm:()=>false};
sandbox.window=sandbox;sandbox.addEventListener=(name,fn)=>listeners[name]=fn;sandbox.scrollTo=()=>{};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'dist/data.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(path.join(root,'src/core.js'),'utf8'),sandbox);
(async()=>{
await vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),sandbox);
assert.equal(errors.length,0);assert.ok(nodes.app.innerHTML.includes('56,853'));
const routes=['catalog?layer=master','catalog?status=held','catalog?q=blessed','catalog?grade=AA&sort=priority','archive','archive?format=HTML','projects','project/'+encodeURIComponent(D.assets[0].project),'ecosystem','intelligence','survey','results','collection','compare','record/M-15379','record/'+D.extraRecords[0]['Master ID'],'asset/'+D.assets[0].id,'initiative/'+D.initiatives[0].id,'source/1/0','source/53/0','source/54/39',...D.spokes.map(s=>'website/'+s.id),...D.sections.map(s=>'source/'+s.id)];
for(const route of routes){location.hash='#/'+route;listeners.hashchange();assert.ok(nodes.app.innerHTML.includes('<main'),'main route '+route);assert.ok(!nodes.app.innerHTML.includes('Library could not open'),'failed route '+route);assert.ok(!nodes.app.innerHTML.includes('This page was not found'),'missing route '+route)}
location.hash='#/record/M-15379';listeners.hashchange();assert.ok(nodes.app.innerHTML.includes('40 day rows'));assert.ok(nodes.app.innerHTML.includes('6 session rows'));assert.ok(nodes.app.innerHTML.includes('The End of Self-Sufficiency'));
location.hash='#/catalog';listeners.hashchange();listeners['document:click']({target:{closest(){return {dataset:{save:'M-15379'}}}}});location.hash='#/collection';listeners.hashchange();assert.ok(nodes.app.innerHTML.includes('Blessed'));
listeners['document:click']({target:{closest(){return {dataset:{compare:'M-15379'}}}}});location.hash='#/compare';listeners.hashchange();assert.ok(nodes.app.innerHTML.includes('Source field'));
const report={passed:true,sourceSections:D.sections.length,sourceRows:D.stats.sourceRows,catalogPlacements:D.stats.catalogPlacements,uniqueRecordIds:56853,websiteEntrypoints:D.spokes.length,renderedRoutes:routes.length,recommendationCases,checks:['Source placement retention','Unique stable IDs','Historical and held records excluded from curation','All ten website entry routes','Catalog filters','Weekly and devotional outline joins','Archive, initiative, project, and source detail routes','Collection and comparison state transitions','HTML escaping and CSV formula neutralization'],limitation:'Static checks and document-harness functional checks only. No browser visual or end-to-end checkout testing.'};
fs.writeFileSync(path.join(root,'docs/verification-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
