const assert=require('node:assert/strict');
const W=require('../src/workspace-core.js'), C=require('../src/campaign-core.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Action plan distinguishes late, due, upcoming, completed and undated work',()=>{
 const c=C.create({launchDate:'2026-10-18'});c.title='Autumn';c.tasks.vision={owner:'Brett',done:true};
 const undated=C.create();undated.title='Next season';
 const rows=W.taskRows([c,undated],C,'2026-10-18');
 assert.equal(rows.find(t=>t.id==='vision'&&t.campaignId===c.id).state,'done');
 assert.ok(rows.some(t=>t.state==='today'));assert.ok(rows.some(t=>t.state==='overdue'));assert.ok(rows.some(t=>t.state==='upcoming'));assert.ok(rows.some(t=>t.state==='unscheduled'));
 assert.equal(W.filterTasks(rows,{status:'done'}).length,1);assert.ok(W.filterTasks(rows).every(t=>!t.done));
 assert.ok(W.filterTasks(rows,{status:'unassigned'}).every(t=>!t.owner&&!t.done));
 assert.equal(W.filterTasks(rows,{status:'all',owner:'Brett'}).length,1);
 assert.equal(W.filterTasks(rows,{status:'all',campaign:c.id}).length,C.launchTasks(c).length);
 assert.equal(W.filterTasks(rows,{status:'all',campaign:'missing'}).length,0);
 assert.ok(W.filterTasks(rows,{status:'all',query:'autumn goal'}).every(t=>t.campaignId===c.id&&/goal/i.test(t.title)));
 assert.ok(!c.tasks.sources,'Computing the plan must not add task edits to campaigns');
});
test('Launch dates crossing a year remain sorted and completed tasks follow open tasks',()=>{
 const a=C.create({launchDate:'2027-01-10'});a.title='A';const b=C.create({launchDate:'2026-12-05'});b.title='B';b.tasks.vision={done:true};
 const rows=W.taskRows([a,b],C,'2026-12-01');const open=rows.filter(t=>!t.done);assert.deepEqual(open.map(t=>t.date),open.map(t=>t.date).sort());assert.equal(rows.at(-1).done,true);
});
test('Browser-local day uses calendar components rather than UTC date rollover',()=>{
 assert.equal(W.localDay({getFullYear:()=>2026,getMonth:()=>8,getDate:()=>17}),'2026-09-17');
});
test('New workspace destinations are safe in backup history',()=>{
 for(const route of ['plan','readiness','studios','websites'])assert.equal(W.route('#/'+route+'?campaign=CP-1'),'#/'+route+'?campaign=CP-1');
 assert.equal(W.route('https://attacker.invalid/plan'),'#/home');
});
console.log(JSON.stringify({passed:true,checks}));
