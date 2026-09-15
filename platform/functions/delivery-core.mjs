import {randomUUID,randomBytes,createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function validateCampaign(body,now=Date.now()){
 if(!['email','sms'].includes(body.channel))throw Error('Choose email or SMS.');if(!String(body.title||'').trim())throw Error('Give the campaign a title.');
 if(!Array.isArray(body.messages)||!body.messages.length||body.messages.length>90)throw Error('Use 1–90 scheduled messages.');
 const messages=body.messages.map((m,i)=>{const at=new Date(m.at);if(!Number.isFinite(at.getTime())||at.getTime()<=now)throw Error('Every send time must be in the future.');const content=String(m.body||'').trim(),subject=String(m.subject||'').trim();if(!content||content.length>(body.channel==='sms'?1000:30000))throw Error(body.channel==='sms'?'Keep each text to 1–1,000 characters.':'Keep each email to 1–30,000 characters.');if(body.channel==='email'&&(!subject||subject.length>200))throw Error('Each email needs a subject of 1–200 characters.');return {id:randomUUID(),at:at.toISOString(),body:content,subject};});
 return {id:randomUUID(),title:String(body.title).trim().slice(0,200),channel:body.channel,messages,status:'draft',createdAt:new Date(now).toISOString()};
}
export function newSubscription(user,workspace){return {id:digest(workspace+'|'+user.id),workspace,user:user.id,email:user.email,emailOptIn:false,smsOptIn:false,token:randomBytes(32).toString('base64url')};}
export async function runDelivery({campaigns,subscriptions,workspace,claim,record,send,enabled,now=Date.now()}){
 const results=[];if(!enabled)return results;
 for(const c of campaigns){if(c.status!=='scheduled')continue;const ws=await workspace(c.workspace);if(!ws||!['owner','editor'].includes(ws.members[c.author]?.role))continue;
  for(const m of c.messages){if(Date.parse(m.at)>now)continue;for(const s of subscriptions.filter(x=>x.workspace===c.workspace&&ws.members[x.user]&&(c.channel==='email'?x.emailOptIn:x.smsOptIn))){
   // Do not send missed messages to people who subscribed after the intended send time.
   if(!s[c.channel+'ConsentedAt']||Date.parse(s[c.channel+'ConsentedAt'])>Date.parse(m.at))continue;
   const key=`${c.id}/${m.id}/${s.id}`;if(!(await claim(key,{state:'processing',at:new Date(now).toISOString(),campaign:c.id,message:m.id,subscriber:s.id})))continue;
   try{const result=await send(c,m,s,key);await record(key,{state:'accepted',providerId:result.id,channel:c.channel,at:new Date(now).toISOString(),campaign:c.id,message:m.id,subscriber:s.id});results.push({key,state:'accepted'});}catch(e){await record(key,{state:'needs-review',error:String(e.message).slice(0,200),channel:c.channel,at:new Date(now).toISOString(),campaign:c.id,message:m.id,subscriber:s.id});results.push({key,state:'needs-review'});}
  }}
 }
 return results;
}
