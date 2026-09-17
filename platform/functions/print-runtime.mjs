import {getStore} from '@netlify/blobs';
import {PrintError,createPrintCheckout} from './print-checkout-core.mjs';
const keys=['URL','DEPLOY_PRIME_URL','LULU_CLIENT_KEY','LULU_CLIENT_SECRET','LULU_API_ENVIRONMENT','LULU_CONTACT_EMAIL','LT_PRINT_CHECKOUT_ENABLED','SHOPIFY_STORE_DOMAIN','SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_WEBHOOK_SECRET','SHOPIFY_CHECKOUT_DOMAIN'];
export function printRuntime(){
 const env=Object.fromEntries(keys.map(k=>[k,Netlify.env.get(k)||'']));
 const store=getStore({name:'lifetogether-print-checkout-v1',consistency:'strong'});
    async function lulu(path,options={}){
      const base=env.LULU_API_ENVIRONMENT==='production'?'https://api.lulu.com':'https://api.sandbox.lulu.com';
      const auth=await fetch(base+'/auth/realms/glasstree/protocol/openid-connect/token',{method:'POST',headers:{authorization:'Basic '+Buffer.from(env.LULU_CLIENT_KEY+':'+env.LULU_CLIENT_SECRET).toString('base64'),'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
      const token=await auth.json();if(!auth.ok||!token.access_token)throw new PrintError('Lulu authentication needs attention.',503);
      const response=await fetch(base+path,{method:options.method||'GET',headers:{authorization:'Bearer '+token.access_token,'content-type':'application/json'},body:options.body?JSON.stringify(options.body):undefined,signal:AbortSignal.timeout(25000)});
      const data=await response.json();if(!response.ok)throw new PrintError('Lulu could not complete this request. Review the files and delivery address.',502);return data;
    }
    async function shopify(query,variables){
      if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.SHOPIFY_STORE_DOMAIN))throw new PrintError('Shopify setup is incomplete.',503);
      const r=await fetch('https://'+env.SHOPIFY_STORE_DOMAIN+'/admin/api/2026-07/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':env.SHOPIFY_ADMIN_ACCESS_TOKEN},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});
      const data=await r.json();if(!r.ok||data.errors)throw new PrintError('Shopify could not complete this request. Check the store connection.',502);return data.data;
    }
 return {env,store,service:createPrintCheckout({env,store,lulu,shopify})};
}
