import {initializeChunkPanels} from './chunk-panels.mjs';
import {initializeLedgerPanels} from './ledger-panels.mjs';
import {pageDiagram} from './page-diagram.mjs';
const $=id=>document.getElementById(id),show=(id,value)=>{$(id).textContent=value;};
const fmt=value=>value.toLocaleString('es-ES',{maximumFractionDigits:9});
function options(id,rows){$(id).replaceChildren();for(const [value,label]of rows){const option=document.createElement('option');option.value=String(value);option.textContent=label;$(id).append(option);}}
function table(id,rows){$(id).replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=typeof value==='number'?fmt(value):value;tr.append(td);}$(id).append(tr);}}
async function start(){
 const response=await fetch('viewer-data.json');if(!response.ok)throw Error('No se pudo cargar la captura');const data=await response.json();if(data.kind!=='saved_document_extraction_not_live_ocr')throw Error('Formato incompatible');
 show('status','Captura '+data.capturedAt+'. PDF y OCR reales sobre fixtures sintéticos. Los paneles finales comparan recuperación en tres documentos sintéticos; no demuestran calidad en documentos arbitrarios.');
 const pdfs=data.documents.filter(doc=>doc.pages),columns=pdfs.find(doc=>doc.id==='COLUMNS');
 options('pdf-document',pdfs.map(doc=>[doc.id,doc.id+' · '+doc.file]));
 const pdfWords=()=>pdfs.find(doc=>doc.id===$('pdf-document').value).pages[0].words;
 function drawPdfWord(){
  const doc=pdfs.find(doc=>doc.id===$('pdf-document').value),words=pdfWords(),word=words.find(word=>word.ordinal===Number($('pdf-word').value));
  show('pdf-details',word?JSON.stringify({page:1,coordinateSpace:'puntos PDF, origen superior izquierdo',...word},null,2):'La capa de texto está vacía. El panel OCR conserva su reconocimiento posterior.');
  const image=doc.id==='COLUMNS'?'columns-preview.png':doc.id==='SCAN'?'ocr-input.png':'scanned-preview.png';
  $('pdf-diagram').innerHTML=pageDiagram(words,{image,selected:word?.ordinal??-1});
 }
 function drawPdf(){const doc=pdfs.find(doc=>doc.id===$('pdf-document').value),words=pdfWords();show('pdf-summary',words.length+' palabras; página 1, 612 × 792 puntos. No son tokens del modelo.');options('pdf-word',words.map(word=>[word.ordinal,word.ordinal+' · '+word.text]));$('pdf-word').disabled=!words.length;show('pdf-raw',doc.rawText);table('pdf-table',words.map(word=>[word.ordinal,word.text,JSON.stringify(word.bbox)]));drawPdfWord();}
 options('ocr-word',data.ocr.words.map(word=>[word.ordinal,word.ordinal+' · '+word.text]));
 function drawOcr(){const threshold=Number($('threshold').value),word=data.ocr.words.find(word=>word.ordinal===Number($('ocr-word').value)),marked=data.ocr.words.filter(word=>word.confidence<threshold).length;
  show('threshold-label',fmt(threshold));show('ocr-marked',marked+(marked===1?' palabra resaltada de ':' palabras resaltadas de ')+data.ocr.words.length+'. Se conservan todas.');
  show('ocr-details',JSON.stringify({coordinateSpace:'píxeles, origen superior izquierdo',...word},null,2));
  $('ocr-diagram').innerHTML=pageDiagram(data.ocr.words,{image:'ocr-input.png',scale:.5,selected:word.ordinal,threshold});
 }
 show('ocr-summary',data.ocr.words.length+' palabras; confidence global '+data.ocr.confidence+'; CER '+fmt(data.metrics.ocr.rate)+' ('+data.metrics.ocr.edits+'/'+data.metrics.ocr.referenceCharacters+'). Imagen '+data.ocr.width+'×'+data.ocr.height+' px, 144 DPI.');
 show('ocr-text',data.ocr.text);show('ocr-truth',data.truth.singleText);table('ocr-table',data.ocr.words.map(word=>[word.ordinal,word.text,word.confidence,JSON.stringify(word.bbox)]));
 function orderedWords(){const byOrdinal=new Map(columns.pages[0].words.map(word=>[word.ordinal,word]));return data.layoutOrders[$('layout-mode').value].map(ordinal=>byOrdinal.get(ordinal));}
 function drawLayoutWord(){const words=orderedWords(),word=words.find(word=>word.ordinal===Number($('layout-word').value));show('layout-details',JSON.stringify({position:words.indexOf(word)+1,...word},null,2));$('layout-diagram').innerHTML=pageDiagram(words,{image:'columns-preview.png',selected:word.ordinal,path:true});}
 function drawLayout(){const mode=$('layout-mode').value,words=orderedWords(),metric=data.metrics.layout[mode];options('layout-word',words.map((word,i)=>[word.ordinal,(i+1)+' · '+word.text]));show('layout-summary',words.length+' palabras del cuerpo; '+metric.edits+' ediciones / '+metric.referenceCharacters+' caracteres = '+fmt(metric.rate)+'. Distancia de orden, no error del OCR.');show('layout-text',data.layout[mode]);table('layout-table',words.map((word,i)=>[i+1,word.ordinal,word.text]));drawLayoutWord();}
 const html=data.documents.filter(doc=>doc.blocks);options('html-document',html.map(doc=>[doc.id,doc.id+' · '+doc.file]));
 function drawHtml(){const doc=html.find(doc=>doc.id===$('html-document').value);show('html-summary',doc.blocks.length+' bloques extraídos; navegación, footer, scripts y estilos excluidos.');show('html-source',doc.source);$('html-blocks').replaceChildren();for(const block of doc.blocks){const pre=document.createElement('pre');pre.textContent=block.kind+': '+block.text;$('html-blocks').append(pre);}}
 const bind=(id,event,fn)=>$(id).addEventListener(event,fn);
 bind('pdf-document','change',drawPdf);bind('pdf-word','change',drawPdfWord);bind('ocr-word','change',drawOcr);bind('threshold','input',drawOcr);bind('layout-mode','change',drawLayout);bind('layout-word','change',drawLayoutWord);bind('html-document','change',drawHtml);
 for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-panel]')){const active=other===button;other.setAttribute('aria-pressed',String(active));$(other.dataset.panel).hidden=!active;}});
 drawPdf();drawOcr();drawLayout();drawHtml();initializeLedgerPanels(data);initializeChunkPanels(data);
}
start().catch(error=>show('status',error.message));
