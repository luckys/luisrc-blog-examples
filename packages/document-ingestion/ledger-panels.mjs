import {resolveRange} from './ranges.mjs';
import {pageDiagram} from './page-diagram.mjs';
import {windowDiagram,candidateDiagram} from './ledger-diagrams.mjs';

export function initializeLedgerPanels(data) {
 const $=id=>document.getElementById(id),show=(id,value)=>{$(id).textContent=value;};
 const options=(id,rows)=>{$(id).replaceChildren();for(const[value,label]of rows){const node=document.createElement('option');node.value=String(value);node.textContent=label;$(id).append(node);}};
 const table=(id,rows)=>{$(id).replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}$(id).append(tr);}};
 const ledger=data.ledger;
 options('provenance-document',ledger.documents.map(doc=>[doc.documentId,doc.documentId+' · '+doc.role]));
 const provenanceDocument=()=>ledger.documents.find(doc=>doc.documentId===$('provenance-document').value);
 function drawRange(){
  const doc=provenanceDocument();let first=Number($('provenance-first').value),last=Number($('provenance-last').value);
  if(last<first){last=first;$('provenance-last').value=String(last);}
  const quote=resolveRange(doc,doc.units[first].start,doc.units[last].end);
  const mark=document.createElement('mark');mark.textContent=quote.text;
  $('provenance-text').replaceChildren(document.createTextNode(doc.text.slice(0,quote.start)),mark,document.createTextNode(doc.text.slice(quote.end)));
  show('provenance-quote',JSON.stringify(quote,null,2));
  show('provenance-summary','Unidades ['+first+', '+(last+1)+'); offsets UTF16 ['+quote.start+', '+quote.end+'). Referencias: '+quote.references.length+'.');
  const boxes=quote.references.filter(ref=>ref.origin.bbox).map(ref=>({ordinal:ref.origin.wordOrdinal,bbox:ref.origin.bbox}));
  $('provenance-page').hidden=!boxes.length;
  if(boxes.length){const image=doc.documentId==='COLUMNS'?'columns-preview.png':doc.kind==='ocr'?'ocr-input.png':'scanned-preview.png';$('provenance-page').innerHTML=pageDiagram(boxes,{image,scale:doc.kind==='ocr'?.5:1,selected:-1});}
  else $('provenance-page').replaceChildren();
 }
 function drawDocument(){const doc=provenanceDocument(),rows=doc.units.map(unit=>[unit.ordinal,unit.ordinal+' · '+unit.text]);options('provenance-first',rows);options('provenance-last',rows);$('provenance-last').value=String(Math.min(5,doc.units.length-1));
  show('provenance-identity',JSON.stringify({documentId:doc.documentId,documentVersion:doc.documentVersion,representationId:doc.representationId,contentHash:doc.contentHash,selection:doc.selection,file:doc.file},null,2));
  table('provenance-units',doc.units.map(unit=>[unit.ordinal,unit.text,unit.start,unit.end,JSON.stringify(unit.origin)]));drawRange();
 }
 const groups=()=>ledger[$('dedup-kind').value];
 function drawGroup(){const group=groups()[Number($('dedup-group').value)];show('dedup-detail',JSON.stringify(group,null,2));table('dedup-aliases',group.aliases.map(alias=>[alias.documentId,alias.file,alias.documentVersion]));}
 function drawGroups(){options('dedup-group',groups().map((group,index)=>[index,group.representativeId+' · '+group.role+' · '+group.aliases.length+(group.aliases.length===1?' fuente':' fuentes')]));show('dedup-summary',ledger.documents.length+' fuentes; '+groups().length+' grupos bajo este criterio. Tres controles permanecen fuera del corpus de recuperación.');drawGroup();}
 options('dedup-pair',ledger.nearCandidates.map((pair,index)=>[index,pair.a+' / '+pair.b]));
 function drawPair(){const pair=ledger.nearCandidates[Number($('dedup-pair').value)];for(const side of ['a','b'])show('dedup-'+side,ledger.documents.find(doc=>doc.documentId===pair[side]).text);$('dedup-decision').dataset.decision=pair.decision;show('dedup-decision','Solo revisión: los documentos mantienen grupos separados.');$('dedup-diagram').innerHTML=candidateDiagram(pair.jaccard);}
 options('size-document',ledger.indexDocumentIds.map(id=>[id,id]));options('size-budget',ledger.protocol.windows.budgets.map(budget=>[budget,budget+' unidades; overlap 0']));
 const sizeDocument=()=>ledger.documents.find(doc=>doc.documentId===$('size-document').value);
 const sizeChunks=()=>ledger.chunks.filter(chunk=>chunk.documentId===$('size-document').value&&chunk.budget===Number($('size-budget').value));
 function drawChunk(){const chunks=sizeChunks(),chunk=chunks.find(chunk=>chunk.id===$('size-chunk').value),tokens=data.preflight.rows.find(row=>row.chunkId===chunk.id);show('size-detail',JSON.stringify({chunk,tokenization:tokens},null,2));show('size-text',chunk.text);show('size-summary',(chunk.last-chunk.first)+' unidades; '+tokens.modelTokens+' tokens guardados, incluidos special tokens. Offsets UTF16 ['+chunk.start+', '+chunk.end+').');$('size-diagram').innerHTML=windowDiagram(sizeDocument(),chunks,chunk.id);}
 function drawChunks(){const chunks=sizeChunks();options('size-chunk',chunks.map((chunk,i)=>[chunk.id,(i+1)+' · '+chunk.text.slice(0,55)]));table('size-chunks',chunks.map((chunk,i)=>{const tokens=data.preflight.rows.find(row=>row.chunkId===chunk.id);return[i+1,chunk.first,chunk.last,chunk.start,chunk.end,chunk.last-chunk.first,tokens.modelTokens];}));drawChunk();}
 const bind=(id,fn)=>$(id).addEventListener('change',fn);
 bind('provenance-document',drawDocument);bind('provenance-first',drawRange);bind('provenance-last',drawRange);bind('dedup-kind',drawGroups);bind('dedup-group',drawGroup);bind('dedup-pair',drawPair);bind('size-document',drawChunks);bind('size-budget',drawChunks);bind('size-chunk',drawChunk);
 drawDocument();drawGroups();drawPair();drawChunks();
}
