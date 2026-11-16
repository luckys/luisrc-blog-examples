import test from 'node:test';import assert from 'node:assert/strict';import {attemptState} from '../generation-io.v1.mjs';
test('a saved result is reused even after an invalid response',()=>{assert.equal(attemptState('A-Q001',[{event:'case_started',id:'A-Q001'}],true),'reused');});
test('a started missing result is interrupted,not eligible for a favorable retry',()=>{assert.equal(attemptState('A-Q001',[{event:'case_started',id:'A-Q001'}],false),'interrupted_unknown');});
test('only a never-started case is eligible for generation',()=>{assert.equal(attemptState('B-Q001',[{event:'case_started',id:'A-Q001'}],false),'not_started');});
