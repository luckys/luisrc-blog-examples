import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptToolProposal} from '../tool-gate.mjs';
const context={sourceId:'E01',source:'Ana Ruiz trabaja.',canSubmit:true};
test('tool gate rejects unknown names, fields and unapproved actions before arguments',async()=>{
 let calls=0;const validate=async()=>{calls++;return {accepted:true,data:{entities:[]}};};
 for(const proposal of [{name:'delete_database',arguments:'{}'},{name:'submit_entities',arguments:'{}',sourceId:'E99'},{name:'submit_entities',arguments:{}}])await assert.rejects(acceptToolProposal(proposal,context,validate));
 await assert.rejects(acceptToolProposal({name:'submit_entities',arguments:'{}'},{...context,canSubmit:false},validate));
 assert.equal(calls,0);
});
test('tool gate validates against trusted source and returns only a local draft',async()=>{
 let seen;const validate=async(raw,source)=>{seen={raw,source};return {accepted:true,data:{entities:[]}};};
 const draft=await acceptToolProposal({name:'submit_entities',arguments:'{"entities":[]}'},context,validate);
 assert.deepEqual(seen,{raw:'{"entities":[]}',source:context.source});assert.deepEqual(draft,{sourceId:'E01',entities:[]});
});
test('tool gate never accepts a schema or evidence rejection',async()=>{
 await assert.rejects(acceptToolProposal({name:'submit_entities',arguments:'{}'},context,async()=>({accepted:false,stage:'evidence'})),/rejected/);
});
