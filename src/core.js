'use strict';
const LTCore = (()=>{
const text=r=>[r['Campaign Title'],r.Subtitle,r.Category,r['Best For / Audience'],r['Core Felt Need / Theme'],r['Format / Product Type']].join(' ').toLowerCase();
const blocked=r=>(r._section!==undefined&&r._section!==1)||/^yes/i.test(r['Do Not Send to AI Yet?']||'') || /do not build|removed|reference only|market benchmark|park for later/i.test([r['Build Decision'],r['Source Item Type'],r.Notes].join(' ')) || r['Priority Grade']==='REFERENCE';
const rank=r=>({'AA':5,'A':4,'A or AA':4,'B':2,'C':1,'D':0}[r['Priority Grade']]||0);
const norm=s=>String(s||'').toLowerCase().replace(/[™®]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const themes={legacy:['legacy','heir','generation','inheritance','family story'],generosity:['generos','giving','steward'],community:['belong','community','together','connection','small group'],formation:['discipleship','spiritual growth','formation','faith'],leadership:['leader','calling','purpose','vision'],peace:['peace','anxiety','resilience','rest'],money:['money','financial','debt','margin'],scripture:['jesus','christ','bible','scripture','red letter']};
const audiences={pastor:['church','pastor','congregation','churchwide'],family:['family','families','legacy','heirs','couple','parent'],advisor:['advisor','client','wealth','practice'],workplace:['workplace','business','employee','team','owner']};
function recommend(records,profile){
 return records.filter(r=>!blocked(r)).map(r=>{
  const t=text(r),a=(audiences[profile.audience]||[]).filter(w=>t.includes(w)),g=(themes[profile.goal]||[]).filter(w=>t.includes(w));
  if(!a.length||!g.length)return null;
  const d=new RegExp('\\b'+profile.duration+'[ -]?(day|days)\\b','i').test(t);
  const score=a.length*3+g.length*5+rank(r)+(d?5:0);
  return {id:r['Master ID'],score,reasons:[`Audience terms: ${a.slice(0,3).join(', ')}`,`Goal terms: ${g.slice(0,3).join(', ')}`,d?`${profile.duration}-day format mentioned in source`:'Duration requires editorial confirmation']};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,12);
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csv=rows=>rows.map(row=>row.map(x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');
return {text,blocked,rank,norm,themes,audiences,recommend,escape,csv};
})();
if(typeof module!=='undefined')module.exports=LTCore;
