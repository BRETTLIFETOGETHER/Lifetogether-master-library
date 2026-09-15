/* Evidence-based discovery shared by the master library and all ministry sites. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LTDiscovery=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const durations=[7,10,21,30,40,60,90];
 const modes={church:'Churchwide campaign',groups:'Small group',class:'Ministry class / ABF',family:'Family journey',workplace:'Workplace journey'};
 const goals={community:'Belonging & community',formation:'Faith & formation',generosity:'Generosity & stewardship',legacy:'Family & legacy',leadership:'Purpose & leadership',peace:'Hope & resilience',mission:'Outreach & mission',scripture:'Life & teaching of Jesus'};
 const fields=[
  {key:'mode',title:'Who will take this journey?',help:'The questions and planning language will follow your setting.',options:Object.entries(modes)},
  {key:'goal',title:'What change matters most?',help:'Choose your first priority. You can change it at any time.',options:Object.entries(goals)},
  {key:'duration',title:'How much time do you have?',help:'A source must explicitly name a duration to earn a duration match.',options:durations.map(n=>[String(n),n+' days'])},
  {key:'experience',title:'How much guidance will your leaders need?',help:'This records your preference; unknown difficulty stays unknown.',options:[['beginner','A simple first experience'],['intermediate','Some experience leading'],['advanced','Experienced teachers and leaders']]},
  {key:'video',title:'How would you like to teach?',help:'Only verified media links count as available video.',options:[['any','Flexible'],['yes','Video would help'],['no','Prefer a reading or discussion experience']]},
  {key:'customization',title:'How much would you like to personalize?',help:'We will show whether a finished, approved edition is actually available.',options:[['ready','Use an approved edition'],['personalize','Add our name, story and context'],['sermons','Build from our sermons']]},
  {key:'season',title:'What season are you planning for?',options:[['any','Any season'],['easter','Easter'],['fall','Fall launch'],['advent','Advent / Christmas'],['summer','Summer'],['new year','New year']]},
  {key:'size',title:'How many people are you planning for?',help:'Recorded for your launch plan. No suitability is assumed when a source gives no size guidance.',options:[['under100','Fewer than 100'],['100-499','100–499'],['500-1999','500–1,999'],['2000plus','2,000 or more']]},
  {key:'scripture',title:'Is there a Scripture you want to explore?',help:'Enter a Bible book, passage or character. Matches identify mentions in the source.',placeholder:'For example: John 15, Ruth, or Nehemiah'},
  {key:'minutes',title:'How long can your group meet?',options:[['30','30 minutes'],['45','45 minutes'],['60','60 minutes'],['90','90 minutes']]},
  {key:'alignment',title:'Should groups follow the weekend sermon?',options:[['any','Flexible'],['yes','Keep sermon and group themes together'],['no','Use a separate group journey']]},
  {key:'mission',title:'What is your church, family or team here to do?',help:'Your own words will travel into the planning brief.',placeholder:'Our mission and values…'},
  {key:'context',title:'What should this journey understand about your people?',placeholder:'Recent challenges, strengths, hopes…'},
  {key:'nextStep',title:'What should happen after this journey?',options:[['continue','Continue meeting together'],['serve','Begin serving'],['invite','Invite others'],['lead','Develop new leaders'],['practice','Establish a daily practice']]}
 ];
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const has=(hay,needle)=>(' '+norm(hay)+' ').includes(' '+norm(needle)+' ');
 function metadata(r){const raw=r.metadata||{},search=r.search||[r.title,r.subtitle,r.category,r.format].join(' ');return {...raw,search,video:raw.video===true||raw.video===false?raw.video:null,seasons:raw.seasons||['easter','fall','advent','christmas','summer','new year'].filter(x=>has(search,x)),scripture:raw.scripture||''}}
 function matches(r,p={}){
  const m=metadata(r),reasons=[],unknown=[],score=[];
  const add=(value,reason)=>{score.push(value);reasons.push(reason)};
  if(p.goal){if((r.goals||[]).includes(p.goal))add(30,'Source theme matches '+(goals[p.goal]||p.goal));else unknown.push('Your main goal is not tagged in this source')}
  if(p.duration){if((r.durations||[]).includes(Number(p.duration)))add(20,p.duration+' days explicitly named in the source');else if(!r.durations?.length)unknown.push('Source duration is not stated');else unknown.push('Your chosen length would need an adaptation')}
  const audienceTerms={church:['church','churchwide','congregation'],groups:['small group','group'],class:['class','abf','bible study'],family:['family','families','household'],workplace:['workplace','business','team','marketplace']};
  if(p.mode){if((audienceTerms[p.mode]||[]).some(x=>has(m.search,x)))add(15,'Source mentions your '+modes[p.mode].toLowerCase()+' setting');else unknown.push('Audience fit needs review')}
  if(p.scripture){if(has(m.search+' '+m.scripture,p.scripture))add(25,'Source mentions '+p.scripture);else unknown.push('Requested Scripture is not confirmed')}
  if(p.season&&p.season!=='any'){if(m.seasons.includes(p.season)||(p.season==='advent'&&m.seasons.includes('christmas')))add(10,'Source mentions '+p.season);else unknown.push('Season fit is not confirmed')}
  for(const [key,label] of [['experience','Difficulty'],['size','Group / church size'],['minutes','Meeting length'],['alignment','Sermon alignment']])if(p[key]&&p[key]!=='any'){if(m[key]===p[key])add(5,label+' matches verified metadata');else if(!m[key])unknown.push(label+' not supplied');else unknown.push(label+' differs from your preference')}
  if(p.video&&p.video!=='any'){if(m.video===(p.video==='yes'))add(10,p.video==='yes'?'Verified video is available':'A text-only format is confirmed');else if(m.video===null)unknown.push('Video availability is not verified');else unknown.push('Media format differs from your preference')}
  if(p.customization==='ready'&&!r.approvedPackage)unknown.push('A complete approved edition is not connected');
  return {...r,matchScore:score.reduce((a,b)=>a+b,0),matchReasons:reasons,missing:[...new Set(unknown)]};
 }
 function search(records,p={},filters={}) {return records.filter(r=>!r.restricted).map(r=>matches(r,p)).filter(r=>{
  const m=metadata(r);return (!filters.q||norm(filters.q).split(' ').every(w=>norm(m.search).includes(w)))&&(!filters.video||m.video===(filters.video==='yes'))&&(!filters.season||m.seasons.includes(filters.season))&&(!filters.scripture||has(m.search+' '+m.scripture,filters.scripture))&&(!filters.experience||m.experience===filters.experience)&&(!filters.minutes||m.minutes===filters.minutes)&&(!filters.size||m.size===filters.size)&&(!filters.alignment||m.alignment===filters.alignment)&&(!filters.customization||m.customization===filters.customization)
 }).sort((a,b)=>b.matchScore-a.matchScore||a.title.localeCompare(b.title))}
 function schedule(days,start='',sessions){days=Number(days);if(!durations.includes(days))throw Error('Unsupported duration.');const count=sessions==null?({7:2,10:2,21:3,30:4,40:6,60:9,90:13}[days]):Number(sessions);if(!Number.isInteger(count)||count<1||count>days)throw Error('Sessions must be between 1 and the journey length.');const parsed=start?new Date(start+'T12:00:00Z'):null;if(parsed&&(Number.isNaN(+parsed)||parsed.toISOString().slice(0,10)!==start))throw Error('Choose a valid start date.');return Array.from({length:count},(_,i)=>{const day=count===({7:2,10:2,21:3,30:4,40:6,60:9,90:13}[days])?Math.min(i*7+1,days):Math.floor(i*days/count)+1,d=parsed?new Date(+parsed+(day-1)*86400000):null;return {session:i+1,day,date:d?d.toISOString().slice(0,10):'',label:i===0?'Kickoff':i===count-1?'Celebration & next steps':'Gathering '+(i+1)}})}
 function shortlist(current,id){if(current.includes(id))return current.filter(x=>x!==id);if(current.length>=3)throw Error('Keep up to three campaigns. Remove one before adding another.');return [...current,id]}
 return {durations,modes,goals,fields,metadata,matches,search,schedule,shortlist};
});
