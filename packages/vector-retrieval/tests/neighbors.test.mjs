import test from 'node:test';
import assert from 'node:assert/strict';
import {neighborDiagram} from '../neighbor-diagram.mjs';
test('neighbor comparison renders both sets without inventing an internal graph trace',()=>{
 const svg=neighborDiagram(['A','B','C'],['C','A','X']);
 assert.ok(svg.includes('Compartidos: 2/3'));assert.equal((svg.match(/data-group="reference"/g)||[]).length,3);assert.equal((svg.match(/data-group="selected"/g)||[]).length,3);
 assert.ok(svg.includes('No representa el recorrido del grafo.'));assert.ok(svg.includes('fill="#fb7185"'));assert.ok(svg.includes('fill="#fbbf24"'));
});
test('fewer neighbors retain the exact denominator and invalid duplicate IDs reject',()=>{
 assert.ok(neighborDiagram(['A','B','C'],['A']).includes('Compartidos: 1/3'));
 assert.throws(()=>neighborDiagram(['A','A'],['A']));assert.throws(()=>neighborDiagram([],[]));assert.throws(()=>neighborDiagram(Array.from({length:11},(_,i)=>String(i)),[]));
 assert.ok(neighborDiagram(['<A>'],['<A>']).includes('&lt;A&gt;'));
});
