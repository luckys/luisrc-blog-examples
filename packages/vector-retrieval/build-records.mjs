const topics = [
 ['database','La transacción puede revertirse antes del commit. Los bloqueos protegen cambios concurrentes.'],
 ['identity','El access token caduca y el refresh token permite renovar una sesión autorizada.'],
 ['messaging','Un consumidor procesa mensajes y confirma el offset después de guardar el resultado.'],
 ['observability','Una alerta de latencia elevada requiere revisar métricas, logs y trazas.'],
 ['deployment','El despliegue cambia la versión del servicio y permite volver a la anterior.'],
];
const states = ['pendiente de revisión','en investigación','resuelto por soporte','esperando confirmación','cerrado sin cambios','en seguimiento','en validación'];
export function buildRecords(corpus, queries) {
 const documents = corpus.map(d => ({id:d.id, kind:'document', text:d.title+' '+d.body}));
 const queryRows = queries.map(q => ({id:q.id, kind:'query', text:q.text}));
 const controls = Array.from({length:980},(_,i)=>({id:'S'+String(i+1).padStart(4,'0'),kind:'index-control',text:`Registro de soporte ${i+1}, área ${topics[i%topics.length][0]}. ${topics[i%topics.length][1]} Estado: ${states[Math.floor(i/topics.length)%states.length]}. Referencia interna caso-${String(i+1).padStart(4,'0')}.`}));
 return [...documents,...queryRows,...controls];
}
