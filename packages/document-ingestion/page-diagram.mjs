const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function pageDiagram(words,{image,scale=1,selected=0,threshold=null,path=false}) {
 const rects=words.map(word=>{
  const [x0,y0,x1,y1]=word.bbox.map(value=>value*scale),active=word.ordinal===selected,low=threshold!==null&&word.confidence<threshold;
  return `<rect data-word="${word.ordinal}" data-low="${low}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${active?'#fbbf2466':'none'}" stroke="${active?'#b45309':low?'#b91c1c':'#0369a1'}" stroke-width="${active?2:0.6}"/>`;
 }).join('');
 const route=path?`<path d="${words.map((word,i)=>`${i?'L':'M'}${(word.bbox[0]+word.bbox[2])*scale/2} ${(word.bbox[1]+word.bbox[3])*scale/2}`).join('')}" fill="none" stroke="#c026d3" stroke-width="1.4" opacity="0.65"/>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792" role="img" aria-label="Página guardada con cajas y selección de palabra"><rect width="612" height="792" fill="white"/><image href="${escape(image)}" width="612" height="792"/>${route}${rects}</svg>`;
}
