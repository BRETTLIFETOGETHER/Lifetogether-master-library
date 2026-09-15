export {inspectPDF} from './pdf-inspection.mjs';
export async function openPDF(bytes,canvas,label){
 const pdfjs=await import('./pdf-viewer.js');pdfjs.GlobalWorkerOptions.workerSrc='./pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false}).promise;let current=1,renderTask=null,generation=0;
 async function draw(number){const ticket=++generation;current=Math.min(pdf.numPages,Math.max(1,Number(number)||1));if(renderTask){renderTask.cancel();try{await renderTask.promise}catch{}}
  const page=await pdf.getPage(current);if(ticket!==generation)return;const natural=page.getViewport({scale:1}),width=Math.min(900,canvas.parentElement.clientWidth||600),viewport=page.getViewport({scale:width/natural.width});canvas.width=viewport.width;canvas.height=viewport.height;renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});try{await renderTask.promise}catch(e){if(e.name!=='RenderingCancelledException')throw e}if(ticket===generation)label.textContent=`Page ${current} of ${pdf.numPages}`;
 }
 await draw(1);return {draw,next:()=>draw(current+1),previous:()=>draw(current-1),destroy:()=>{generation++;renderTask?.cancel();return pdf.destroy()},pages:pdf.numPages};
}
