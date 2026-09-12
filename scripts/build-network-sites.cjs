'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),out=path.join(root,'sites');
const sites=JSON.parse(fs.readFileSync(path.join(root,'data/network-sites.json'),'utf8'));
const D=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const C=require(path.join(root,'src/campaign-core.js')),Finder=C.Finder;
const master=D.sections[1].rows.map((row,i)=>({...Object.fromEntries(D.sections[1].columns.map((h,j)=>[h,row[j]||''])),_section:1,_row:i}));
const records=[...master,...D.extraRecords],candidates=Finder.index(records).filter(x=>!x.restricted&&x.kind==='catalog');
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
function compact(item,site){return {id:item.recordId,title:item.title,subtitle:item.subtitle,type:item.type,status:item.status,durations:item.durations,goals:item.goals,format:item.format,category:item.category,source:item.sourceLabel,search:item.search,score:score(item,site)};}
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content)}
fs.rmSync(out,{recursive:true,force:true});
const deploymentBase=id=>'https://lifetogether-'+({church:'40-day-campaign',groups:'small-group-curriculum',advisor:'christian-advisor-network',familyministry:'family-legacy-ministry',finance:'financial-wisdom-ministry',family:'family-legacy-by-design',flourishing:'flourishing-life-series',workplace:'christian-marketplace',doingchurch:'doing-church-together',sermon:'sermon-curator'}[id])+'.netlify.app/';
const network=sites.map(x=>({id:x.id,name:x.name,domain:x.domain,url:deploymentBase(x.id)}));
const htmlTemplate=fs.readFileSync(path.join(root,'src/network-site.html'),'utf8'),css=fs.readFileSync(path.join(root,'src/network-site.css'),'utf8'),app=fs.readFileSync(path.join(root,'src/network-site.js'),'utf8');
const manifest=[];
for(const site of sites){
 const chosen=candidates.filter(x=>belongs(x,site)).map(x=>compact(x,site)).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
 const durations=[...new Set(chosen.flatMap(x=>x.durations))].sort((a,b)=>a-b);
 const payload=Buffer.from(zlib.gzipSync(JSON.stringify({site,records:chosen,network,durations}),{mtime:0})).toString('base64');
 const folder=path.join(out,site.id),html=htmlTemplate.replace('SITE_TITLE',site.name+' · LifeTogether').replace('SITE_DESCRIPTION',site.description).replace('SITE_NAME',site.name);
 write(path.join(folder,'index.html'),html);write(path.join(folder,'style.css'),css);write(path.join(folder,'app.js'),app);write(path.join(folder,'site-data.js'),'window.LT_SITE_DATA='+JSON.stringify({payload})+';');
 fs.cpSync(path.join(root,'src/fonts'),path.join(folder,'fonts'),{recursive:true});
 write(path.join(folder,'_redirects'),'/* /index.html 200\n');
 write(path.join(folder,'netlify.toml'),'[build]\n  publish = "."\n');
 write(path.join(folder,'README.md'),`# ${site.name}\n\nIndependent static site for ${site.domain}, generated from the LifeTogether master library. The deployment-ready folder contains its own application, site-specific source index, licensed fonts, metadata, and Netlify fallback routing.\n\nRegenerate from the repository root with the network build script so title, subtitle, duration, and source-status changes remain synchronized with the master library.\n`);
 manifest.push({id:site.id,name:site.name,requestedDomain:site.domain,netlifyName:new URL(deploymentBase(site.id)).hostname.split('.')[0],records:chosen.length,homeFeatured:Math.min(6,chosen.length),types:Object.fromEntries(['campaign','catalytic','series'].map(type=>[type,chosen.filter(x=>x.type===type).length])),durations});
}
write(path.join(out,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),sourceCatalogDate:D.date,sites:manifest},null,2));
write(path.join(out,'README.md'),'# LifeTogether network sites\n\nTen independently deployable websites generated from one source-preserving master library. Each folder contains a complete static site and may be deployed as a separate Netlify project. See `manifest.json` for record coverage and proposed Netlify names.\n');
console.log(JSON.stringify(manifest,null,2));
