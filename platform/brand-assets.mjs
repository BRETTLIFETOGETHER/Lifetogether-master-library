import {zipFiles} from './zip.mjs';
import {PDFDocument,rgb} from 'pdf-lib';import fontkit from '@pdf-lib/fontkit';
const color=s=>{const n=parseInt(s.slice(1),16);return rgb((n>>16)/255,((n>>8)&255)/255,(n&255)/255)};
export async function brandAssets(brand,values,source,download){
 const fontURL=brand.font==='DM Serif'?'../fonts/dm-serif.ttf':'../fonts/manrope.ttf',response=await fetch(fontURL);if(!response.ok)throw Error('The brand font could not be loaded. Retry.');const fontBytes=await response.arrayBuffer();
 const sourceText=source?.content.recipe==='reader'?source.content.days.map(d=>`Day ${d.day}: ${d.title}\n${d.scripture}\n${d.body}\n${d.practice||''}`).join('\n\n'):source?source.content.translation||source.content.transcript||Object.entries(source.content).filter(([k,v])=>k!=='recipe'&&typeof v==='string').map(([k,v])=>`${k}: ${v}`).join('\n\n'):'';
 const files=[];
 for(const [kind,width,height] of [['cover-concept',450,666],['participant-guide',450,666],['presentation-slide',960,540],['invitation',432,648]]){
  const pdf=await PDFDocument.create();pdf.registerFontkit({create:bytes=>{const f=fontkit.create(bytes);return f.variationAxes?.wght?f.getVariation({wght:400}):f}});const font=await pdf.embedFont(fontBytes,{subset:true}),primary=color(brand.primary),accent=color(brand.accent);let page,y;
  const margin=42,usable=width-margin*2;
  function add(dark=false){page=pdf.addPage([width,height]);y=height-60;page.drawRectangle({x:0,y:0,width,height,color:dark?primary:rgb(1,.99,.97)});page.drawRectangle({x:margin,y:height-30,width:60,height:4,color:accent});page.drawText(String(pdf.getPageCount()),{x:width-margin,y:20,size:8,font,color:accent});}
  function text(value,size=12,dark=false){const ink=dark?rgb(1,1,1):primary;for(const paragraph of String(value||'').split('\n')){let line='';for(let word of paragraph.split(/\s+/)){if(!word)continue;while(font.widthOfTextAtSize(word,size)>usable){if(line){emit(line);line=''}let n=1;while(n<word.length&&font.widthOfTextAtSize(word.slice(0,n+1),size)<usable)n++;emit(word.slice(0,n));word=word.slice(n)}if(!word)continue;const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>usable){emit(line);line=word}else line=next;}if(line)emit(line);y-=size*.65;}function emit(line){if(y<size*1.5+margin)add(dark);page.drawText(line,{x:margin,y,font,size,color:ink});y-=size*1.5;}}
  const dark=kind==='presentation-slide'||kind==='cover-concept';add(dark);
  if(brand.logo){const bytes=Uint8Array.from(atob(brand.logo.split(',')[1]),c=>c.charCodeAt(0)),logo=brand.logo.startsWith('data:image/png')?await pdf.embedPng(bytes):await pdf.embedJpg(bytes),scaled=logo.scaleToFit(130,60);page.drawImage(logo,{x:margin,y:y-scaled.height,width:scaled.width,height:scaled.height});y-=scaled.height+20;}
  text(brand.name,12,dark);y-=20;text(values.title,kind==='presentation-slide'?42:30,dark);text(values.subtitle,16,dark);y-=16;text(brand.tagline,12,dark);text(values.details,12,dark);
  if(kind==='invitation')text(brand.wording,13);
  if(kind==='cover-concept')text('FRONT-COVER CONCEPT · REVIEW DRAFT',8,true);
  if(kind==='participant-guide'&&sourceText){add();text(source.title,20);text(sourceText,11);}
  files.push({name:'lifetogether-'+kind+'.pdf',bytes:await pdf.save()});
 }
 files.push({name:'README.txt',bytes:new TextEncoder().encode('Brand asset pack — review before release. The cover is a FRONT-COVER CONCEPT, not a Lulu-ready wrap. Match the full cover spread to the final interior page count and selected format. Check every exported page and source permission before publishing.')});
 const url=URL.createObjectURL(new Blob([zipFiles(files)],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='lifetogether-branded-assets.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
