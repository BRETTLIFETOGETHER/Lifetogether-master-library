'use strict';

const L=require('./lulu-core.cjs');
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const response=(statusCode,body,headers={})=>({statusCode,headers:{...JSON_HEADERS,...headers},body:JSON.stringify(body)});
const environment=()=>process.env.LULU_API_ENVIRONMENT==='production'?'production':'sandbox';
const baseURL=()=>environment()==='production'?'https://api.lulu.com':'https://api.sandbox.lulu.com';
const configured=()=>Boolean(process.env.LULU_CLIENT_KEY&&process.env.LULU_CLIENT_SECRET);
function parse(event){if(!event.body)return{};if(Buffer.byteLength(event.body)>50000)throw new L.InputError('Request is too large.',413);try{return JSON.parse(event.body);}catch{throw new L.InputError('Request body must be valid JSON.');}}
function sameOrigin(event){const origin=event.headers?.origin||event.headers?.Origin;if(!origin)return true;const allowed=[process.env.URL,process.env.DEPLOY_PRIME_URL,process.env.LULU_ALLOWED_ORIGIN].filter(Boolean);return allowed.some(value=>{try{return new URL(value).origin===new URL(origin).origin}catch{return false}});}
async function token(){
 const result=await fetch(`${baseURL()}/auth/realms/glasstree/protocol/openid-connect/token`,{method:'POST',headers:{authorization:`Basic ${Buffer.from(`${process.env.LULU_CLIENT_KEY}:${process.env.LULU_CLIENT_SECRET}`).toString('base64')}`,'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
 const data=await result.json().catch(()=>({}));if(!result.ok||!data.access_token)throw new L.InputError('Lulu authentication failed. Check the API environment and credentials.',502);return data.access_token;
}
async function lulu(path,{method='GET',body}={}){
 const access=await token(),result=await fetch(`${baseURL()}${path}`,{method,headers:{authorization:`Bearer ${access}`,accept:'application/json',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const data=await result.json().catch(()=>({detail:'Lulu returned an unreadable response.'}));
 if(!result.ok){const message=data.detail||data.message||Object.values(data).flat().filter(x=>typeof x==='string')[0]||`Lulu returned ${result.status}.`;throw new L.InputError(String(message).slice(0,500),result.status>=500?502:400);}return data;
}
exports.handler=async(event,context)=>{
 try{
  if(event.httpMethod==='OPTIONS')return response(204,{}, {'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type','access-control-allow-origin':event.headers?.origin||''});
  if(!sameOrigin(event))throw new L.InputError('This print endpoint only accepts requests from the LifeTogether site.',403);
  const action=event.queryStringParameters?.action||'health';
  if(action==='health')return response(200,{configured:configured(),environment:environment(),orders_enabled:process.env.LULU_ENABLE_ORDERS==='true',identity_required:process.env.LULU_REQUIRE_IDENTITY==='true',contact_email_configured:Boolean(process.env.LULU_CONTACT_EMAIL)});
  if(!configured())throw new L.InputError('Lulu is ready in the site, but its API credentials have not been added to Netlify yet.',503);
  if(action==='status')return response(200,await lulu(`/print-jobs/${L.safeJobId(event.queryStringParameters?.id)}/`));
  if(event.httpMethod!=='POST')throw new L.InputError('Use POST for this print request.',405);
  const body=parse(event);
  if(action==='shipping-options')return response(200,await lulu('/shipping-options/',{method:'POST',body:L.shippingPayload(body)}));
  if(action==='quote')return response(200,await lulu('/print-job-cost-calculations/',{method:'POST',body:L.quotePayload(body)}));
  if(action==='create-order'){
   if(process.env.LULU_ENABLE_ORDERS!=='true')throw new L.InputError('Live order creation is disabled. Review a sandbox proof, payment flow, and Lulu account billing before enabling it.',403);
   if(process.env.LULU_REQUIRE_IDENTITY==='true'){
    const roles=context.clientContext?.user?.app_metadata?.roles||[];if(!roles.includes('print-admin'))throw new L.InputError('A print-admin sign-in is required to create an order.',403);
   }
   return response(201,await lulu('/print-jobs/',{method:'POST',body:L.orderPayload(body,process.env.LULU_CONTACT_EMAIL)}));
  }
  throw new L.InputError('Unknown print action.',404);
 }catch(error){const out=L.publicError(error);console.error('Lulu function:',error?.message);return response(out.statusCode,{error:out.message});}
};
