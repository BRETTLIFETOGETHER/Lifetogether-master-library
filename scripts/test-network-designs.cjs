'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ids=['sermon','groups','advisor','church','familyministry','finance','family','flourishing','workplace','doingchurch'];
const out=process.env.DESIGN_SHOTS||'/private/tmp/lifetogether-designs';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),report=[];
 for(const id of ids){
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:8766/'+id+'/';
  await page.goto(base);await page.locator('main[data-page="home"] h1').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('body').getAttribute('data-site'),id);assert.equal(await page.locator('main h1').count(),1);
  await page.screenshot({path:path.join(out,id+'-desktop.png')});
  await page.screenshot({path:path.join(out,id+'-full.png'),fullPage:true});
  const homeHeadline=await page.locator('main h1').innerText();
  const internal=await page.locator('main a[href^="#/"]').evaluateAll(els=>els.map(x=>x.getAttribute('href')));
  assert(internal.length>10);assert(!internal.some(x=>x==='#/'));
  await page.locator('form#finder input[name="q"]').fill('faith');
  await page.locator('form#finder button[type="submit"]').click();await page.locator('main[data-page="explore"]').waitFor();assert(new URLSearchParams(page.url().split('?')[1]).get('q')==='faith');
  await page.goto(base+'#/explore');await page.locator('.resource').first().waitFor();
  await page.screenshot({path:path.join(out,id+'-library.png')});
  await page.locator('.resource-foot a').first().click();await page.locator('.detail').waitFor();
  const recordTitle=await page.locator('.detail>div:last-child>h1').innerText();
  await page.getByRole('link',{name:'Customize this journey'}).click();await page.locator('#journey-builder').waitFor();
  await page.locator('input[name="name"]').fill('Design test '+id);
  await page.locator('select[name="duration"]').selectOption('21');
  await page.locator('button[type="submit"]').click();await page.getByRole('button',{name:'Download production brief'}).waitFor();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download production brief'}).click();assert((await download).suggestedFilename().includes(id));
  assert((await page.locator('.preview-card').innerText()).includes(recordTitle));
  for(const route of ['home','explore','build','intelligence','advisors','about']){
   await page.setViewportSize({width:390,height:844});await page.goto(base+'#/'+route);await page.locator('main[data-page="'+route+'"]').waitFor();await page.evaluate(()=>document.fonts.ready);
   const metrics=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,off:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(e).position!=='absolute'}).map(e=>e.tagName+'.'+e.className).slice(0,8)}));
   assert(metrics.doc<=metrics.w+1,id+' '+route+' overflow '+JSON.stringify(metrics));
   if(route==='home'){await page.screenshot({path:path.join(out,id+'-mobile.png'),fullPage:true});await page.getByRole('button',{name:'Menu',exact:false}).click();assert.equal(await page.locator('#site-nav').isVisible(),true);await page.locator('#site-nav a[href="#/explore"]').click();await page.locator('main[data-page="explore"]').waitFor();}
   if(route==='build')await page.screenshot({path:path.join(out,id+'-builder-mobile.png'),fullPage:true});
  }
  assert.deepEqual(errors,[],id+' JS errors');
  report.push({id,homeHeadline,search:true,detail:true,builderSave:true,download:true,mobileRoutes:6,errors});console.log('PASS',id,'desktop, search, preview, builder, download, six mobile routes');await page.close();
 }
 assert.equal(new Set(report.map(x=>x.homeHeadline)).size,10);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
