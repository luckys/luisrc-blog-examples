import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {readFile,writeFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),content=JSON.parse(await readFile(new URL('fixture-content.json',root)));
try {await access(new URL('fixtures/digital.pdf',root));throw Error('Fixtures exist: preserve/version them before regeneration');} catch(error) {if(error.code!=='ENOENT')throw error;}
async function document() {
 const pdf=await PDFDocument.create();pdf.setCreationDate(new Date('2026-11-01T00:00:00Z'));pdf.setModificationDate(new Date('2026-11-01T00:00:00Z'));
 pdf.setCreator('Original synthetic ingestion lab');pdf.setAuthor('Luis Ramírez Calle');
 return {pdf,font:await pdf.embedFont(StandardFonts.Helvetica),bold:await pdf.embedFont(StandardFonts.HelveticaBold)};
}
function wrap(text,font,size,maxWidth) {
 const lines=[];let line='';
 for(const word of text.split(' ')) {const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>maxWidth&&line){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
const single=await document(),page=single.pdf.addPage([612,792]);
page.drawText(content.single.title,{x:40,y:752,font:single.bold,size:18});
let y=704;const lines=[];
for(const paragraph of content.single.paragraphs) {
 for(const line of wrap(paragraph,single.font,12,532)) {assert.ok(y>75);page.drawText(line,{x:40,y,font:single.font,size:12});lines.push(line);y-=18;}
 y-=12;
}
const footer='AtlasQueue | Página 1';page.drawText(footer,{x:40,y:35,font:single.font,size:10,color:rgb(.35,.35,.35)});
await writeFile(new URL('fixtures/digital.pdf',root),await single.pdf.save());
const columns=await document(),two=columns.pdf.addPage([612,792]);two.drawText(content.columns.title,{x:40,y:752,font:columns.bold,size:17});
for(let i=0;i<Math.max(content.columns.left.length,content.columns.right.length);i++) {
 for(const [x,items] of [[40,content.columns.left],[330,content.columns.right]])if(items[i]) {
  const font=i===0?columns.bold:columns.font,size=i===0?14:12;assert.ok(font.widthOfTextAtSize(items[i],size)<245);
  two.drawText(items[i],{x,y:704-i*30,font,size});
 }
}
two.drawText('AtlasQueue | Columnas de ejemplo',{x:40,y:35,font:columns.font,size:10});
await writeFile(new URL('fixtures/columns.pdf',root),await columns.pdf.save());
const raster=(file,output)=>execFileSync('pdftoppm',['-r','144','-f','1','-singlefile','-png',fileURLToPath(new URL(file,root)),fileURLToPath(new URL(output,root))],{timeout:30000});
raster('fixtures/digital.pdf','scanned-preview');raster('fixtures/columns.pdf','columns-preview');
const scan=await document(),image=await scan.pdf.embedPng(await readFile(new URL('scanned-preview.png',root))),scanPage=scan.pdf.addPage([612,792]);scanPage.drawImage(image,{x:0,y:0,width:612,height:792});
await writeFile(new URL('fixtures/scanned.pdf',root),await scan.pdf.save());
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+escape(content.html.title)+'</title></head><body><nav>Inicio · Iniciar sesión</nav><main><h1>'+escape(content.html.title)+'</h1>'+content.html.paragraphs.map(text=>'<p>'+escape(text)+'</p>').join('')+'</main><script>throw new Error("This script must never run in the extractor")</script><footer>Contacto · 2026</footer></body></html>';
await writeFile(new URL('fixtures/guide.html',root),html);await writeFile(new URL('fixtures/guide-mirror.html',root),html.replace('Contacto · 2026','Contacto · Noviembre de 2026'));
await writeFile(new URL('fixtures/truth.json',root),JSON.stringify({singleText:[content.single.title,...lines,footer].join('\n'),columnsBody:[...content.columns.left,...content.columns.right].join('\n')},null,2)+'\n');
console.log('Three original PDFs, two HTML variants and144dpi previews created; scanned.pdf contains only an image.');
