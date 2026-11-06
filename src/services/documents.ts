import { fileType, MAX_CONTENT_CHARS } from '../../shared/contracts';
export async function extractDocument(file:File):Promise<string> {
  const mime=fileType(file);
  let content='';
  if(mime.includes('openxmlformats')){const {unzipSync}=await import('fflate');let total=0;let count=0;unzipSync(new Uint8Array(await file.arrayBuffer()),{filter(entry){total+=entry.originalSize;count++;if(entry.originalSize>8*1024*1024||total>32*1024*1024||count>2000)throw new Error('Office document expands beyond the safe processing limit. Split the file.');return false;}});}
  if(mime==='application/pdf') {
    const pdfjs=await import('pdfjs-dist');
    const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
    const task=pdfjs.getDocument({data:await file.arrayBuffer()});
    try {
      const pdf=await task.promise;
      if(pdf.numPages>200)throw new Error('PDFs are limited to 200 pages. Split this file into smaller documents.');
      for(let p=1;p<=pdf.numPages;p++) {const page=await pdf.getPage(p);const data=await page.getTextContent();content+=data.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join('')+'\n';if(content.length>MAX_CONTENT_CHARS)throw new Error('Document text exceeds 200,000 characters. Split the file.');page.cleanup();}
    } finally {await task.destroy();}
  } else if(mime.includes('wordprocessingml')) {
    const mammoth=await import('mammoth/mammoth.browser');
    content=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  } else if(mime.includes('spreadsheetml')) {
    const {default:readXlsxFile}=await import('read-excel-file/browser');
    const sheets=await readXlsxFile(file);
    for(const sheet of sheets){const rows=sheet.data;content+=`Sheet: ${sheet.sheet}\n`+rows.map(row=>row.map(v=>v instanceof Date?v.toISOString():String(v??'')).join('\t')).join('\n')+'\n';if(content.length>MAX_CONTENT_CHARS)throw new Error('Spreadsheet text exceeds 200,000 characters. Split the file.');}
  } else {content=await file.text();}
  if(content.length>MAX_CONTENT_CHARS)throw new Error('Document text exceeds 200,000 characters. Split the file.');
  return content.trim();
}
