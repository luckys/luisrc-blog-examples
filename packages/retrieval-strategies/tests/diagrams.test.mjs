import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceDiagram,fusionDiagram} from '../diagrams.mjs';
test('evidence bars keep a fixed percentage scale and no gold is explicit rather than perfect',()=>{
 const svg=evidenceDiagram([{coverage:.5,complete:false},{coverage:1,complete:true}]);assert.ok(svg.includes('width="125"'));assert.ok(svg.includes('data-coverage="1"'));assert.ok(evidenceDiagram([]).includes('no aplicable'));assert.doesNotMatch(evidenceDiagram([]),/data-fact=/);
});
test('RRF diagram preserves contribution geometry and escapes source labels',()=>{
 const ranking=[{id:'a',score:2/61,contributions:[{listIndex:0,contribution:1/61},{listIndex:1,contribution:1/61}]}],svg=fusionDiagram(ranking,new Map([['a','<source>']]),60);
 assert.equal([...svg.matchAll(/width="125"/g)].length,2);assert.ok(svg.includes('&lt;source&gt;'));assert.doesNotMatch(svg,/<source>/);assert.ok(svg.includes('2 / (60 + 1)'));
});
