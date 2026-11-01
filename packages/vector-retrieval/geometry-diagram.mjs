import {normalizeVector} from './vectors.mjs';
export function geometryDiagram(a,b,unitMode=false) {
 const av=unitMode?normalizeVector(a):a,bv=unitMode?normalizeVector(b):b;
 const point=v=>[110+52*v[0],170-52*v[1]];
 const arrow=(v,color)=>{const[x,y]=point(v),length=Math.hypot(v[0],v[1]),ux=v[0]/length,uy=-v[1]/length;return `<path d="M110 170L${x} ${y}M${x-ux*8-uy*4} ${y-uy*8+ux*4}L${x} ${y}L${x-ux*8+uy*4} ${y-uy*8-ux*4}" fill="none" stroke="${color}" stroke-width="3"/>`;};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="340" viewBox="0 0 360 340" role="img" aria-labelledby="geometry-title"><title id="geometry-title">${unitMode?'Direcciones tras normalizar':'Vectores didácticos con longitud original'}</title><rect width="360" height="340" fill="#0f172a"/><g font-family="sans-serif" fill="#e2e8f0"><text x="16" y="26" font-size="17">${unitMode?'Vectores normalizados':'Longitud original del control'}</text><path d="M30 170H338M110 65V275" stroke="#64748b"/><circle cx="110" cy="170" r="52" stroke="#64748b" stroke-dasharray="4 4" fill="none"/>${arrow(av,'#34d399')}${arrow(bv,'#38bdf8')}<text x="16" y="303" fill="#34d399" font-size="16">a: longitud ajustable</text><text x="16" y="327" fill="#38bdf8" font-size="16">b: dirección ajustable, norma 1</text></g></svg>`;
}
