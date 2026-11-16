import {writeFile} from 'node:fs/promises';
import {root,json} from './io.mjs';
import {orderChart,candidateChart,contextChart,formatChart,groundingChart,citationChart,abstentionChart,comparisonChart} from './charts.mjs';
const data=await json('viewer-data.json');
for(const[file,fn]of [['reranker-order.svg',orderChart],['candidate-budgets.svg',candidateChart],['context-budgets.svg',contextChart],['format-failures.svg',formatChart],['grounding-example.svg',groundingChart],['citation-controls.svg',citationChart],['no-answer.svg',abstentionChart],['answers-comparison.svg',comparisonChart]])await writeFile(new URL(file,root),fn(data));console.log('Eight figures from frozen logits,generations and explicit editorial controls.');
