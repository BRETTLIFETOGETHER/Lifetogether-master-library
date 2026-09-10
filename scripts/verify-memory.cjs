// Synthetic source metadata exercises new routes without writing fixtures into the catalog.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),D=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const core=require(path.join(root,'src/core.js'));
const section={id:D.sections.length,name:'Synthetic recovered sources',rowOffset:1,columns:['Master ID','Campaign Title','Subtitle'],rows:[]};
const fixture=[
 {id:'MEM-TEST-1',title:'Recovery Fixture <Title>',subtitle:'Original subtitle',types:['catalytic_sunday']},
 {id:'MEM-TEST-2',title:'Recovery Fixture <Title>',subtitle:'Alternate subtitle',types:['40_day_campaign']},
 {id:'MEM-TEST-3',title:'Blank Subtitle Fixture',subtitle:'',types:['40_day_campaign']}
].map((f,i)=>({
 'Master ID':f.id,'Campaign Title':f.title,Subtitle:f.subtitle,Category:'Recovered fixture concepts',
 'Format / Product Type':f.types.map(t=>t==='catalytic_sunday'?'Catalytic Sunday sermon concept':'40-day campaign concept').join(' / '),
 'Source Item Type':'Recovered title / concept',_section:section.id,_row:i,
 _memory:{types:f.types,status:'concept',sources:[{title:'Fixture Source With Capitals',url:'https://example.com/source',locator:'occurrence 1'},{title:'Fixture Source With Capitals',url:'https://example.com/source',locator:'occurrence 2'}]}
}));
section.rows=fixture.map(r=>section.columns.map(c=>r[c]));D.sections.push(section);D.extraRecords.push(...fixture);D.stats.memoryTitles+=3;D.stats.memorySourceOccurrences+=6;D.stats.catalogPlacements+=3;
const nodes={app:{innerHTML:''},toast:{textContent:'',style:{}}},listeners={},errors=[];
const document={activeElement:null,querySelector(s){return nodes[s.replace('#','')]||null},getElementById(id){return nodes[id]||null},addEventListener(n,f){listeners['document:'+n]=f},createElement(){return {click(){},remove(){}}},body:{append(){}}};
const location={hash:'#/website/sermon?layer=memory'};
const sandbox={console:{log(){},error(e){errors.push(e)}},document,location,localStorage:{getItem(){return '[]'},setItem(){}},Blob,Response,DecompressionStream,Uint8Array,atob,URL,URLSearchParams,FormData,Set,Map,TextDecoder,TextEncoder,clearTimeout,setTimeout,confirm:()=>false};
sandbox.window=sandbox;sandbox.addEventListener=(n,f)=>listeners[n]=f;sandbox.scrollTo=()=>{};
sandbox.LT_PAYLOAD=zlib.gzipSync(JSON.stringify(D)).toString('base64');vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'src/core.js'),'utf8'),sandbox);
(async()=>{
 await vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),sandbox);assert.equal(errors.length,0);
 function route(r){location.hash='#/'+r;listeners.hashchange();assert.equal(errors.length,0);return nodes.app.innerHTML}
 for(const door of ['sermon','church']){
  const html=route('website/'+door+'?layer=memory&q=recovery%20fixture');
  assert.ok(html.includes('Original subtitle'));assert.ok(html.includes('Alternate subtitle'));assert.ok(html.includes('Recovery Fixture &lt;Title&gt;'));assert.ok(!html.includes('<Title>'));
  const filtered=route('website/'+door+'?layer=memory&type=catalytic_sunday&q=recovery%20fixture');
  assert.ok(filtered.includes('Original subtitle'));assert.ok(!filtered.includes('Alternate subtitle'));
 }
 assert.ok(route('catalog?layer=memory&q=source%20with%20capitals').includes('Original subtitle'),'Source title searches ignore case');
 const detail=route('record/MEM-TEST-1');assert.ok(detail.includes('occurrence 1'));assert.ok(detail.includes('occurrence 2'));assert.ok(detail.includes('href="https://example.com/source"'));
 assert.ok(detail.includes('finished manuscript or complete campaign has not been verified'));assert.ok(!detail.includes('Weekly curriculum / sermon-series outline'));
 assert.ok(route('record/MEM-TEST-3').includes('Not supplied'));assert.ok(core.blocked(fixture[0]));
 assert.ok(route('source/'+section.id+'/0').includes('Recovery Fixture &lt;Title&gt;'));
 console.log('Memory catalog route checks passed: both website doors, exact subtitle variants, type and source search, all source occurrences, HTML escaping, missing subtitle, concept status, and original fields.');
})().catch(e=>{console.error(e);process.exit(1)});
