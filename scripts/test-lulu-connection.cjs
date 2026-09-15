'use strict';
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/lulu.cjs');
(async()=>{
 process.env.LULU_API_ENVIRONMENT='sandbox';process.env.URL='https://site.example';
 delete process.env.LULU_CLIENT_KEY;delete process.env.LULU_CLIENT_SECRET;
 const event={httpMethod:'POST',headers:{origin:'https://site.example'},queryStringParameters:{action:'connection'},body:'{}'};
 assert.equal((await handler(event,{})).statusCode,503);
 process.env.LULU_CLIENT_KEY='test-key';process.env.LULU_CLIENT_SECRET='test-secret';
 let calls=0;global.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.sandbox.lulu.com/auth/realms/glasstree/protocol/openid-connect/token');assert.equal(options.method,'POST');assert.equal(options.body,'grant_type=client_credentials');return {ok:true,json:async()=>({access_token:'private-test-token'})}};
 const r=await handler(event,{});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).authenticated,true);assert(!r.body.includes('private-test-token'));assert(!r.body.includes('test-secret'));assert.equal(calls,1);
 assert.equal((await handler({...event,httpMethod:'GET'},{})).statusCode,405);assert.equal(calls,1);
 assert.equal((await handler({...event,headers:{origin:'https://other.example'}},{})).statusCode,403);assert.equal(calls,1);
 global.fetch=async()=>({ok:false,json:async()=>({error_description:'private upstream detail'})});
 const bad=await handler(event,{});assert.equal(bad.statusCode,502);assert(!bad.body.includes('private upstream detail'));
 console.log('PASS: missing credentials, sandbox OAuth, no secret disclosure, POST and origin checks, rejected credentials');
})().catch(e=>{console.error(e);process.exitCode=1});
