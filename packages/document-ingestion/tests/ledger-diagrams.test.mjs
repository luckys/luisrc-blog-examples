import test from 'node:test';
import assert from 'node:assert/strict';
import {windowDiagram,candidateDiagram} from '../ledger-diagrams.mjs';
test('window strip measures unit intervals and candidate similarity never implies automatic merge',()=>{
 const chunks=[{id:'a',first:0,last:2},{id:'b',first:2,last:3}];
 const svg=windowDiagram({units:[1,2,3]},chunks,'b');
 assert.ok(svg.includes('x="12" y="60" width="224"'));
 assert.ok(svg.includes('x="236" y="60" width="112"'));
 assert.ok(svg.includes('Selección: [2, 3)'));assert.ok(svg.includes('unidades, no tokens'));
 assert.ok(candidateDiagram(.5).includes('width="168"'));assert.ok(candidateDiagram(.5).includes('no se fusionó'));
 assert.throws(()=>candidateDiagram(2));assert.throws(()=>windowDiagram({units:[]},[],'a'));
});
