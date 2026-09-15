import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {ApiError} from './workspaces-core.mjs';
export function configuration(env){let products=[];try{products=JSON.parse(env.LT_APPROVED_PRODUCTS||'[]')}catch{throw new ApiError(503,'The approved product configuration needs correction.')}
 const domain=String(env.SHOPIFY_STORE_DOMAIN||'');if(domain&&!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))throw new ApiError(503,'The Shopify store domain is invalid.');
 products=products.filter(p=>p.approved===true&&/^[a-z0-9-]{1,80}$/.test(p.id)&&/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(p.variantId)&&/^\d+\.\d{2}$/.test(p.amount)&&/^[A-Z]{3}$/.test(p.currency)&&p.title&&p.license);
 return {domain,token:env.SHOPIFY_STOREFRONT_TOKEN||'',products,version:'2026-07',configured:Boolean(domain&&env.SHOPIFY_STOREFRONT_TOKEN&&products.length)}}
export function verifyWebhook(raw,signature,secret){if(!secret||!signature)return false;const expected=createHmac('sha256',secret).update(raw).digest(),given=Buffer.from(signature,'base64');return expected.length===given.length&&timingSafeEqual(expected,given)}
export function createCommerce(env,store,fetcher=fetch){
 async function graphql(query,variables){const c=configuration(env),r=await fetcher(`https://${c.domain}/api/${c.version}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':c.token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000)}),data=await r.json();if(!r.ok||data.errors)throw new ApiError(502,'Shopify could not complete the request. Please retry.');return data.data}
 return async(action,body,user)=>{const c=configuration(env);
  if(action==='offers')return {configured:c.configured,products:c.products.map(({variantId,approved,...p})=>p),message:c.configured?'Prices are verified again before checkout.':'Approved products, pricing and Shopify credentials have not been connected yet.'};
  if(!user?.id)throw new ApiError(401,'Sign in before opening checkout or viewing receipts.');
  if(action==='receipts'){const listed=await store.list({prefix:'receipts/'+user.id+'/'});const receipts=[];for(const row of listed.blobs||[]){const data=await store.get(row.key,{type:'json'});if(data)receipts.push(data)}return {receipts}}
  if(action!=='checkout')throw new ApiError(400,'Unknown commerce action.');
  if(!c.configured)throw new ApiError(503,'Checkout is waiting for approved products and pricing.');
  const product=c.products.find(p=>p.id===body.product);if(!product)throw new ApiError(400,'Choose an approved product.');
  const quantity=Number(body.quantity||1);if(!Number.isInteger(quantity)||quantity<1||quantity>100)throw new ApiError(400,'Quantity must be between 1 and 100.');
  const data=await graphql('query Variant($id:ID!){node(id:$id){... on ProductVariant{id availableForSale price{amount currencyCode} product{title}}}}',{id:product.variantId}),variant=data.node;
  if(!variant?.availableForSale)throw new ApiError(409,'This product is not available for sale.');
  if(Number(variant.price.amount).toFixed(2)!==product.amount||variant.price.currencyCode!==product.currency)throw new ApiError(409,'The Shopify price changed. This product needs pricing review before checkout.');
  const checkout=randomUUID(),pending={id:checkout,userId:user.id,product:product.id,variantId:product.variantId,title:product.title,license:product.license,quantity,amount:product.amount,currency:product.currency,createdAt:new Date().toISOString()};
  const save=await store.setJSON('checkouts/'+checkout,pending,{onlyIfNew:true});if(!save.modified)throw new ApiError(409,'Please try opening checkout again.');
  const input={lines:[{merchandiseId:product.variantId,quantity}],buyerIdentity:{email:user.email},attributes:[{key:'lt_checkout',value:checkout}],...(body.discount?{discountCodes:[String(body.discount).slice(0,100)]}:{})};
  const cartData=await graphql('mutation CreateCart($input:CartInput!){cartCreate(input:$input){cart{id checkoutUrl cost{totalAmount{amount currencyCode}}}userErrors{field message}}}',{input});const result=cartData.cartCreate;
  if(result.userErrors?.length||!result.cart?.checkoutUrl)throw new ApiError(400,result.userErrors?.[0]?.message||'Checkout could not be created.');
  const url=new URL(result.cart.checkoutUrl);if(url.protocol!=='https:')throw new ApiError(502,'Shopify returned an invalid checkout link.');
  await store.setJSON('checkouts/'+checkout,{...pending,cartId:result.cart.id});return {checkoutUrl:url.href,total:result.cart.cost.totalAmount};
 }
}
export async function receiveOrder(raw,headers,env,store){if(!verifyWebhook(raw,headers.get('x-shopify-hmac-sha256'),env.SHOPIFY_WEBHOOK_SECRET))throw new ApiError(401,'Invalid signature.');if(headers.get('x-shopify-shop-domain')!==env.SHOPIFY_STORE_DOMAIN)throw new ApiError(403,'Unexpected store.');const topic=headers.get('x-shopify-topic');if(!['orders/paid','orders/cancelled'].includes(topic))return {accepted:true,ignored:true};let order;try{order=JSON.parse(raw)}catch{throw new ApiError(400,'Invalid order JSON.')}
 const key=order.note_attributes?.find(x=>x.name==='lt_checkout')?.value;if(!/^[a-z0-9-]{36}$/.test(key||''))return {accepted:true,ignored:true};const pending=await store.get('checkouts/'+key,{type:'json'});if(!pending)return {accepted:true,ignored:true};
 if(topic==='orders/paid'&&(order.financial_status!=='paid'||order.currency!==pending.currency||!order.line_items?.some(l=>'gid://shopify/ProductVariant/'+l.variant_id===pending.variantId&&Number(l.quantity)>=pending.quantity)))throw new ApiError(400,'The paid order does not match the issued checkout.');
 if(!order.id||!order.updated_at)throw new ApiError(400,'Incomplete order.');const receiptKey='receipts/'+pending.userId+'/'+String(order.id).replace(/[^0-9]/g,''),old=await store.getWithMetadata(receiptKey,{type:'json'});if(old?.data.updatedAt>=order.updated_at)return {accepted:true,duplicate:true};
 const receipt={orderId:String(order.id),number:String(order.name||order.order_number),title:pending.title,license:pending.license,quantity:pending.quantity,total:String(order.total_price),currency:String(order.currency),status:topic==='orders/cancelled'?'cancelled':'paid',updatedAt:order.updated_at,createdAt:order.created_at,source:'Verified Shopify webhook'};
 const result=await store.setJSON(receiptKey,receipt,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!result.modified)throw new ApiError(409,'Receipt update is already in progress; retry delivery.');return {accepted:true};
}
