import {readFile, writeFile} from 'node:fs/promises';
import {verifyCapture} from './verify.mjs';
import {stagesChart, entitiesChart, contextChart} from './charts.mjs';
const root = new URL('.', import.meta.url), json = async f => JSON.parse(await readFile(new URL(f, root)));
const {capture, validation, fixtures} = await verifyCapture();
const pack = {kind: 'saved_extraction_replay_not_live_inference', capture, validation, fixtures, documents: await json('documents.json')};
await writeFile(new URL('viewer-data.json', root), JSON.stringify(pack, null, 2) + '\n');
for (const [file, svg] of [['stages.svg', stagesChart(validation.summaries)], ['entities.svg', entitiesChart(validation.summaries)], ['context.svg', contextChart(capture.runs)]]) await writeFile(new URL(file, root), svg);
console.log('Replay de 24 respuestas, 18 controles y tres figuras derivados de la captura original');
