import test from 'node:test';import assert from 'node:assert/strict';
import {createService} from '../functions/workspaces-core.mjs';
class Memory {rows=new Map();n=0;async getWithMetadata(k){return structuredClone(this.rows.get(k)||null)}async setJSON(k,data,options){const row=this.rows.get(k);if(options.onlyIfNew&&row||options.onlyIfMatch&&row?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++this.n);this.rows.set(k,{data:structuredClone(data),etag});return {modified:true,etag}}}
const owner={id:'owner',name:'Owner',email:'owner@example.test'},member={id:'member',email:'member@example.test'},stranger={id:'stranger',email:'other@example.test'};
test('workspace access, private documents, invitation email binding, roles and optimistic conflicts',async()=>{
 const api=createService(new Memory());let r=await api('create',{name:'Our church',kind:'church'},owner);const wid=r.workspace.id;
 await assert.rejects(api('get',{workspace:wid},stranger),{status:404});
 r=await api('save',{workspace:wid,etag:r.etag,document:{type:'reflection',title:'Private prayer',visibility:'private',content:{body:'Private'}}},owner);
 const old=r.etag;
 r=await api('invite',{workspace:wid,etag:r.etag,email:member.email,role:'member'},owner);const token=r.invitation.token;
 await assert.rejects(api('accept',{workspace:wid,token},stranger),{status:403});
 r=await api('accept',{workspace:wid,token},member);assert.equal(r.workspace.documents.length,0);assert.equal(r.workspace.invites.length,0);
 await assert.rejects(api('save',{workspace:wid,etag:old,document:{}},owner),{status:409});
 await assert.rejects(api('save',{workspace:wid,etag:r.etag,document:{type:'campaign',title:'No',visibility:'workspace',content:{}}},member),{status:403});
 await assert.rejects(api('invite',{workspace:wid,etag:r.etag,email:stranger.email,role:'editor'},member),{status:403});
 r=await api('member',{workspace:wid,etag:r.etag,id:member.id,role:'remove'},owner);
 await assert.rejects(api('get',{workspace:wid},member),{status:404});
});
test('shared snapshots reveal one reviewed document, require confirmation and expire/revoke',async()=>{
 let time=new Date('2026-09-14');const api=createService(new Memory(),()=>time);let r=await api('create',{name:'Family',kind:'family'},owner);const wid=r.workspace.id;
 r=await api('save',{workspace:wid,etag:r.etag,document:{type:'campaign',title:'Our plan',visibility:'workspace',content:{days:21}}},owner);const did=r.document.id;
 await assert.rejects(api('share',{workspace:wid,etag:r.etag,id:did},owner),{status:400});
 r=await api('share',{workspace:wid,etag:r.etag,id:did,confirm:true},owner);const share=r.share;
 const s=await api('shared',{workspace:wid,token:share.token},null);assert.equal(s.document.title,'Our plan');assert.equal(s.members,undefined);
 r=await api('revoke-share',{workspace:wid,etag:r.etag,id:share.id},owner);
 await assert.rejects(api('shared',{workspace:wid,token:share.token},null),{status:404});
 r=await api('share',{workspace:wid,etag:r.etag,id:did,confirm:true},owner);time=new Date('2026-09-23');await assert.rejects(api('shared',{workspace:wid,token:r.share.token},null),{status:404});
});
test('protected editions, private reflections and unsupported publishing fail closed',async()=>{
 const api=createService(new Memory());let r=await api('create',{name:'Edition',kind:'church'},owner);const wid=r.workspace.id;
 r=await api('save',{workspace:wid,etag:r.etag,document:{type:'edition',title:'Edition',visibility:'workspace',content:{protectedCore:'Original',mode:'personalize'}}},owner);
 await assert.rejects(api('save',{workspace:wid,etag:r.etag,document:{...r.document,content:{protectedCore:'Changed',mode:'personalize'}}},owner),{status:403});
 await assert.rejects(api('save',{workspace:wid,etag:r.etag,document:{type:'reflection',title:'R',visibility:'workspace',content:{}}},owner),{status:400});
 await assert.rejects(api('save',{workspace:wid,etag:r.etag,document:{type:'contribution',title:'C',visibility:'workspace',content:{status:'published'}}},owner),{status:400});
});
