// Pure workspace logic. Personal content is separate from the immutable catalog.
const LTWorkspace = (() => {
  const schema='lifetogether-site-workspace-v1', backupSchema='lifetogether-full-backup-v1';
  const clean=(v,n=1000)=>String(v??'').slice(0,n), clone=v=>JSON.parse(JSON.stringify(v));
  const safeKey=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
  const unique=(a,key)=>new Set(a.map(key)).size===a.length;
  const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function empty(){return {schema,revision:'',church:{},sermons:[],collections:[],notes:{},searches:[],events:[],recent:[],survey:{},preferences:{largeText:false,highContrast:false,reduceMotion:false,focus:false},lastBackup:''};}
  function church(raw,C){const out={};for(const [k,v] of Object.entries(C.create().profile)){if(['launchDate','objective','nextStep','catalytic','stories','multiplication','champions'].includes(k))continue;if(raw?.[k]!==undefined)out[k]=typeof v==='number'?C.number(raw[k],0,100000):clean(raw[k],4000);}if(out.goal&&!Object.hasOwn(C.goals,out.goal))delete out.goal;if(out.duration&&!C.durations.includes(out.duration))delete out.duration;if(out.groupSize!==undefined)out.groupSize=C.number(out.groupSize,1,100);if(out.participation!==undefined)out.participation=C.number(out.participation,0,100);return out;}
  function route(v){const s=clean(v,3000);return /^#\/(home|search|catalog|record|archive|asset|projects|project|ecosystem|website|initiative|intelligence|source|sources|survey|results|collection|campaigns|campaign-finder|sermons|church|notebook|calendar|settings|help)(?:[/?]|$)/.test(s)?s:'#/home';}
  function validate(raw,C,knownIds){
    if(!raw||raw.schema!==schema)throw Error('Choose a LifeTogether workspace file.');
    const out=empty();out.revision=clean(raw.revision,100);out.church=church(raw.church,C);
    const arrays={sermons:200,collections:50,searches:40,events:300,recent:12};
    for(const [name,max] of Object.entries(arrays)){if(!Array.isArray(raw[name])||raw[name].length>max)throw Error('Invalid or oversized '+name+' list.');}
    out.sermons=raw.sermons.map(s=>{if(!s||!safeKey(s.id)||!String(s.title||'').trim()||String(s.notes||'').length>60000)throw Error('A sermon is invalid or too long.');return {...C.source(s),layer:'pastor',archived:!!s.archived};});
    out.collections=raw.collections.map(g=>{if(!safeKey(g.id)||!String(g.name||'').trim()||!Array.isArray(g.ids)||g.ids.length>5000)throw Error('A collection is invalid.');return {id:g.id,name:clean(g.name,120),description:clean(g.description,1000),ids:[...new Set(g.ids.filter(x=>typeof x==='string'&&(!knownIds||knownIds.has(x))))],archived:!!g.archived};});
    out.searches=raw.searches.map(s=>{if(!safeKey(s.id)||!String(s.name||'').trim())throw Error('A saved search is invalid.');return {id:s.id,name:clean(s.name,100),route:route(s.route)};});
    out.events=raw.events.map(e=>{if(!safeKey(e.id)||!String(e.title||'').trim()||!C.date(e.start)||!C.date(e.end||e.start)||(e.end||e.start)<e.start)throw Error('A church event has an invalid date range.');return {id:e.id,title:clean(e.title,200),start:e.start,end:e.end||e.start,kind:e.kind==='avoid'?'avoid':'event',notes:clean(e.notes,1500),archived:!!e.archived};});
    for(const k of ['sermons','collections','searches','events'])if(!unique(out[k],x=>x.id))throw Error('Duplicate '+k+' identifiers.');
    if(!raw.notes||typeof raw.notes!=='object'||Array.isArray(raw.notes)||Object.keys(raw.notes).length>2000)throw Error('Invalid notebook.');
    for(const [id,n] of Object.entries(raw.notes)){if(!safeKey(id)||!n||!['object'].includes(typeof n))throw Error('Invalid note.');if(knownIds&&!knownIds.has(id))continue;out.notes[id]={text:clean(n.text,12000),tags:[...new Set((Array.isArray(n.tags)?n.tags:[]).map(t=>clean(t,40).trim()).filter(Boolean))].slice(0,12),status:['unreviewed','reading','reviewed','followup'].includes(n.status)?n.status:'unreviewed',updatedAt:clean(n.updatedAt,50)};}
    out.recent=raw.recent.map(r=>({route:route(r.route),title:clean(r.title,200),at:clean(r.at,50)}));
    for(const k of Object.keys(out.preferences))out.preferences[k]=raw.preferences?.[k]===true;
    for(const k of ['audience','goal','duration','label','mission','stage','edition'])if(raw.survey?.[k]!==undefined)out.survey[k]=clean(raw.survey[k],2000);
    out.lastBackup=clean(raw.lastBackup,50);return out;
  }
  function sermonKey(s){return [s.title,s.subtitle,s.speaker,s.date,s.notes,s.bigIdea,s.practice,s.scripture,s.url,s.permission].map(fold).join('\u001f');}
  function mergeSermons(existing,incoming,C){const result=existing.map(clone),keys=new Set(result.map(sermonKey));let added=0,skipped=0;for(const value of incoming){const s={...C.source(value),layer:'pastor',archived:false},key=sermonKey(s);if(keys.has(key)){skipped++;continue;}if(result.length>=200)throw Error('Keep up to 200 sermons in the personal library.');s.id=C.id();result.push(s);keys.add(key);added++;}return {sermons:result,added,skipped};}
  function sourceCopy(s,C){const out=C.source({...s,id:C.id(),selected:true});out.kind='personal-library:'+s.id;return out;}
  function search(index,query,kind='all'){const terms=fold(query).split(/\s+/).filter(Boolean);if(!terms.length)return[];return index.filter(x=>(kind==='all'||x.kind===kind)&&terms.every(t=>x.search.includes(t))).map(x=>({...x,score:(fold(x.title)===fold(query)?100:fold(x.title).startsWith(fold(query))?30:0)+terms.reduce((n,t)=>n+(fold(x.title).includes(t)?5:0),0)})).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));}
  function timeline(campaigns,events,C){return [...campaigns.filter(c=>C.date(c.profile.launchDate)).map(c=>({id:c.id,title:c.title||'Untitled campaign',start:c.profile.launchDate,end:C.date(c.profile.launchDate,c.profile.duration-1),kind:'campaign',route:'#/campaigns/'+encodeURIComponent(c.id)+'?step=launch'})),...events.filter(e=>!e.archived).map(e=>({...e,route:'#/calendar?year='+e.start.slice(0,4)}))].sort((a,b)=>a.start.localeCompare(b.start));}
  function conflicts(items){const out=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if((a.kind==='campaign'||b.kind==='campaign')&&a.start<=b.end&&b.start<=a.end)out.push({a,b});}return out;}
  function ics(items,C){const esc=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LifeTogether//Church Calendar//EN','CALSCALE:GREGORIAN',...items.flatMap(e=>['BEGIN:VEVENT','UID:'+esc(e.id)+'@lifetogether.local','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+e.start.replace(/-/g,''),'DTEND;VALUE=DATE:'+C.date(e.end,1).replace(/-/g,''),'SUMMARY:'+esc(e.title),'DESCRIPTION:'+esc(e.kind==='campaign'?'Campaign dates':e.notes||''),'END:VEVENT']),'END:VCALENDAR'];return lines.map(l=>{const parts=[];let part='';for(const ch of l){if(new TextEncoder().encode(part+ch).length>73){parts.push(part);part=' '+ch;}else part+=ch;}return [...parts,part].join('\r\n');}).join('\r\n')+'\r\n';}
  function validateBackup(raw,C,knownIds){
    if(!raw||raw.schema!==backupSchema||!Array.isArray(raw.campaigns)||raw.campaigns.length>25||!Array.isArray(raw.shelf)||raw.shelf.length>65000)throw Error('Choose a valid full workspace backup.');
    const site=validate(raw.site,C,knownIds),campaigns=raw.campaigns.map(r=>{if(!safeKey(r.id))throw Error('Invalid campaign identifier.');const c=C.importCampaign(r);c.id=r.id;c.createdAt=clean(r.createdAt,50);c.updatedAt=clean(r.updatedAt,50);return c;});
    if(!unique(campaigns,c=>c.id))throw Error('Duplicate campaign identifiers.');
    const shelf=[...new Set(raw.shelf.filter(id=>typeof id==='string'&&(!knownIds||knownIds.has(id))))];
    return {site,campaigns,shelf,activeId:campaigns.some(c=>c.id===raw.activeId)?raw.activeId:'',compare:(Array.isArray(raw.compare)?raw.compare:[]).filter(id=>shelf.includes(id)||knownIds?.has(id)).slice(0,4)};
  }
  function writeTransaction(storage,entries){const old=entries.map(([k])=>[k,storage.getItem(k)]),written=[];try{for(const [k,v] of entries){storage.setItem(k,v);written.push(k);}}catch(err){for(const [k,v] of old)if(written.includes(k)){if(v===null)storage.removeItem(k);else storage.setItem(k,v);}throw Error('Restore could not fit on this device. The previous workspace was retained.');}}
  return {schema,backupSchema,empty,validate,church,route,fold,clone,safeKey,sermonKey,mergeSermons,sourceCopy,search,timeline,conflicts,ics,validateBackup,writeTransaction};
})();
if(typeof module!=='undefined')module.exports=LTWorkspace;
