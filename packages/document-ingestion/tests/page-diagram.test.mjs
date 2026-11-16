import test from 'node:test';
import assert from 'node:assert/strict';
import {pageDiagram} from '../page-diagram.mjs';
test('OCR boxes scale pixels into PDF points and keep every word regardless of confidence',()=>{
 const words=[{ordinal:0,text:'a',bbox:[20,40,60,80],confidence:0},{ordinal:1,text:'b',bbox:[80,40,100,80],confidence:90}];
 const svg=pageDiagram(words,{image:'input.png',scale:.5,threshold:50,selected:1,path:true});
 assert.ok(svg.includes('data-word="0" data-low="true" x="10" y="20" width="20" height="20"'));
 assert.ok(svg.includes('data-word="1" data-low="false"'));
 assert.ok(svg.includes('M20 30L45 30'));
 assert.equal((svg.match(/data-word=/g)||[]).length,2);
 assert.ok(pageDiagram([],{image:'input.png'}).includes('input.png'));
});
