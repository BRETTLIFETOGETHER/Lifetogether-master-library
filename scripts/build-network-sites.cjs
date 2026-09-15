'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),out=path.join(root,'sites');
const sites=JSON.parse(fs.readFileSync(path.join(root,'data/network-sites.json'),'utf8'));
const D=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const C=require(path.join(root,'src/campaign-core.js')),Finder=C.Finder;
const master=D.sections[1].rows.map((row,i)=>({...Object.fromEntries(D.sections[1].columns.map((h,j)=>[h,row[j]||''])),_section:1,_row:i}));
const records=[...master,...D.extraRecords],candidates=Finder.index(records).filter(x=>!x.restricted&&x.kind==='catalog');
const weekly=new Map(),daily=new Map();
const addOutline=(map,id,item)=>{if(!id)return;const key=String(id),items=map.get(key)||[];if(!items.some(x=>x.number===item.number&&x.title===item.title))items.push(item);map.set(key,items)};
for(const sid of [53,61]){const section=D.sections[sid];for(const row of section.rows){const value=Object.fromEntries(section.columns.map((name,i)=>[name,row[i]]));addOutline(weekly,value['Parent Master ID'],{number:value['Session #']||value['Session No.'],title:value['Session Title'],subtitle:value['Session Subtitle']||'',source:`${section.name}`})}}
for(const row of D.sections[54].rows){const section=D.sections[54],value=Object.fromEntries(section.columns.map((name,i)=>[name,row[i]]));addOutline(daily,value['Parent Master ID'],{number:value['Global Day'],title:value['Devotional Day Title'],subtitle:value['Week Theme']||'',source:section.name})}
for(const row of D.sections[38].rows){if(!row[7]||!row[4])continue;const parent=master.find(x=>x['Campaign Title']===row[2]);if(parent)addOutline(daily,parent['Master ID'],{number:row[4],title:row[5],subtitle:row[6]?`Scripture: ${row[6]}`:'',source:D.sections[38].name})}
const configs={
 sermon:{defaults:['catalytic','series'],fallback:['campaign']},
 groups:{defaults:['campaign','series'],fallback:['catalytic']},
 advisor:{defaults:['campaign','series']},
 church:{all:true},
 familyministry:{defaults:['campaign','series']},
 finance:{defaults:['campaign','series']},
 family:{defaults:['campaign','series']},
 flourishing:{defaults:['campaign','series']},
 workplace:{defaults:['campaign','series']},
 doingchurch:{defaults:['campaign','catalytic','series']}
};
const score=(item,site)=>site.terms.reduce((n,t)=>n+((' '+item.search+' ').includes(' '+t.toLowerCase()+' ')?8:0),0)+item.priority*2+(item.subtitle?2:0)+(item.durations.includes(40)?(site.id==='church'?30:2):0)+Math.max(0,site.featured.length-site.featured.indexOf(item.type))*2;
function belongs(item,site){if(configs[site.id].all)return true;return site.terms.some(t=>(' '+item.search+' ').includes(' '+t.toLowerCase()+' '));}
function compact(item,site){return {id:item.recordId,title:item.title,subtitle:item.subtitle,type:item.type,status:item.status,durations:item.durations,goals:item.goals,format:item.format,category:item.category,source:item.sourceLabel,search:item.search,score:score(item,site),sessions:(weekly.get(item.recordId)||[]).slice(0,12),days:(daily.get(item.recordId)||[]).slice(0,40)};}
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content)}
fs.rmSync(out,{recursive:true,force:true});
const deploymentBase=id=>'https://lifetogether-'+({church:'40-day-campaign',groups:'small-group-curriculum',advisor:'christian-advisor-network',familyministry:'family-legacy-ministry',finance:'financial-wisdom-ministry',family:'family-legacy-by-design',flourishing:'flourishing-life-series',workplace:'christian-marketplace',doingchurch:'doing-church-together',sermon:'sermon-curator'}[id])+'.netlify.app/';
const network=sites.map(x=>({id:x.id,name:x.name,domain:x.domain,url:deploymentBase(x.id)}));
const htmlTemplate=fs.readFileSync(path.join(root,'src/network-site.html'),'utf8'),css=fs.readFileSync(path.join(root,'src/network-site.css'),'utf8'),app=fs.readFileSync(path.join(root,'src/network-site.js'),'utf8');
const discovery=fs.readFileSync(path.join(root,'src/discovery-core.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/discovery-ui.js'),'utf8');
const discoveryCSS=fs.readFileSync(path.join(root,'src/discovery.css'),'utf8');
const manifest=[];
for(const site of sites){
 const chosen=candidates.filter(x=>belongs(x,site)).map(x=>compact(x,site)).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
 const durations=[...new Set(chosen.flatMap(x=>x.durations))].sort((a,b)=>a-b);
 const intelligence=D.intelligence.map(name=>({name,domains:[...new Set(D.sections[69].rows.filter(row=>row[0]===name).map(row=>row[2]).filter(Boolean))].slice(0,5)}));
 const payload=Buffer.from(zlib.gzipSync(JSON.stringify({site,records:chosen,network,durations,intelligence,commerce:{provider:'Shopify',singleCampaignUrl:'',allAccessUrl:''},masterUrl:'https://lifetogethermasterlibary.netlify.app/'}),{mtime:0})).toString('base64');
 const marks={sermon:'¶',groups:'✳',advisor:'A',church:'40',familyministry:'⌂',finance:'≋',family:'F',flourishing:'✿',workplace:'↗',doingchurch:'⊕'};
 const colors={sermon:'#8d292c',groups:'#aa432b',advisor:'#152b43',church:'#b62e16',familyministry:'#365d89',finance:'#526349',family:'#865741',flourishing:'#743b59',workplace:'#2451bb',doingchurch:'#a14931'};
 const favicon='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${colors[site.id]}"/><text x="32" y="44" text-anchor="middle" font-family="Georgia,serif" font-size="38" fill="#fff8e9">${marks[site.id]}</text></svg>`);
 const folder=path.join(out,site.id),html=htmlTemplate.replace('SITE_TITLE',site.name+' · LifeTogether').replace('SITE_DESCRIPTION',site.description).replace('SITE_NAME',site.name).replace(/href="data:image\/svg\+xml,[^"]*"/,`href="${favicon}"`).replace('</head>',`<meta name="theme-color" content="${colors[site.id]}"></head>`);
 const design=fs.readFileSync(path.join(root,'src/network-designs',site.id+'.js'),'utf8'),theme=fs.readFileSync(path.join(root,'src/network-designs',site.id+'.css'),'utf8'),base=fs.readFileSync(path.join(root,'src/network-designs/base.css'),'utf8');
 write(path.join(folder,'index.html'),html);write(path.join(folder,'style.css'),css+'\n'+base+'\n'+theme+'\n'+discoveryCSS);write(path.join(folder,'app.js'),discovery+'\n'+app.replace('/* SITE_DESIGN */',design));write(path.join(folder,'site-data.js'),'window.LT_SITE_DATA='+JSON.stringify({payload})+';');
 fs.cpSync(path.join(root,'src/fonts'),path.join(folder,'fonts'),{recursive:true});
 write(path.join(folder,'_redirects'),'/* /index.html 200\n');
 write(path.join(folder,'netlify.toml'),'[build]\n  publish = "."\n');
 write(path.join(folder,'README.md'),`# ${site.name}\n\nIndependent static site for ${site.domain}, generated from the LifeTogether master library. The deployment-ready folder contains its own application, site-specific source index, licensed fonts, metadata, and Netlify fallback routing.\n\nRegenerate from the repository root with the network build script so title, subtitle, duration, and source-status changes remain synchronized with the master library.\n`);
 manifest.push({id:site.id,name:site.name,requestedDomain:site.domain,netlifyName:new URL(deploymentBase(site.id)).hostname.split('.')[0],records:chosen.length,homeFeatured:Math.min(6,chosen.length),types:Object.fromEntries(['campaign','catalytic','series'].map(type=>[type,chosen.filter(x=>x.type===type).length])),durations});
}
write(path.join(out,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),sourceCatalogDate:D.date,sites:manifest},null,2));
write(path.join(out,'README.md'),'# LifeTogether network sites\n\nTen independently deployable websites generated from one source-preserving master library. Each folder contains a complete static site and may be deployed as a separate Netlify project. See `manifest.json` for record coverage and proposed Netlify names.\n');
console.log(JSON.stringify(manifest,null,2));

require('node:child_process').execFileSync(process.execPath,[path.join(root,'platform/build.mjs')],{stdio:'inherit'});
