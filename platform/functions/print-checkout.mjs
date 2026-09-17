import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {staffAccess,staffReady} from './print-staff.mjs';
import {printRuntime} from './print-runtime.mjs';
import {PDFDocument} from 'pdf-lib';
import {createPrintCheckout,PrintError,digest,readiness,checkoutReady,signedWebhook} from './print-checkout-core.mjs';
export const createPrintHandler = runtime => async (request,context)=>{
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  try{
    const {env,store,service,staff}=runtime(),url=new URL(request.url);
    const read=k=>store.get(k,{type:'json'});
    if(request.method==='GET'&&url.searchParams.has('file')){
      const id=url.searchParams.get('file'),token=url.searchParams.get('token')||'';if(!/^[a-f0-9-]{36}$/.test(id))throw new PrintError('File unavailable.',404);
      const f=await read('files-meta/'+id);if(!f||f.expiresAt<Date.now()||digest(token)!==f.tokenHash)throw new PrintError('File unavailable.',404);
      return new Response(await store.get('files/'+id,{type:'arrayBuffer'}),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'inline; filename="'+f.kind+'.pdf"'}});
    }
    if(request.method!=='POST')throw new PrintError('Use POST.',405);
    if(Number(request.headers.get('content-length')||0)>4300000)throw new PrintError('Use a PDF under 3 MB.',413);
    const raw=await request.text();if(raw.length>4300000)throw new PrintError('Request too large.',413);
    if(url.searchParams.get('webhook')==='shopify'){
      if(raw.length>1000000||!signedWebhook(raw,request.headers.get('x-shopify-hmac-sha256'),env.SHOPIFY_WEBHOOK_SECRET)||request.headers.get('x-shopify-shop-domain')!==env.SHOPIFY_STORE_DOMAIN)throw new PrintError('Invalid webhook.',401);
      if(request.headers.get('x-shopify-topic')!=='orders/paid')return Response.json({ignored:true},{headers});
      // Persist before acknowledging Shopify; expensive provider calls happen in the background.
      const eventId=digest(raw),eventKey='payment-events/'+eventId;
      await store.setJSON(eventKey,{order:JSON.parse(raw),receivedAt:new Date().toISOString(),state:'queued'},{onlyIfNew:true});
      const body=JSON.stringify({eventId}),signature=createHmac('sha256',env.SHOPIFY_WEBHOOK_SECRET).update(body).digest('base64');
      const target=new URL('/.netlify/functions/print-paid-background',env.URL||url.origin);
      const dispatched=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json','X-Print-Signature':signature},body,signal:AbortSignal.timeout(2500)});
      if(dispatched.status!==202)throw new PrintError('Payment notification saved; fulfillment dispatch needs retry.',503);
      return Response.json({accepted:true},{headers});
    }
    if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))throw new PrintError('Open Print Studio to continue.',403);
    const body=JSON.parse(raw),cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)lt_print_session=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
    let session=cookie,owner=cookie?digest(cookie):null,record=owner?await read('sessions/'+owner):null;
    const bucket='rate/'+digest(context.ip||'unknown')+'/'+new Date().toISOString().slice(0,13);
    async function rate(limit){const old=await store.getWithMetadata(bucket,{type:'json'}),count=old?.data.count||0;if(count>=limit)throw new PrintError('Please wait before trying again.',429);const write=await store.setJSON(bucket,{count:count+1},old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!write.modified)throw new PrintError('Please retry in a moment.',429);}
    if(body.action==='session'){
      if(!record||record.expiresAt<Date.now()){await rate(30);session=randomBytes(32).toString('base64url');owner=digest(session);record={expiresAt:Date.now()+30*86400000};await store.setJSON('sessions/'+owner,record);headers['Set-Cookie']='lt_print_session='+session+'; HttpOnly; Secure; SameSite=Lax; Path=/.netlify/functions/print-checkout; Max-Age=2592000';}
      return Response.json({ready:checkoutReady(env),staffAuthorized:staffAccess(env,owner),staffReady:staffReady(env,owner),...readiness(env),orders:await service.orders(owner)},{headers});
    }
    if(!record||record.expiresAt<Date.now())throw new PrintError('Reopen Print Studio to start a secure upload session.',401);
    await rate(120);
    if(body.action==='staff-access-request')return Response.json({requestCode:owner},{headers});
    if(body.action==='staff-prepare')return Response.json(await staff.prepare(body,owner),{headers});
    if(body.action==='staff-submit')return Response.json(await staff.submit(body,owner),{headers});
    if(body.action==='upload'){
      if(!['interior','cover'].includes(body.kind))throw new PrintError('Choose an interior or cover PDF.');
      const existing=await store.list({prefix:'owner-files/'+owner+'/'});if(existing.blobs.length>=20)throw new PrintError('This session has reached its 20-file limit. Contact the team for more uploads.',429);
      const bytes=Buffer.from(String(body.pdf||''),'base64');if(bytes.length>3000000||bytes.subarray(0,5).toString()!=='%PDF-')throw new PrintError('Choose a PDF under 3 MB.');
      let pdf;try{pdf=await PDFDocument.load(bytes)}catch{throw new PrintError('This PDF cannot be opened. Export an unlocked PDF and try again.');}
      const pages=pdf.getPages(),count=pages.length;if(count<1||count>800||body.kind==='cover'&&count!==1)throw new PrintError('Use a single-page cover or an interior with 1–800 pages.');
      if(pages.some(p=>Math.abs(p.getWidth()-pages[0].getWidth())>.72||Math.abs(p.getHeight()-pages[0].getHeight())>.72))throw new PrintError('All interior pages must have the same dimensions.');
      const id=randomUUID(),token=randomBytes(32).toString('base64url'),f={id,owner,kind:body.kind,pageCount:count,width:pages[0].getWidth()/72,height:pages[0].getHeight()/72,tokenHash:digest(token),expiresAt:Date.now()+90*86400000,url:url.origin+'/.netlify/functions/print-checkout?file='+id+'&token='+token};
      await store.set('files/'+id,bytes);await store.setJSON('files-meta/'+id,f);await store.setJSON('owner-files/'+owner+'/'+id,{id});return Response.json({file:{id,kind:f.kind,pageCount:count,width:f.width,height:f.height,url:f.url}},{headers});
    }
    if(body.action==='validate'){const v=await service.validate(body,owner);return Response.json({results:v.results,valid:v.valid,pageCount:v.pages},{headers});}
    if(body.action==='checkout')return Response.json(await service.checkout(body,owner),{headers});
    if(body.action==='orders')return Response.json({orders:await service.orders(owner)},{headers});
    if(body.action==='status')return Response.json(await service.status(body.id,owner),{headers});
    throw new PrintError('Unknown print request.');
  }catch(e){const status=e.status||500;return Response.json({error:status<500||e instanceof PrintError?e.message:'The print service is temporarily unavailable. Your saved book has not been changed.'},{status,headers});}
};

export default createPrintHandler(printRuntime);
