import {getStore} from '@netlify/blobs';import {runDelivery} from './delivery-core.mjs';
export const config={schedule:'*/15 * * * *'};
export default async()=>{
 if(process.env.CAMPAIGN_DELIVERY_ENABLED!=='true')return new Response('Campaign delivery is off.');
 const store=getStore({name:'lifetogether-delivery-v1',consistency:'strong'}),platform=getStore({name:'lifetogether-platform-v1',consistency:'strong'}),campaigns=[],subscriptions=[];
 for(const [prefix,target] of [['campaigns/',campaigns],['subscribers/',subscriptions]]){for await(const page of store.list({prefix,paginate:true})){for(const b of page.blobs)target.push(await store.get(b.key,{type:'json'}));}}
 const results=await runDelivery({campaigns,subscriptions,enabled:true,workspace:id=>platform.get('workspaces/'+id,{type:'json'}),claim:async(key,data)=>(await store.setJSON('attempts/'+key,data,{onlyIfNew:true})).modified,record:(key,data)=>store.setJSON('attempts/'+key,data),send:async(c,m,s,key)=>{
  // Recheck current consent and cancellation immediately before crossing the provider boundary.
  const latest=await store.get('campaigns/'+c.id,{type:'json'}),subscriber=await store.get('subscribers/'+s.id,{type:'json'});if(latest?.status!=='scheduled'||!subscriber?.[c.channel+'OptIn'])throw Error('Canceled or unsubscribed before dispatch.');
  const unsubscribe=(process.env.URL||'https://lifetogether-doing-church-together.netlify.app')+'/.netlify/functions/delivery?unsubscribe='+s.id+'&token='+encodeURIComponent(s.token),text=m.body+'\n\nStop these messages: '+unsubscribe;
  let r;if(c.channel==='email'){
   if(!process.env.RESEND_API_KEY||!process.env.CAMPAIGN_FROM_EMAIL)throw Error('Email sender is not configured.');
   r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:process.env.CAMPAIGN_FROM_EMAIL,to:[s.email],subject:m.subject,text}),signal:AbortSignal.timeout(15000)});
  }else{
   if(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_MESSAGING_SERVICE_SID)throw Error('SMS sender is not configured.');
   r=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)+'/Messages.json',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(process.env.TWILIO_ACCOUNT_SID+':'+process.env.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:s.phone,MessagingServiceSid:process.env.TWILIO_MESSAGING_SERVICE_SID,Body:text+'\nReply STOP to opt out.'}),signal:AbortSignal.timeout(15000)});
  }
  const d=await r.json().catch(()=>({}));if(!r.ok){if(d.code===21610)await store.setJSON('subscribers/'+s.id,{...subscriber,smsOptIn:false,unsubscribedAt:new Date().toISOString()});throw Error('Provider rejected the request. Review the sender dashboard before any manual retry.');}return {id:d.id||d.sid};
 }});return Response.json({processed:results.length});
};
