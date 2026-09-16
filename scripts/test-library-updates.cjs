const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=require('../data/library-updates.json'),L=require('../src/library-updates-core.js');
assert.equal(data.journeys.length,3000);assert.equal(new Set(data.journeys.map(r=>r.id)).size,3000);assert.equal(data.tools.length,50);assert.equal(data.books.length,2);assert(data.books.every(b=>b.chapters.length===21));
for(const mode of ['business','church'])for(const days of [21,30])for(const kind of ['Personal','Team','Company / cohort']){const found=L.search(data.journeys,{mode,days,kind});assert(found.length);assert(found.every(r=>r.days===days&&r.kind===kind&&r.displayTitle));}
assert.equal(L.search(data.journeys,{q:'not-a-real-title-942889'}).length,0);
const row=data.journeys.find(r=>r.days===30),plan=L.plan(row,{start:'2026-12-20',goal:'Test goal',mode:'church'});
assert.equal(plan.schedule.length,5);assert.equal(plan.schedule.at(-1).endDay,30);assert.equal(plan.schedule.at(-1).date,'2027-01-17');assert.equal(L.plan(row,{start:'2026-02-30'}).startDate,'');assert.equal(plan.originalTitle,row.title);assert.match(plan.status,/proposed concept/);
const archive=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/archive-fulltext.json.gz')))),catalog=require('../data/catalog.json');
assert.equal(Object.keys(archive.files).length,1088);for(const a of catalog.assets)assert.equal(archive.files[a.path].sha,a.sha);
console.log('PASS source identity, unique concepts, church/workplace mirrors, filters, exact calendars, 42 chapter titles, and 1,088 archive versions');
if(!process.env.BROWSER_TEST)process.exit(0);
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const ids=['master','sermon','groups','advisor','church','familyministry','finance','family','flourishing','workplace','doingchurch'];
 for(const id of ids){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:8765/'+(id==='master'?'dist/':'sites/'+id+'/');
  page.setDefaultTimeout(20000);await page.goto(base+'#/journeys');await page.locator('#lu-search').waitFor();if(id==='master')await page.screenshot({path:'/private/tmp/lifetogether-journeys-desktop.png'});assert.equal(await page.locator('.lu-card').count(),12);
  await page.locator('#lu-search select[name=kind]').selectOption('Personal');await page.locator('#lu-search select[name=days]').selectOption('30');await page.getByRole('button',{name:'Find journeys',exact:true}).click();
  await page.waitForURL(/kind=Personal/);await page.locator('.lu-title').first().click();await page.locator('#lu-plan').waitFor();assert.match(await page.locator('.lu').innerText(),/Proposed 30-day concept/);
  await page.locator('#lu-plan input[name=start]').fill('2026-12-20');await page.locator('#lu-plan textarea').fill('<script>window.bad=true</script> A useful goal');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download printable plan'}).click();const file=await (await download).path(),html=fs.readFileSync(file,'utf8');assert(html.includes('&lt;script&gt;window.bad=true&lt;/script&gt;'));assert(!html.includes('<script>'));assert(html.includes('2027-01-17'));
  for(const route of ['journeys','toolbox','pathways']){
   await page.setViewportSize({width:390,height:844});await page.goto(base+'#/'+route);await page.locator('.lu-intro h1').waitFor();const width=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:innerWidth}));assert(width.actual<=width.viewport+1,id+' '+route+' mobile overflow');
   if(id==='family'&&route==='journeys')await page.screenshot({path:'/private/tmp/lifetogether-journeys-mobile.png'});if(route==='toolbox')assert.equal(await page.locator('.lu-card').count(),50);
  }
  await page.goto(base+'#/home');await page.locator('main h1').waitFor();assert.deepEqual(errors,[]);await page.close();console.log('PASS',id,'filter, concept details, safe printable download, toolbox, pathways, home and mobile layouts');
 }
 const page=await browser.newPage();page.setDefaultTimeout(20000);await page.goto('http://127.0.0.1:8765/dist/#/archive');await page.getByText('Complete-text search ready · all 1,088 source versions verified',{exact:true}).waitFor();
 let sample;for(const a of catalog.assets){const full=archive.files[a.path].text;if(full.length<12000)continue;const matches=full.slice(10000).match(/[A-Za-z][A-Za-z ,'-]{35,75}/g)||[];for(const q of matches){if(!full.slice(0,2000).toLowerCase().includes(q.toLowerCase())&&![a.name,a.description,a.project].join(' ').toLowerCase().includes(q.toLowerCase())){sample={a,q};break}}if(sample)break}
 assert(sample);await page.goto('http://127.0.0.1:8765/dist/#/archive?q='+encodeURIComponent(sample.q));await page.locator('a[href="#/asset/'+sample.a.id+'"]').first().waitFor();
 await page.goto('http://127.0.0.1:8765/dist/#/library-register');await page.getByRole('button',{name:'Download register'}).waitFor();assert.equal(await page.locator('.lu-table tbody tr').count(),data.register.length);
 await page.goto('http://127.0.0.1:8765/dist/#/record/'+data.books[0].id);await page.getByText(data.books[0].chapters[20].title,{exact:true}).waitFor();
 console.log('PASS deep archive search, library register, and actual chapter outline rendering');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
