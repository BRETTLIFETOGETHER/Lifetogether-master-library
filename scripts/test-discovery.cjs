const assert=require('node:assert/strict'),D=require('../src/discovery-core.js');
const records=[{id:'a',title:'Together',goals:['community'],durations:[21],search:'church community together easter John 15',metadata:{video:true}},{id:'b',title:'An unknown source',goals:[],durations:[],search:'faith',metadata:{}},{id:'held',title:'Restricted',restricted:true,goals:['community'],durations:[21],search:'community church'}];
const matches=D.search(records,{mode:'church',goal:'community',duration:21,scripture:'John 15',video:'yes'});
assert.equal(matches[0].id,'a');assert(matches[0].matchReasons.some(r=>r.includes('21 days')));assert(matches[1].missing.includes('Source duration is not stated'));assert(!matches.some(r=>r.id==='held'));
assert.equal(D.search(records,{}, {video:'no'}).length,0);assert.equal(D.search(records,{}, {video:'yes'}).length,1);assert.equal(D.search(records,{}, {minutes:'60'}).length,0);
assert.equal(D.search(records,{}, {scripture:'John 1'}).length,0);
assert.equal(D.schedule(21).length,3);assert.equal(D.schedule(30).length,4);assert.equal(D.schedule(40).length,6);assert.equal(D.schedule(7).length,2);assert.equal(D.schedule(21,'2026-09-20')[2].date,'2026-10-04');assert.throws(()=>D.schedule(7,'',8));assert.throws(()=>D.shortlist(['a','b','c'],'d'));
console.log('Discovery: evidence, unknown metadata, restrictions, shortlists and schedules pass.');
