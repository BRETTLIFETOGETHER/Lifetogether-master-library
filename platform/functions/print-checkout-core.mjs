import {createHash, createHmac, timingSafeEqual, randomUUID} from 'node:crypto';
import L from '../../netlify/functions/lulu-core.cjs';

export class PrintError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const digest = text => createHash('sha256').update(text).digest('hex');
export const money = value => {const n=Number(value);if(!Number.isFinite(n)||n<0||n>100000)throw new PrintError('The provider returned an invalid price.',502);return Math.round(n*100);};
export function signedWebhook(raw,signature,secret){
  if(!secret||!signature)return false;
  const actual=Buffer.from(signature,'base64'),expected=createHmac('sha256',secret).update(raw).digest();
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function readiness(env){
  return {production:env.LULU_API_ENVIRONMENT==='production',lulu:!!(env.LULU_CLIENT_KEY&&env.LULU_CLIENT_SECRET),shopify:!!(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.SHOPIFY_STORE_DOMAIN||'')&&env.SHOPIFY_ADMIN_ACCESS_TOKEN&&env.SHOPIFY_WEBHOOK_SECRET),enabled:env.LT_PRINT_CHECKOUT_ENABLED==='true'};
}
export function checkoutReady(env){const r=readiness(env);return r.production&&r.lulu&&r.shopify&&r.enabled;}
export function shopifyAddress(a){const names=a.name.trim().split(/\s+/);return {firstName:names.shift(),lastName:names.join(' ')||'.',company:a.organization||'',address1:a.street1,address2:a.street2||'',city:a.city,provinceCode:a.state_code,countryCode:a.country_code,zip:a.postcode,phone:a.phone_number};}
const normalized=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function sameAddress(a,b){return !!b&&[['street1','address1'],['street2','address2'],['city','city'],['state_code','province_code'],['postcode','zip'],['country_code','country_code']].every(([l,r])=>normalized(a[l])===normalized(b[r]));}
export function publicOrder(o){return {id:o.id,title:o.title,quantity:o.quantity,status:o.status,currency:o.currency,amount:o.checkoutAmount??o.amount,createdAt:o.createdAt,shopifyOrder:o.shopifyNumber,luluId:o.luluId,tracking:o.tracking||[],message:o.message||'',checkoutUrl:o.status==='awaiting_payment'?o.checkoutUrl:undefined};}

export function createPrintCheckout({env,store,lulu,shopify,now=()=>Date.now()}){
  const read=key=>store.get(key,{type:'json'});
  async function owned(id,owner){if(!/^[a-f0-9-]{36}$/.test(id||''))throw new PrintError('Order not found.',404);const o=await read('orders/'+id);if(!o||o.owner!==owner)throw new PrintError('Order not found.',404);return o;}
  async function validatedFile(id,owner,kind){const f=await read('files-meta/'+id);if(!f||f.owner!==owner||f.kind!==kind||f.expiresAt<now()+2*86400000)throw new PrintError('Upload both PDFs in this browser before checkout. Expired uploads must be uploaded again.');return f;}
  async function validate(body,owner){
    const files=await Promise.all(['interior','cover'].map(kind=>validatedFile(body[kind+'_id'],owner,kind)));
    const format=L.pod(body.pod_package_id),pages=files[0].pageCount;
    const results={};
    for(const f of files){const key='validation/'+digest([f.id,format,pages,env.LULU_API_ENVIRONMENT].join(':'));let record=await read(key);
      let result;if(record)result=await lulu(`/validate-${f.kind}/${L.safeJobId(record.id)}/`);else {result=await lulu(`/validate-${f.kind}/`,{method:'POST',body:{source_url:f.url,pod_package_id:format,...(f.kind==='cover'?{interior_page_count:pages}:{})}});if(!result.id)throw new PrintError('Lulu did not return a validation ID.',502);await store.setJSON(key,{id:result.id});}
      results[f.kind]={status:result.status,errors:result.errors||[]};
    }
    return {files,format,pages,results,valid:Object.values(results).every(r=>['VALIDATED','NORMALIZED'].includes(r.status))};
  }
  async function checkout(body,owner){
    if(!checkoutReady(env))throw new PrintError('Customer checkout is not enabled yet. Production Lulu, Shopify, and billing must be connected first.',503);
    const v=await validate(body,owner);if(!v.valid)throw new PrintError('Lulu is still checking your PDFs, or a file needs correction. Refresh the file checks before paying.',409);
    const payload={...body,line_item:{...body.line_item,page_count:v.pages,pod_package_id:v.format,interior_url:v.files[0].url,cover_url:v.files[1].url}};
    const clean=L.quotePayload(payload),quantity=clean.line_items[0].quantity;if(quantity>1000)throw new PrintError('Contact the team for orders above 1,000 copies.');
    const email=String(body.contact_email||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new PrintError('Add your email for the receipt and order updates.');
    const quote=await lulu('/print-job-cost-calculations/',{method:'POST',body:clean});
    if(quote.currency!==clean.currency)throw new PrintError('The quote currency changed. Request a new estimate.',409);
    const amount=money(quote.total_cost_incl_tax);if(amount<1)throw new PrintError('Lulu did not return a payable total.',502);
    if(amount!==money(body.expected_total))throw new PrintError('The print price changed. Request a new estimate before paying.',409);
    const id=randomUUID(),title=String(body.line_item?.title||'My print book').trim().slice(0,200);
    const row={id,owner,title,quantity,currency:clean.currency,amount,createdAt:new Date(now()).toISOString(),status:'preparing_checkout',payload:{...payload,contact_email:email,external_id:'LT-'+id},environment:env.LULU_API_ENVIRONMENT};
    const fingerprint=digest(JSON.stringify({owner,files:v.files.map(f=>f.id),format:v.format,pages:v.pages,address:clean.shipping_address,shipping:clean.shipping_option,quantity,email,amount}));
    // A single active checkout per exact print request. A lost provider response is reviewed, not repeated.
    const claim=await store.setJSON('checkout-claims/'+fingerprint,{id},{onlyIfNew:true});
    if(!claim.modified){const old=await read('checkout-claims/'+fingerprint);const prior=await read('orders/'+old.id);if(prior?.status==='awaiting_payment')return publicOrder(prior);throw new PrintError('This print request already exists. Check Your orders before creating another copy of the same order.',409);}
    await store.setJSON('orders/'+id,row);await store.setJSON('owner-orders/'+owner+'/'+id,{id});
    try{
      const input={email,presentmentCurrencyCode:row.currency,shippingAddress:shopifyAddress(clean.shipping_address),allowDiscountCodesInCheckout:false,acceptAutomaticDiscounts:false,tags:['LifeTogether-Print'],customAttributes:[{key:'lt_print_order',value:id}],note:'Print fulfillment: '+id+'; includes quoted printing, delivery and Lulu fulfillment costs.',lineItems:[{title:title+' — '+quantity+' printed '+(quantity===1?'copy':'copies')+' with delivery',sku:'LT-PRINT-'+id,quantity:1,originalUnitPriceWithCurrency:{amount:(amount/100).toFixed(2),currencyCode:row.currency},requiresShipping:true,taxable:true}],shippingLine:{title:'Lulu '+clean.shipping_option+' (included in print bundle)',priceWithCurrency:{amount:'0.00',currencyCode:row.currency}}};
      const data=await shopify('mutation PrintDraft($input:DraftOrderInput!){draftOrderCreate(input:$input){draftOrder{id invoiceUrl totalPriceSet{presentmentMoney{amount currencyCode}}}userErrors{message}}}',{input});
      const result=data.draftOrderCreate;if(result?.userErrors?.length||!result?.draftOrder?.invoiceUrl)throw new PrintError('Shopify could not prepare checkout. The team must check this request before retrying.',502);
      const d=result.draftOrder,u=new URL(d.invoiceUrl);if(u.protocol!=='https:'||!(u.hostname.endsWith('.shopify.com')||u.hostname===env.SHOPIFY_STORE_DOMAIN||u.hostname===env.SHOPIFY_CHECKOUT_DOMAIN))throw new PrintError('Shopify returned an unexpected checkout destination.',502);
      const total=d.totalPriceSet?.presentmentMoney;if(total?.currencyCode!==row.currency||money(total.amount)<amount)throw new PrintError('Shopify returned an unexpected checkout total.',502);
      Object.assign(row,{status:'awaiting_payment',draftId:d.id,checkoutUrl:u.href,checkoutAmount:money(total.amount)});await store.setJSON('orders/'+id,row);return publicOrder(row);
    }catch(e){await store.setJSON('orders/'+id,{...row,status:'checkout_needs_review',message:'No print job submitted. The team needs to review the Shopify checkout request.'});throw e;}
  }
  async function paid(order){
    const id=order.note_attributes?.find(x=>x.name==='lt_print_order')?.value;if(!/^[a-f0-9-]{36}$/.test(id||''))return {ignored:true};
    const saved=await store.getWithMetadata('orders/'+id,{type:'json'});if(!saved)return {ignored:true};const row=saved.data;
    if(row.status!=='awaiting_payment')return {duplicate:true};
    if(order.financial_status!=='paid'||order.cancelled_at||order.test||(order.presentment_currency||order.currency)!==row.currency||money(order.total_price_set?.presentment_money?.amount??order.total_price)<row.checkoutAmount||!order.line_items?.some(x=>x.sku==='LT-PRINT-'+id&&x.quantity===1))throw new PrintError('Payment does not match the saved print checkout.',409);
    // Verify linkage with the actual draft, not just an editable order attribute.
    const data=await shopify('query VerifyPrintDraft($id:ID!){draftOrder(id:$id){order{id}}}',{id:row.draftId});
    if(data.draftOrder?.order?.id!=='gid://shopify/Order/'+order.id)throw new PrintError('Payment is not linked to this print draft.',409);
    const updated={...row,shopifyOrder:String(order.id),shopifyNumber:String(order.name||order.id),status:'paid_needs_review',message:'Payment received. The print team is checking your order.'};
    const claim=await store.setJSON('orders/'+id,updated,{onlyIfMatch:saved.etag});if(!claim.modified)return {duplicate:true};
    if(!checkoutReady(env)||row.environment!=='production'||!sameAddress(row.payload.shipping_address,order.shipping_address)){await store.setJSON('orders/'+id,{...updated,message:'Payment received. Delivery details or production settings need staff review before printing.'});return {held:true};}
    try{
      await Promise.all(['interior','cover'].map(kind=>validatedFile(row.payload[kind+'_id'],row.owner,kind)));
      const fresh=await lulu('/print-job-cost-calculations/',{method:'POST',body:L.quotePayload(row.payload)});
      if(fresh.currency!==row.currency||money(fresh.total_cost_incl_tax)>row.amount){await store.setJSON('orders/'+id,{...updated,message:'Payment received. The printing price changed; staff will review fulfillment or arrange a refund.'});return {held:true};}
      await store.setJSON('orders/'+id,{...updated,status:'submitting_to_printer',message:'Payment received. Sending the book to Lulu.'});
      const job=await lulu('/print-jobs/',{method:'POST',body:L.orderPayload(row.payload,env.LULU_CONTACT_EMAIL)});
      if(!job.id)throw Error('Missing print job ID');
      await store.setJSON('orders/'+id,{...updated,status:'submitted',luluId:String(job.id),message:'Lulu received your order. Printing begins after Lulu billing and file checks complete.'});return {submitted:true};
    }catch{await store.setJSON('orders/'+id,{...updated,status:'fulfillment_needs_review',message:'Payment received. The team must confirm the Lulu result before retrying to prevent duplicate printing.'});return {held:true};}
  }
  async function orders(owner){const result=[];for(const item of (await store.list({prefix:'owner-orders/'+owner+'/'})).blobs){const {id}=await read(item.key);const row=await owned(id,owner);result.push(publicOrder(row));}return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  async function status(id,owner){const row=await owned(id,owner);if(row.luluId){const job=await lulu('/print-jobs/'+L.safeJobId(row.luluId)+'/');row.status=String(job.status?.name||job.status||row.status);row.tracking=(job.line_items||[]).flatMap(x=>x.tracking_urls||[]).filter(x=>{try{return new URL(x).protocol==='https:'}catch{return false}});await store.setJSON('orders/'+id,row);}return publicOrder(row);}
  return {validate,checkout,paid,orders,status};
}
