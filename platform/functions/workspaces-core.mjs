import {randomUUID,randomBytes,createHash} from 'node:crypto';
export class ApiError extends Error {constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new ApiError(status,message)};
const text=(v,n=200)=>String(v??'').trim().slice(0,n);
const id=v=>/^[a-zA-Z0-9-]{1,80}$/.test(v||'')?v:fail(400,'Invalid identifier.');
const hash=v=>createHash('sha256').update(v).digest('hex');
const kinds=new Set(['church','family','team','circle','advisor']);
const types=new Set(['profile','campaign','questionnaire','source','edition','service','calendar','tool','reflection','progress','ministry','referral','contribution','outcome']);
const eventTypes=new Set(['campaign_saved','reader_started','day_completed','circle_created','invitation_created','invitation_accepted','leader_reused','church_handoff']);
const roles=new Set(['editor','member','viewer']);
export function createService(store,clock=()=>new Date()) {
 const now=()=>clock().toISOString();
 async function read(key){return store.getWithMetadata(key,{type:'json'})}
 async function create(key,data){const r=await store.setJSON(key,data,{onlyIfNew:true});if(!r.modified)fail(409,'Already created. Reload and try again.');return r}
 async function write(key,data,etag){const r=await store.setJSON(key,data,{onlyIfMatch:etag});if(!r.modified)fail(409,'Someone saved a newer version. Reload before saving your changes.');return r}
 async function account(uid,wid){const key='accounts/'+uid;for(let i=0;i<4;i++){const r=await read(key),data=r?.data||{workspaces:[]};if(data.workspaces.includes(wid))return;data.workspaces.push(wid);const saved=await store.setJSON(key,data,r?{onlyIfMatch:r.etag}:{onlyIfNew:true});if(saved.modified)return}fail(409,'Workspace saved. Open its link to reconnect it to your account.')}
 async function workspace(wid,user){const r=await read('workspaces/'+id(wid));if(!r||!r.data.members[user.id])fail(404,'Workspace not found or access was removed.');return r}
 function visible(doc,user,role){return doc.visibility==='workspace'||doc.owner===user.id}
 function view(w,user){const role=w.members[user.id].role;return {...w,members:Object.fromEntries(Object.entries(w.members).map(([k,m])=>[k,{name:m.name,role:m.role}])),invites:role==='owner'?w.invites.map(({tokenHash,...v})=>v):[],shares:role==='owner'?w.shares.map(({tokenHash,...v})=>v):[],documents:w.documents.filter(d=>visible(d,user,role)),events:w.events.filter(e=>role==='owner'||e.actor===user.id)}}
 function edit(w,user){if(!['owner','editor'].includes(w.members[user.id]?.role))fail(403,'An owner or editor must make this change.')}
 function owner(w,user){if(w.members[user.id]?.role!=='owner')fail(403,'Only the workspace owner can change access.')}
 function validateDocument(input,old,user){
  if(!types.has(input.type))fail(400,'Choose a supported document type.');
  if(!['private','workspace'].includes(input.visibility))fail(400,'Choose who can see this document.');
  if(input.type==='reflection'&&input.visibility!=='private')fail(400,'Personal reflections stay private.');
  if(!input.title?.trim())fail(400,'Give this item a title.');
  if(JSON.stringify(input.content).length>150000)fail(413,'This item is too large. Split it into smaller documents.');
  if(!input.content||typeof input.content!=='object'||Array.isArray(input.content))fail(400,'Document content must be an object.');
  if(old?.type==='edition'&&old.content?.protectedCore!==input.content.protectedCore&&input.content.mode!=='full-custom')fail(403,'The protected teaching core cannot be changed in this edition mode.');
  if(input.content.recipe==='reader'){const c=input.content;if(!Array.isArray(c.days)||!c.days.length||c.days.length>90)fail(400,'A reading edition must contain 1–90 days.');if(c.status==='Approved internally'&&(!c.reviewer||c.days.some(d=>!d.title||!d.scripture||!d.body)))fail(400,'Complete every reading and name the reviewer before approval.');}
  if(input.type==='contribution'&&input.content.status==='published')fail(400,'Public publishing requires the separate editorial release workflow.');
  return {id:old?.id||randomUUID(),type:input.type,title:text(input.title),visibility:input.visibility,content:input.content,owner:old?.owner||user.id,createdAt:old?.createdAt||now(),updatedAt:now(),version:(old?.version||0)+1,history:[...(old?.history||[]),...(old?[{version:old.version,at:old.updatedAt,content:old.content}]:[])].slice(-8)};
 }
 return async function service(action,body,user){
  if(action==='shared'){
   const r=await read('workspaces/'+id(body.workspace));if(!r)fail(404,'Shared brief unavailable.');
   const share=r.data.shares.find(s=>!s.revoked&&s.expiresAt>now()&&s.tokenHash===hash(text(body.token,150)));
   if(!share)fail(404,'This link expired or was revoked.');return {title:share.title,document:share.snapshot,expiresAt:share.expiresAt};
  }
  if(!user?.id)fail(401,'Sign in to open your shared workspace.');
  if(action==='list') {const a=await read('accounts/'+user.id);const workspaces=[];for(const wid of a?.data.workspaces||[]){const r=await read('workspaces/'+wid);if(r?.data.members[user.id])workspaces.push({id:wid,name:r.data.name,kind:r.data.kind,role:r.data.members[user.id].role,updatedAt:r.data.updatedAt})}return {workspaces,user:{id:user.id,name:user.name,email:user.email}}}
  if(action==='create'){
   const name=text(body.name);if(!name||!kinds.has(body.kind))fail(400,'Enter a name and workspace type.');
   const a=await read('accounts/'+user.id);if((a?.data.workspaces.length||0)>=40)fail(400,'You have reached the workspace limit.');
   const wid=randomUUID(),w={id:wid,name,kind:body.kind,createdAt:now(),updatedAt:now(),members:{[user.id]:{role:'owner',name:text(user.name||user.email)}},documents:[],events:[],invites:[],shares:[]};
   const saved=await create('workspaces/'+wid,w);await account(user.id,wid);return {workspace:view(w,user),etag:saved.etag};
  }
  if(action==='accept'){
   const wid=id(body.workspace),r=await read('workspaces/'+wid);if(!r)fail(404,'Invitation unavailable.');const w=r.data;
   const invite=w.invites.find(s=>!s.revoked&&!s.used&&s.expiresAt>now()&&s.tokenHash===hash(text(body.token,150)));
   if(!invite)fail(404,'Invitation expired or has already been used.');
   if(invite.email!==String(user.email||'').toLowerCase())fail(403,'Sign in with the email address this invitation was created for.');
   if(w.members[user.id])fail(409,'You already belong to this workspace.');
   w.members[user.id]={role:invite.role,name:text(user.name||user.email)};invite.used=now();w.events.push({type:'invitation_accepted',at:now(),actor:user.id});w.updatedAt=now();const saved=await write('workspaces/'+wid,w,r.etag);await account(user.id,wid);return {workspace:view(w,user),etag:saved.etag};
  }
  const r=await workspace(body.workspace,user),w=r.data,role=w.members[user.id].role;
  if(action==='get'){await account(user.id,w.id);return {workspace:view(w,user),etag:r.etag}}
  if(body.etag!==r.etag)fail(409,'A newer version is available. Reload before saving.');
  let result={};
  if(action==='save'){
   const old=body.document?.id?w.documents.find(d=>d.id===body.document.id):null;
   if(body.document?.id&&!old)fail(404,'Document not found.');
   if(role==='viewer')fail(403,'This workspace is read-only for your account.');
   if(old&&!visible(old,user,role))fail(404,'Document not found.');
   if(old&&old.owner!==user.id)edit(w,user);
   if(body.document?.visibility==='workspace'&&role==='member'&&!['progress','outcome'].includes(body.document?.type))fail(403,'Members can save private work and shared progress. Ask an editor to publish shared plans.');
   const doc=validateDocument(body.document||{},old,user);if(old)w.documents[w.documents.indexOf(old)]=doc;else {if(w.documents.length>=300)fail(400,'This workspace has reached its document limit. Export or create another workspace.');w.documents.push(doc)}result.document=doc;
  }else if(action==='invite'){
   owner(w,user);const email=text(body.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!roles.has(body.role))fail(400,'Enter a valid email and role.');
   if(w.invites.filter(i=>!i.revoked&&!i.used&&i.expiresAt>now()).length>=50)fail(400,'Remove an unused invitation first.');
   const token=randomBytes(32).toString('base64url'),inv={id:randomUUID(),email,role:body.role,tokenHash:hash(token),expiresAt:new Date(clock().getTime()+7*86400000).toISOString()};w.invites.push(inv);result.invitation={id:inv.id,token,expiresAt:inv.expiresAt};w.events.push({type:'invitation_created',at:now(),actor:user.id});
  }else if(action==='revoke-invite') {owner(w,user);const inv=w.invites.find(i=>i.id===body.id);if(!inv)fail(404,'Invitation not found.');inv.revoked=now();
  }else if(action==='member') {owner(w,user);if(body.id===user.id)fail(400,'The owner cannot remove or demote themselves.');if(!w.members[body.id])fail(404,'Member not found.');if(body.role==='remove')delete w.members[body.id];else if(roles.has(body.role))w.members[body.id].role=body.role;else fail(400,'Invalid role.');
  }else if(action==='share') {
   edit(w,user);const doc=w.documents.find(d=>d.id===body.id&&d.visibility==='workspace');if(!doc||!['campaign','service','calendar','tool','ministry'].includes(doc.type))fail(400,'Only a shared plan or tool can be shared by link.');
   if(body.confirm!==true)fail(400,'Review the exact document and confirm sharing first.');
   const token=randomBytes(32).toString('base64url'),s={id:randomUUID(),title:doc.title,snapshot:{title:doc.title,type:doc.type,content:doc.content},tokenHash:hash(token),expiresAt:new Date(clock().getTime()+7*86400000).toISOString()};w.shares.push(s);result.share={id:s.id,token,expiresAt:s.expiresAt};
  }else if(action==='revoke-share') {owner(w,user);const s=w.shares.find(x=>x.id===body.id);if(!s)fail(404,'Share not found.');s.revoked=now();
  }else if(action==='event') {if(role==='viewer')fail(403,'Read-only account.');if(!eventTypes.has(body.type))fail(400,'Unsupported event.');w.events.push({type:body.type,at:now(),actor:user.id,reference:text(body.reference,80)});
  }else fail(400,'Unknown action.');
  w.events=w.events.slice(-2000);w.updatedAt=now();if(JSON.stringify(w).length>3000000)fail(413,'Workspace storage limit reached. Export and create another workspace.');
  const saved=await write('workspaces/'+w.id,w,r.etag);return {...result,workspace:view(w,user),etag:saved.etag};
 }
}
