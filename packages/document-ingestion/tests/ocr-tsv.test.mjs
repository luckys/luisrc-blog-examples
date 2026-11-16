import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOcrTsv} from '../ocr-tsv.mjs';
test('actual headerless TSV keeps the first word and zero-confidence words',()=>{
 const tsv='1\t1\t0\t0\t0\t0\t0\t0\t100\t100\t-1\t\n5\t1\t1\t1\t1\t1\t10\t20\t30\t8\t0\tcaché\n';
 assert.deepEqual(parseOcrTsv(tsv),[{ordinal:0,text:'caché',confidence:0,bbox:[10,20,40,28]}]);
 const header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n';
 assert.deepEqual(parseOcrTsv(header+tsv),parseOcrTsv(tsv));
 assert.throws(()=>parseOcrTsv('5\tbroken'));
});
