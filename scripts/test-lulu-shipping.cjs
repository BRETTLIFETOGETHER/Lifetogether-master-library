'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const select={value:'MAIL',set innerHTML(value){this.html=value;this.value=/value="([^"]*)"/.exec(value)?.[1]||'';},get innerHTML(){return this.html;}};
let destination={country_code:'US',state_code:'CA',postcode:'92602'},options=[],calls=[],pending;
const ctx=vm.createContext({localStorage:{getItem:()=>null},E:x=>String(x),Intl,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,params:()=>new URLSearchParams('fulfill=book-1'),$:id=>id==='#lulu-shipping_option'?select:null});
vm.runInContext(fs.readFileSync('src/lulu-studio.js','utf8'),ctx);
ctx.request=async(action,args)=>{calls.push({action,body:args.body});return pending?await pending:options;};
ctx.payload=()=>({currency:'USD',line_item:{page_count:120,quantity:1,pod_package_id:'0600X0900.BW.STD.PB.060UW444.MXX'},shipping_address:{...destination},shipping_option:select.value});
vm.runInContext('luluRequest=request; luluFormPayload=payload;',ctx);
const load=()=>vm.runInContext('luluLoadShipping({}, {id:"book-1"})',ctx);
(async()=>{
 options=[{level:'EXPRESS',cost_excl_tax:20},{level:'GROUND_HD',cost_excl_tax:8}];
 await load();assert.equal(select.value,'GROUND_HD');assert(!select.html.includes('value="MAIL"'));assert.equal(calls[0].body.shipping_address.state_code,'CA');console.log('PASS unavailable default MAIL is replaced by a returned method; full address is supplied');
 select.value='EXPRESS';await load();assert.equal(select.value,'EXPRESS');console.log('PASS user’s available shipping preference is retained');
 options=[];await assert.rejects(load,/No delivery methods/);assert.equal(select.value,'');assert(!select.html.includes('EXPRESS'));console.log('PASS no shipping results clears stale choices');
 options=[{level:'MAIL',is_active:false},{level:'GROUND_HD'}];await load();assert.equal(select.value,'GROUND_HD');console.log('PASS inactive delivery methods are excluded');
 let resolve;pending=new Promise(r=>resolve=r);const inFlight=load();destination.state_code='NY';resolve([{level:'MAIL'}]);await assert.rejects(inFlight,/Delivery details changed/);assert.equal(select.value,'');console.log('PASS in-flight destination changes cannot restore stale shipping choices');
 console.log('PASS 5 shipping regression checks');
})().catch(e=>{console.error(e);process.exitCode=1});
