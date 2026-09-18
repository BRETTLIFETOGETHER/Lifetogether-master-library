const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const E=require('../dist/journey-studio/engine.js');
const raw=fs.readFileSync('dist/data.js','utf8'),d=JSON.parse(zlib.gunzipSync(Buffer.from(raw.match(/"([^"]+)"/)[1],'base64')));
const records=E.records(d);assert(records.length>65000);assert(records.some(r=>r.blocked));assert(records.some(r=>!r.blocked));assert(records.find(r=>r.id==='M-00001').subtitle==='');
assert(E.restricted({'Do Not Send to AI Yet?':'Yes'}));assert(E.restricted({'Build Decision':'Deferred'}));assert(E.restricted({'Source Item Type':'Market benchmark'}));
for(const duration of [21,30,40])for(const role of ['Pastor','Advisor'])for(const focus of Object.keys(E.themes)){
 const j=E.build({duration,role,focus,title:'A Journey of Grace',subtitle:'Growing together',notes:'Source notes remain exact.',sourceTitle:'A Journey of Grace'});
 assert.equal(j.days.length,duration);assert.equal(new Set(j.days.map(d=>d.title)).size,duration);assert.equal(j.days[0].title,'Begin by listening');assert.equal(j.days.at(-1).title,'Carry the journey outward');
 for(const day of j.days)for(const key of Object.keys(E.fields))assert(day[key]);assert.equal(E.sessions(j).length,Math.ceil(duration/7));
 assert.equal(E.validate(JSON.parse(JSON.stringify(j))).days.length,duration);assert(E.html(j).includes('Source notes remain exact.'));
}
const j=E.build({duration:21,role:'Advisor',focus:'legacy',title:'<script>alert(1)</script>',subtitle:'<img src=x onerror=alert(1)>'});assert(!E.html(j).includes('<script>'));assert(E.html(j).includes('&lt;script&gt;'));assert.throws(()=>E.validate({schema:'LT-JOURNEY-1',profile:{duration:40},days:[]}));
const sample=E.build({duration:40,role:'Pastor',focus:'formation',title:'Together in Faith',subtitle:'Forty days of Scripture, reflection, and everyday practice',prepared:'Sample church',date:'2026-10-01',source:'Original sample for verification'});fs.writeFileSync('tmp/pdfs/journey-print.html',E.html(sample));
console.log(JSON.stringify({passed:true,scenarios:36,records:records.length,available:records.filter(r=>!r.blocked).length,reference:records.filter(r=>r.blocked).length,distinctDailyReflections:E.beats.length}));
