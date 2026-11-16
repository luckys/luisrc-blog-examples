const specs = {
  'RAG-RECALL-PRECISION': {height: 750, title: 'Recuperar evidencia y limitar el ruido', boxes: [
    ['Gold por pregunta', 'Grado 1 o 2: documento relevante'],
    ['Prefijo de k resultados', 'IDs únicos y todos juzgados'],
    ['Aciertos en el prefijo', 'Se cuentan documentos, no suma de grados'],
    ['Precision@k = aciertos / k', 'Los puestos no devueltos siguen en k'],
    ['Recall@k = aciertos / relevantes', 'Gold vacío: Recall no definido'],
    ['Comparar casos y denominadores', 'Test: 12 con respuesta y 3 sin ella'],
    ['Recuperación no es generación', 'El modelo todavía no se ejecuta aquí'],
  ]},
  'RAG-MRR': {height: 750, title: 'Dónde aparece el primer acierto', boxes: [
    ['Lista ordenada y cutoff k', 'Conservar también resultados irrelevantes'],
    ['Primera posición relevante', 'Numeración desde 1 dentro del prefijo'],
    ['RR = 1 / posición', 'Si existe gold pero no acierto: RR = 0'],
    ['MRR = media de RR', 'Declarar las preguntas y su denominador'],
    ['Un primer acierto puede ser parcial', 'Q008: RR@1 = 1; Recall@1 = 0,5'],
    ['Gold vacío en este protocolo', 'RR no definido; no entra en MRR'],
    ['Revisar también cobertura', 'MRR = 1 no demuestra respuesta completa'],
  ]},
  'RAG-NDCG': {height: 850, title: 'Orden, grados y un ideal explícito', boxes: [
    ['Juicio de cada documento', 'Grados 0, 1 y 2 según la rúbrica'],
    ['Ganancia: 2^grado - 1', 'En esta variante: 0, 1 y 3'],
    ['Descuento: log2(posición + 1)', 'Los primeros puestos aportan más'],
    ['DCG: sumar contribuciones', 'Ganancia dividida entre descuento'],
    ['IDCG: ideal de todos los qrels', 'No construirlo sólo con lo recuperado'],
    ['nDCG = DCG / IDCG', 'Si IDCG = 0: no definido'],
    ['Comparar al mismo cutoff', 'nDCG@1 = 1 puede omitir otra fuente'],
    ['Control escrito ≠ búsqueda real', 'Grados mezclados se ilustran aparte'],
  ]},
};
export function rankingDiagram(id) {
  const spec = specs[id];
  if (!spec) throw Error('Unknown ranking diagram');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="'+spec.height+'" viewBox="0 0 360 '+spec.height+'" role="img" aria-label="'+spec.title+'"><rect width="360" height="'+spec.height+'" rx="12" fill="#0f172a"/><g font-family="system-ui,sans-serif" fill="#e2e8f0" text-anchor="middle"><text x="180" y="28" font-size="16">'+spec.title+'</text>'+spec.boxes.map(([title,line],i)=>{const y=50+i*98;return '<rect x="16" y="'+y+'" width="328" height="70" rx="9" fill="#1e293b" stroke="#64748b"/><text x="180" y="'+(y+27)+'" font-size="14">'+title+'</text><text x="180" y="'+(y+50)+'" font-size="11">'+line+'</text>'+(i<spec.boxes.length-1?'<path d="M180 '+(y+73)+'v19m-5-5 5 5 5-5" fill="none" stroke="#38bdf8"/>':'');}).join('')+'</g></svg>\n';
}
