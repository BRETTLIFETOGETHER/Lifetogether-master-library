import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
export async function inspectPDF(bytes,{kind='interior',width=6.25,height=9.25,expectedPages=0}={}){
 let pdf;try{pdf=await PDFDocument.load(bytes)}catch{throw Error('This PDF cannot be opened. Remove password protection and export a fresh PDF.');}
 const errors=[],warnings=[],pages=pdf.getPages(),dimensions=pages.map(p=>({width:p.getWidth()/72,height:p.getHeight()/72}));
 if(kind==='cover'&&pages.length!==1)errors.push('The cover must be one page containing the back, spine, and front.');
 if(kind==='interior'){
  if(expectedPages&&pages.length!==Number(expectedPages))errors.push(`The PDF has ${pages.length} pages; your book specifies ${expectedPages}.`);
  if(dimensions.some(d=>Math.abs(d.width-width)>.015||Math.abs(d.height-height)>.015))errors.push(`Export every page at ${width} × ${height} inches. The first page is ${dimensions[0].width.toFixed(3)} × ${dimensions[0].height.toFixed(3)} inches.`);
  if(pages.length%2)warnings.push('Odd page count: confirm whether Lulu adds a blank page, then use the final page count for the cover.');
 }
 const unembedded=[];for(const [,object] of pdf.context.enumerateIndirectObjects()){
  if(!(object instanceof PDFDict)||object.get(PDFName.of('Type'))?.toString()!=='/Font')continue;
  const subtype=object.get(PDFName.of('Subtype'))?.toString();if(subtype==='/Type0'||subtype==='/Type3')continue;
  const descriptor=object.lookup(PDFName.of('FontDescriptor'));if(!(descriptor instanceof PDFDict)||!['FontFile','FontFile2','FontFile3'].some(k=>descriptor.has(PDFName.of(k))))unembedded.push(object.get(PDFName.of('BaseFont'))?.toString()||'Unnamed font');
 }
 if(unembedded.length)errors.push('Embed these fonts when exporting: '+[...new Set(unembedded)].join(', '));
 if(kind==='cover')warnings.push('Use Lulu’s exact cover template for the final page count and paper. The visual proof alone cannot certify the spine width.');
 warnings.push('Check text near the trim, images, contrast, and blank pages visually. Bleed artwork and image resolution require visual review.');
 return {pageCount:pages.length,dimensions:dimensions[0],errors,warnings,fontsEmbedded:unembedded.length===0,checkedAt:new Date().toISOString()};
}
