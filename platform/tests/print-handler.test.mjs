import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {createPrintHandler} from '../functions/print-checkout.mjs';
import {createPaidWorker} from '../functions/print-paid-background.mjs';
const origin='https://print.example';
function fixture(){
 const rows=new Map();let version=0,paidCalls=0;
 const store={async get(k){return structuredClone(rows.get(k)?.data??null)},async getWithMetadata(k){return structuredClone(rows.get(k)??null)},async set(k,data){rows.set(k,{data,etag:String(++version)});},async setJSON(k,data,opts={}){const old=rows.get(k);if(opts.onlyIfNew&&old||opts.onlyIfMatch&&old?.etag!==opts.onlyIfMatch)return {modified:false};await this.set(k,structuredClone(data));return {modified:true};},async list({prefix}){return {blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}};
 const env={SHOPIFY_STORE_DOMAIN:'test.myshopify.com',SHOPIFY_WEBHOOK_SECRET:'fixture-secret',URL:origin};
 const service={async orders(){return []},async paid(){paidCalls++;return {submitted:true}}};
 const runtime=()=>({env,store,service}),handler=createPrintHandler(runtime),worker=createPaidWorker(runtime);
 const post=(data,cookie='',headers={})=>handler(new Request(origin+'/.netlify/functions/print-checkout',{method:'POST',headers:{origin,'content-type':'application/json',cookie,...headers},body:JSON.stringify(data)}),{ip:'127.0.0.1'});
 return {rows,store,env,handler,worker,post,get paidCalls(){return paidCalls}};
}
test('session cookies protect uploads; cross-origin requests are rejected',async()=>{
 const f=fixture();assert.equal((await f.post({action:'upload'})).status,401);
 assert.equal((await f.post({action:'session'},'',{origin:'https://other.example'})).status,403);
 const r=await f.post({action:'session'});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.equal((await r.json()).ready,false);
});
test('PDF upload validates page count and protects printer link with a token',async()=>{
 const f=fixture(),session=await f.post({action:'session'}),cookie=session.headers.get('set-cookie').split(';')[0];
 const pdf=await PDFDocument.create();pdf.addPage([450,666]);pdf.addPage([450,666]);const encoded=Buffer.from(await pdf.save()).toString('base64');
 const r=await f.post({action:'upload',kind:'interior',pdf:encoded},cookie);assert.equal(r.status,200);const {file}=await r.json();assert.equal(file.pageCount,2);
 assert.equal((await f.post({action:'upload',kind:'cover',pdf:encoded},cookie)).status,400);
 assert.equal((await f.post({action:'upload',kind:'interior',pdf:Buffer.from('not a PDF').toString('base64')},cookie)).status,400);
 const good=await f.handler(new Request(file.url),{});assert.equal(good.status,200);assert.equal(good.headers.get('content-type'),'application/pdf');
 const bad=new URL(file.url);bad.searchParams.set('token','wrong');assert.equal((await f.handler(new Request(bad),{})).status,404);
 const meta=await f.store.get('files-meta/'+file.id);await f.store.setJSON('files-meta/'+file.id,{...meta,expiresAt:0});assert.equal((await f.handler(new Request(file.url),{})).status,404);
});
test('webhook persists before acknowledging and delegates work without printing in the request',async t=>{
 const f=fixture(),raw=JSON.stringify({id:1,note_attributes:[]}),signature=createHmac('sha256',f.env.SHOPIFY_WEBHOOK_SECRET).update(raw).digest('base64');let dispatched;
 t.mock.method(globalThis,'fetch',async(url,options)=>{dispatched=new Request(url,options);assert.equal(f.rows.size,1);assert.equal(f.paidCalls,0);return new Response(null,{status:202});});
 const request=()=>new Request(origin+'/.netlify/functions/print-checkout?webhook=shopify',{method:'POST',headers:{'x-shopify-hmac-sha256':signature,'x-shopify-shop-domain':f.env.SHOPIFY_STORE_DOMAIN,'x-shopify-topic':'orders/paid'},body:raw});
 assert.equal((await f.handler(request(),{})).status,200);assert.equal(f.paidCalls,0);
 await f.worker(dispatched.clone());await f.worker(dispatched.clone());assert.equal(f.paidCalls,1);
 const record=[...f.rows.values()][0].data;assert.equal(record.state,'processed');assert.equal(record.order,undefined);
 const invalid=request();invalid.headers.set('x-shopify-hmac-sha256','bad');assert.equal((await f.handler(invalid,{})).status,401);
});
test('failed dispatch asks Shopify to retry while retaining the payment event',async t=>{
 const f=fixture(),raw='{"id":1}',signature=createHmac('sha256',f.env.SHOPIFY_WEBHOOK_SECRET).update(raw).digest('base64');
 t.mock.method(globalThis,'fetch',async()=>new Response('denied',{status:401}));
 const r=await f.handler(new Request(origin+'/.netlify/functions/print-checkout?webhook=shopify',{method:'POST',headers:{'x-shopify-hmac-sha256':signature,'x-shopify-shop-domain':f.env.SHOPIFY_STORE_DOMAIN,'x-shopify-topic':'orders/paid'},body:raw}),{});
 assert.equal(r.status,503);assert.equal(f.rows.size,1);assert.equal(f.paidCalls,0);
});
