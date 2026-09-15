'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'sites/manifest.json'),'utf8'));
assert.equal(manifest.sites.length,10);assert.equal(new Set(manifest.sites.map(x=>x.id)).size,10);assert.equal(new Set(manifest.sites.map(x=>x.netlifyName)).size,10);
for(const site of manifest.sites){
 const dir=path.join(root,'sites',site.id);for(const f of ['index.html','style.css','app.js','site-data.js','_redirects','netlify.toml','README.md','fonts/manrope.ttf','fonts/dm-serif.ttf'])assert.ok(fs.existsSync(path.join(dir,f)),site.id+' missing '+f);
 const script=fs.readFileSync(path.join(dir,'site-data.js'),'utf8'),value=JSON.parse(script.slice(script.indexOf('=')+1,-1)),data=JSON.parse(zlib.gunzipSync(Buffer.from(value.payload,'base64')));
 assert.equal(data.site.id,site.id);assert.equal(data.network.length,10);assert.equal(data.intelligence.length,23);assert.equal(data.commerce.provider,'Shopify');assert.ok(data.records.length>=6,site.id+' needs useful records');assert.equal(data.records.length,site.records);
 for(const r of data.records){assert.ok(r.id&&r.title);assert.ok(!r.restricted);assert.ok(['campaign','catalytic','series'].includes(r.type));assert.ok(Array.isArray(r.durations)&&Array.isArray(r.goals));assert.ok(Array.isArray(r.sessions)&&Array.isArray(r.days));}
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert.ok(html.includes(data.site.name+' · LifeTogether'));assert.ok(html.includes(data.site.description));assert.ok(!html.includes('SITE_'));
}
const app=fs.readFileSync(path.join(root,'src/network-site.js'),'utf8');for(const feature of ['Journey builder','Complete edition manifest','Find the right kind of guide','download-brief','print-studio','Shopify product URLs'])assert.ok(app.includes(feature),'missing '+feature);assert.ok(!app.includes('innerHTML=r.'));assert.ok(app.includes('const formats=[10,21,30,40]'));
const styles=manifest.sites.map(s=>fs.readFileSync(path.join(root,'sites',s.id,'style.css'),'utf8'));assert.equal(new Set(styles).size,10,'Every site needs a distinct theme');
const homes=manifest.sites.map(s=>fs.readFileSync(path.join(root,'src/network-designs',s.id+'.js'),'utf8'));assert.equal(new Set(homes).size,10,'Every site needs a distinct home composition');
console.log(JSON.stringify({passed:true,sites:manifest.sites.map(x=>({id:x.id,records:x.records}))}));
