import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePdfWords,orderBodyWords,parseHtmlBlocks} from '../parsing.mjs';
import {characterErrorRate} from '../evaluation.mjs';

test('PDF boxes retain page,geometry,Unicode and stream order independently of naive rows',()=>{
 const xml='<html><body><doc><page width="612" height="792"><flow><block><line><word xMin="40" yMin="100" xMax="90" yMax="112">niño</word><word xMin="40" yMin="130" xMax="100" yMax="142">año</word></line></block></flow><flow><block><line><word xMin="330" yMin="100" xMax="380" yMax="112">caché</word></line></block></flow></page></doc></body></html>';
 const [page]=parsePdfWords(xml);assert.equal(page.number,1);assert.equal(page.width,612);
 assert.deepEqual(page.words.map(w=>w.text),['niño','año','caché']);
 assert.deepEqual(page.words[2].bbox,[330,100,380,112]);
 assert.equal(orderBodyWords(page.words,'rows',{columnSplitPoints:306,bodyTop:70,bodyBottom:700,rowTolerancePoints:2}).map(w=>w.text).join(' '),'niño caché año');
 assert.equal(orderBodyWords(page.words,'columns',{columnSplitPoints:306,bodyTop:70,bodyBottom:700,rowTolerancePoints:2}).map(w=>w.text).join(' '),'niño año caché');
});
test('HTML parser keeps main headings and paragraphs but does not execute scripts or keep menus',()=>{
 const blocks=parseHtmlBlocks('<nav>Menú</nav><main><h1>Guía</h1><p>Dos <strong>réplicas</strong>.</p><script>throw 1</script></main><footer>Contacto</footer>');
 assert.deepEqual(blocks,[{kind:'h1',text:'Guía'},{kind:'p',text:'Dos réplicas.'}]);
});
test('CER uses NFC code points,keeps case and reports real edits rather than confidence',()=>{
 assert.equal(characterErrorRate('año','año').rate,0);
 assert.deepEqual(characterErrorRate('caché','cache'),{edits:1,referenceCharacters:5,rate:.2});
 assert.equal(characterErrorRate('API','api').edits,3);
 assert.throws(()=>characterErrorRate('','texto'));
});
