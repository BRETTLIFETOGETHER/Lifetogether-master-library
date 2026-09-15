import {getUser,verifyRequestOrigin,refreshSession} from '@netlify/identity';
import {getStore} from '@netlify/blobs';
import {createService,ApiError} from './workspaces-core.mjs';
export default async request=>{
 const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
 try {
  if(request.method!=='POST')return Response.json({error:'Use POST.'},{status:405,headers:{...headers,Allow:'POST'}});
  verifyRequestOrigin(request);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError(415,'Use JSON.');
  const raw=await request.text();if(raw.length>300000)throw new ApiError(413,'Request too large.');
  let body;try{body=JSON.parse(raw)}catch{throw new ApiError(400,'Invalid request.')}
  await refreshSession();const user=await getUser();
  const service=createService(getStore({name:'lifetogether-platform-v1',consistency:'strong'}));
  const result=await service(body.action,body,user);return Response.json(result,{headers});
 } catch(error) {const status=Number(error.status)||500;return Response.json({error:status<500?error.message:'The workspace could not be saved. Your current form is still available; please retry.'},{status,headers})}
};
