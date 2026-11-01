import test from 'node:test';
import assert from 'node:assert/strict';
import {compareGeometry,toyVectors} from '../geometry.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('cosine ignores positive scale but raw dot product changes',()=>{
 const base=compareGeometry([3,4],[0,2]),scaled=compareGeometry([6,8],[0,2]);
 close(base.dot,8);close(scaled.dot,16);close(base.cosine,.8);close(scaled.cosine,.8);close(base.unitSquaredL2,.4);
});
test('raw L2 and normalized L2 can rank candidates differently',()=>{
 const a=compareGeometry([1,0],[2,0]),b=compareGeometry([1,0],[.9,.1]);
 close(a.squaredL2,1);close(b.squaredL2,.02);assert.ok(b.squaredL2<a.squaredL2);assert.ok(a.unitSquaredL2<b.unitSquaredL2);close(a.unitSquaredL2,0);
});
test('toy diagram inputs are mathematical controls with bounded finite sliders',()=>{
 assert.deepEqual(toyVectors(0,2),{a:[2,0],b:[1,0]});
 const {a,b}=toyVectors(90,4);close(compareGeometry(a,b).cosine,0);
 for(const args of [[181,1],[0,0],[0,5],[NaN,1]])assert.throws(()=>toyVectors(...args));
});
