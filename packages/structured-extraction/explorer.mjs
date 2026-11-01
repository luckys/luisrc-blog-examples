import {entitiesChart} from './charts.mjs';
const $ = id => document.getElementById(id), show = (id, value) => { $(id).textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); };
const names = {instructions: 'Instrucciones', schema: '+ schema', 'few-shot': '+ dos ejemplos'};
function option(select, value, label) { const el = document.createElement('option'); el.value = value; el.textContent = label; select.append(el); }
export function effectiveCounts(rows, documents) {
  let tp = 0, fp = 0, fn = 0;
  for (const row of rows) {
    const doc = documents.find(d => d.id === row.documentId), key = e => JSON.stringify([e.type, e.text]);
    const p = new Set((row.accepted ? row.data.entities : []).map(key)), gold = new Set(doc.expected.map(key));
    tp += [...p].filter(e => gold.has(e)).length; fp += [...p].filter(e => !gold.has(e)).length; fn += [...gold].filter(e => !p.has(e)).length;
  }
  return {tp, fp, fn, precision: tp+fp ? tp/(tp+fp) : null, recall: tp+fn ? tp/(tp+fn) : null, f1: 2*tp+fp+fn ? 2*tp/(2*tp+fp+fn) : null};
}
async function start() {
  const response = await fetch('viewer-data.json'); if (!response.ok) throw Error('No se pudo cargar la captura');
  const data = await response.json();
  if (data.kind !== 'saved_extraction_replay_not_live_inference') throw Error('Captura incompatible');
  show('status', `Captura ${data.capture.capturedAt}: 24 respuestas, 8 documentos y 18 controles manuales.`);
  for (const v of data.capture.protocol.variants) option($('variant'), v, names[v]);
  for (const d of data.documents) option($('document'), d.id, d.id + ' · ' + d.source.slice(0, 45));
  for (const f of data.fixtures.rows) option($('fixture'), f.id, f.id + ' · ' + f.result.stage);
  const selectResponse = () => {
    const variant = $('variant').value, id = $('document').value;
    const run = data.capture.runs.find(r => r.variant === variant && r.documentId === id), doc = data.documents.find(d => d.id === id), checked = data.validation.rows.find(r => r.variant === variant && r.documentId === id);
    show('source', doc.source); show('raw', run.raw); show('messages', run.messages); show('chat', run.renderedChat); show('gold', doc.expected); show('checked', checked);
    show('outcome', `Primera etapa: ${checked.stage}. TP ${checked.counts.tp}, FP ${checked.counts.fp}, FN ${checked.counts.fn}. Aceptada significa pasar los controles, no acertar.`);
    show('tokens', `Entrada: ${run.inputIds.length} tokens. Generados: ${run.tokenCount}. Parada: ${run.reason}. Longitudes de esta captura; no comparación de latencia.`);
  };
  const selectFixture = () => {
    const f = data.fixtures.rows.find(f => f.id === $('fixture').value);
    show('fixture-source', f.source); show('fixture-raw', f.raw); show('fixture-result', f.result);
    show('fixture-outcome', `Etapa: ${f.result.stage}. Juicio semántico del autor: ${f.expectedSemanticCorrect === null ? 'no evaluado' : f.expectedSemanticCorrect ? 'correcto' : 'incorrecto'}.`);
  };
  for (const d of data.documents) {
    const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.value = d.id; input.checked = true; input.name = 'included'; label.append(input, ' ' + d.id); $('subset').append(label);
  }
  const evaluate = () => {
    const ids = new Set([...$('subset').querySelectorAll('input:checked')].map(el => el.value));
    $('metric-rows').replaceChildren(); const selected = [];
    for (const variant of data.capture.protocol.variants) {
      const rows = data.validation.rows.filter(r => r.variant === variant && ids.has(r.documentId)), metrics = effectiveCounts(rows, data.documents), tr = document.createElement('tr'); tr.dataset.variant = variant;
      for (const value of [names[variant], metrics.tp, metrics.fp, metrics.fn, ...['precision','recall','f1'].map(k => metrics[k] === null ? 'No definida' : metrics[k].toLocaleString('es-ES', {maximumFractionDigits: 3}))]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      $('metric-rows').append(tr); selected.push({variant, ...metrics});
    }
    $('selected-chart').innerHTML = entitiesChart(selected);
    show('denominator', `${ids.size} documentos por variante; ${data.documents.filter(d => ids.has(d.id)).reduce((n,d) => n+d.expected.length, 0)} entidades esperadas. Las figuras inferiores conservan la muestra completa.`);
  };
  $('variant').addEventListener('change', selectResponse); $('document').addEventListener('change', selectResponse); $('fixture').addEventListener('change', selectFixture); $('subset').addEventListener('change', evaluate);
  for (const button of document.querySelectorAll('[data-panel]')) button.addEventListener('click', () => {
    for (const b of document.querySelectorAll('[data-panel]')) { const selected = b === button; b.setAttribute('aria-pressed', String(selected)); $(b.dataset.panel).hidden = !selected; }
  });
  selectResponse(); selectFixture(); evaluate();
}
if (typeof document !== 'undefined') start().catch(error => show('status', error.message));
