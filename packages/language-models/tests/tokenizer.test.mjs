import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {tokenize,fitVocabulary,encode,teacherForce} from '../tokenizer.mjs';
const corpus=JSON.parse(await readFile(new URL('../corpus.json',import.meta.url)));
test('72 fixed sentences are unique and all vocabulary fitting is train-only',()=>{
 assert.equal(corpus.length,72);assert.equal(new Set(corpus.map(r=>r.text)).size,72);
 const vocabulary=fitVocabulary(corpus),changed=corpus.map(r=>r.split==='train'?r:{...r,text:'FUERADETRAIN'});
 assert.deepEqual(vocabulary,fitVocabulary(changed));assert.ok(!vocabulary.includes('FUERADETRAIN'));
 assert.deepEqual(vocabulary.slice(0,4),['<PAD>','<BOS>','<EOS>','<UNK>']);
});
test('tokenizer preserves Unicode marks, case and punctuation; unknown maps to UNK',()=>{
 assert.deepEqual(tokenize('Árbol cafe\u0301.'),['Árbol','cafe\u0301','.']);const v=fitVocabulary(corpus);
 assert.deepEqual(encode('INEXISTENTE',v),[1,3,2]);
});
test('teacher forcing shifts one position and never puts the target into its own prefix',()=>{
 const v=fitVocabulary(corpus),ids=encode(corpus[0].text,v),pair=teacherForce(ids);
 assert.deepEqual(pair.input,ids.slice(0,-1));assert.deepEqual(pair.target,ids.slice(1));assert.equal(pair.input[0],1);assert.equal(pair.target.at(-1),2);
 assert.throws(()=>teacherForce([1]));
});
