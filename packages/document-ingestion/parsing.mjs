import {fromHtmlIsomorphic as fromHtml} from 'hast-util-from-html-isomorphic';

function nodes(node, tag) {
  return [...(node.tagName===tag?[node]:[]), ...(node.children||[]).flatMap(child=>nodes(child,tag))];
}
const ignored=new Set(['script','style','nav','footer','header']);
function textOf(node) {
  if(ignored.has(node.tagName)) return '';
  if(node.type==='text') return node.value;
  return (node.children||[]).map(textOf).join('');
}
export function parsePdfWords(xml) {
  const tree=fromHtml(xml);
  return nodes(tree,'page').map((page,index)=>({
    number:index+1,width:Number(page.properties.width),height:Number(page.properties.height),
    words:nodes(page,'word').map((word,ordinal)=>({ordinal,text:textOf(word),
      bbox:['xmin','ymin','xmax','ymax'].map(key=>Number(word.properties[key]))})),
  }));
}
function rows(words,tolerance) {
  const groups=[];
  for(const word of words.toSorted((a,b)=>a.bbox[1]-b.bbox[1]||a.ordinal-b.ordinal)) {
    const last=groups.at(-1);
    if(!last||word.bbox[1]-last.top>tolerance) groups.push({top:word.bbox[1],words:[word]});
    else last.words.push(word);
  }
  return groups.flatMap(row=>row.words.toSorted((a,b)=>a.bbox[0]-b.bbox[0]||a.ordinal-b.ordinal));
}
export function orderBodyWords(words,mode,config) {
  const body=words.filter(word=>word.bbox[1]>=config.bodyTop&&word.bbox[3]<=config.bodyBottom);
  if(mode==='stream') return body;
  if(mode==='rows') return rows(body,config.rowTolerancePoints);
  if(mode!=='columns') throw Error('Modo desconocido');
  const left=body.filter(word=>word.bbox[0]<config.columnSplitPoints);
  const right=body.filter(word=>word.bbox[0]>=config.columnSplitPoints);
  return [...rows(left,config.rowTolerancePoints),...rows(right,config.rowTolerancePoints)];
}
export function parseHtmlBlocks(html) {
  const tree=fromHtml(html),root=nodes(tree,'main')[0]||nodes(tree,'body')[0];
  const blocks=[];
  const visit=node=>{
    if(ignored.has(node.tagName)) return;
    if(['h1','h2','h3','p','li','pre'].includes(node.tagName)) {
      const text=textOf(node).replace(/\s+/gu,' ').trim();
      if(text) blocks.push({kind:node.tagName,text});
      return;
    }
    for(const child of node.children||[]) visit(child);
  };
  if(root) visit(root);
  return blocks;
}
