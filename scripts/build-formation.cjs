'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'src/formation'),target=path.join(root,'sites/doingchurch/formation');
fs.mkdirSync(target,{recursive:true});
for(const file of fs.readdirSync(source))if(file!=='chapters.json')fs.copyFileSync(path.join(source,file),path.join(target,file));
console.log('Built churchwide formation guide, outlines, and inquiry page.');
