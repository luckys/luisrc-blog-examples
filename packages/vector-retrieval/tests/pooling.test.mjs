import test from 'node:test';
import assert from 'node:assert/strict';
import {maskedMeanPool} from '../pooling.mjs';
test('pooling excludes only masked positions and keeps unmasked special tokens',()=>{
 const hidden={dims:[2,3,2],data:[1,2,3,4,100,100,10,20,30,40,50,60]},mask={dims:[2,3],data:[1n,1n,0n,1n,1n,1n]};
 assert.deepEqual(maskedMeanPool(hidden,mask),[[2,3],[30,40]]);
});
test('pooling rejects empty rows and incompatible tensor shapes',()=>{
 assert.throws(()=>maskedMeanPool({dims:[1,1,2],data:[1,2]},{dims:[1,1],data:[0]}));
 assert.throws(()=>maskedMeanPool({dims:[1,2,2],data:[1,2,3,4]},{dims:[2,1],data:[1,1]}));
});
