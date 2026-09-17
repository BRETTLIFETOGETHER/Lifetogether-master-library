import {printRuntime} from './print-runtime.mjs';
import {signedWebhook} from './print-checkout-core.mjs';
// Netlify returns 202 immediately, then retries thrown failures after one and two minutes.
export const createPaidWorker = runtime => async request=>{
 const {env,store,service}=runtime();
 if(request.method!=='POST')return;
 const raw=await request.text();
 if(raw.length>256||!signedWebhook(raw,request.headers.get('x-print-signature'),env.SHOPIFY_WEBHOOK_SECRET))return;
 const {eventId}=JSON.parse(raw);if(!/^[a-f0-9]{64}$/.test(eventId||''))return;
 const key='payment-events/'+eventId,event=await store.get(key,{type:'json'});
 if(!event||event.state==='processed')return;
 try{
  const result=await service.paid(event.order);
  await store.setJSON(key,{state:'processed',receivedAt:event.receivedAt,completedAt:new Date().toISOString(),result});
 }catch(e){
  await store.setJSON(key,{...event,attempts:(event.attempts||0)+1,lastError:e.status<500?e.message:'Provider connection failed; retry or staff reconciliation required.'});
  throw Error('Print payment processing requires retry; event '+eventId);
 }
};
export default createPaidWorker(printRuntime);
export const config={background:true};
