import {randomUUID} from 'node:crypto';
import {PrintError,digest,money,publicOrder} from './print-checkout-core.mjs';
import L from '../../netlify/functions/lulu-core.cjs';
export function staffAccess(env,owner,now=Date.now()){
 const expires=Date.parse(env.LULU_STAFF_ACCESS_EXPIRES||'');
 return !!owner&&/^[a-f0-9]{64}$/.test(env.LULU_STAFF_SESSION_HASH||'')&&env.LULU_STAFF_SESSION_HASH===owner&&expires>now&&expires<=now+86400000;
}
export function staffReady(env,owner,now=Date.now()){
 return staffAccess(env,owner,now)&&env.LULU_STAFF_PROOFS_ENABLED==='true'&&env.LULU_API_ENVIRONMENT==='production'&&!!env.LULU_CLIENT_KEY&&!!env.LULU_CLIENT_SECRET;
}
export function createStaffProof({env,store,lulu,service,now=()=>Date.now()}){
 const read=k=>store.get(k,{type:'json'});
 function guard(owner){if(!staffReady(env,owner,now()))throw new PrintError('An administrator must approve this browser for a production test copy first.',403);}
 async function prepare(body,owner){
  guard(owner);
  const v=await service.validate(body,owner);if(!v.valid)throw new PrintError('Both uploaded PDFs must pass Lulu checks before ordering.',409);
  const payload={...body,line_item:{...body.line_item,page_count:v.pages,pod_package_id:v.format,interior_url:v.files[0].url,cover_url:v.files[1].url}};
  const clean=L.quotePayload(payload);if(clean.line_items[0].quantity!==1||clean.currency!=='USD')throw new PrintError('Staff test orders are limited to one copy in USD.');
  const quote=await lulu('/print-job-cost-calculations/',{method:'POST',body:clean}),amount=money(quote.total_cost_incl_tax);
  if(quote.currency!=='USD'||amount<1||amount>10000)throw new PrintError('Test orders must total $100 or less. Contact the team for other orders.');
  if(amount!==money(body.expected_total))throw new PrintError('The price changed. Calculate a new estimate before reviewing your order.',409);
  const id=randomUUID(),row={id,owner,title:String(body.line_item?.title||'Test book').slice(0,200),quantity:1,currency:'USD',amount,createdAt:new Date(now()).toISOString(),reviewExpiresAt:now()+15*60000,status:'awaiting_staff_confirmation',method:'staff_lulu',payload:{...payload,external_id:'LT-'+id}};
  L.orderPayload(row.payload,env.LULU_CONTACT_EMAIL);
  await store.setJSON('orders/'+id,row);await store.setJSON('owner-orders/'+owner+'/'+id,{id});
  return {...publicOrder(row),delivery:clean.shipping_address,shipping:clean.shipping_option,reviewExpiresAt:row.reviewExpiresAt};
 }
 async function submit(body,owner){
  guard(owner);if(body.confirm!==true)throw new PrintError('Review and explicitly confirm the Lulu charge.');
  const row=await read('orders/'+body.id);if(!row||row.owner!==owner||row.method!=='staff_lulu')throw new PrintError('Test order not found.',404);
  if(row.status!=='awaiting_staff_confirmation')return publicOrder(row);
  if(row.reviewExpiresAt<now()||money(body.confirmed_total)!==row.amount)throw new PrintError('Review a fresh estimate before confirming.',409);
  const v=await service.validate(row.payload,owner);if(!v.valid)throw new PrintError('The PDFs need attention. No order was submitted.',409);
  const quote=await lulu('/print-job-cost-calculations/',{method:'POST',body:L.quotePayload(row.payload)});
  if(quote.currency!=='USD'||money(quote.total_cost_incl_tax)>row.amount)throw new PrintError('The price increased. Review a fresh estimate before ordering.',409);
  // One printer submission per administrator-approved browser grant, even on concurrent requests.
  const grant='staff-proof-grants/'+digest(owner+':'+env.LULU_STAFF_ACCESS_EXPIRES);
  const claim=await store.setJSON(grant,{orderId:row.id,claimedAt:new Date(now()).toISOString()},{onlyIfNew:true});
  if(!claim.modified){const prior=await read(grant);if(prior?.orderId===row.id)return publicOrder(await read('orders/'+row.id));throw new PrintError('This staff approval has already been used. Check Your print orders before requesting another.',409);}
  row.status='submitting_to_printer';row.message='Sending your test copy to Lulu. Your Lulu account handles printing and shipping charges.';await store.setJSON('orders/'+row.id,row);
  try{
   const job=await lulu('/print-jobs/',{method:'POST',body:L.orderPayload(row.payload,env.LULU_CONTACT_EMAIL)});if(!job.id)throw Error('Missing job ID');
   row.luluId=String(job.id);row.status='submitted';row.message='Lulu received your test copy order. Printing starts after Lulu billing and file checks complete. No Shopify payment is involved.';
  }catch{row.status='fulfillment_needs_review';row.message='The Lulu response was uncertain. Staff must check the Lulu dashboard before retrying; this approval cannot submit a second order.';}
  await store.setJSON('orders/'+row.id,row);return publicOrder(row);
 }
 return {prepare,submit};
}
