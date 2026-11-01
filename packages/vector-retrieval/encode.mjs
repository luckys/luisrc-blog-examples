import {AutoTokenizer,AutoModel,env} from '@huggingface/transformers';
import {readFile,writeFile,access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {cpus,arch,platform} from 'node:os';
import {buildRecords} from './build-records.mjs';
import {maskedMeanPool} from './pooling.mjs';
const root=new URL('.',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root)));
try{await access(new URL('results/embeddings.json',root));throw Error('Embedding capture already exists; preserve/version it before a new experiment');}catch(error){if(error.code!=='ENOENT')throw error;}
const protocol=await json('protocol.json'),runtime=await json('runtime.json'),snapshot=await json('model-files.json');
for(const file of snapshot.files){const hash=createHash('sha256');for await(const chunk of createReadStream(new URL('.cache/model/'+file.file,root)))hash.update(chunk);if(hash.digest('hex')!==file.sha256)throw Error('Model snapshot mismatch: '+file.file);}
const sourceFiles=['protocol.json','runtime.json','corpus.json','queries.json','build-records.mjs','pooling.mjs','encode.mjs','model-files.json','dependency-lock.capture.json'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,createHash('sha256').update(await readFile(new URL(file,root))).digest('hex')])));
const corpus=await json('corpus.json'),queries=await json('queries.json'),records=buildRecords(corpus,queries);
const local=fileURLToPath(new URL('.cache/model',root)),config=protocol.encoder;
env.allowRemoteModels=false;env.allowLocalModels=true;
const tokenizer=await AutoTokenizer.from_pretrained(local,{local_files_only:true});
const model=await AutoModel.from_pretrained(local,{local_files_only:true,dtype:config.dtype,device:config.device,session_options:{intraOpNumThreads:config.intraOpNumThreads,interOpNumThreads:config.interOpNumThreads}});
const rows=[],started=performance.now();
try{
 for(let start=0;start<records.length;start+=config.batchSize){
  const batch=records.slice(start,start+config.batchSize),texts=batch.map(r=>r.text);
  const full=tokenizer(texts,{padding:false,truncation:false,return_tensor:false});
  const input=tokenizer(texts,{padding:true,truncation:true,max_length:config.maxTokens});
  const output=await model(input),vectors=maskedMeanPool(output.last_hidden_state,input.attention_mask);
  const ids=input.input_ids.tolist().map(row=>row.map(Number)),masks=input.attention_mask.tolist().map(row=>row.map(Number));
  for(let i=0;i<batch.length;i++){
   if(vectors[i].length!==config.dimensions)throw Error('Unexpected embedding dimensions');
   rows.push({...batch[i],untruncatedTokenCount:full.input_ids[i].length,inputIds:ids[i],attentionMask:masks[i],rawVector:vectors[i]});
  }
  console.log('Encoded '+rows.length+'/'+records.length);
 }
}finally{await model.dispose();}
const capture={capturedAt:new Date().toISOString(),kind:'real_local_onnx_encoder_inference',protocol,sourceHashes,environment:{node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0].model,transformersJs:runtime.transformersJs,dtype:config.dtype,device:config.device,threads:[config.intraOpNumThreads,config.interOpNumThreads]},diagnosticEncodingMs:performance.now()-started,rows};
await writeFile(new URL('results/embeddings.json',root),JSON.stringify(capture,null,2)+'\n');
console.log('Preserved '+rows.length+' real 384d vectors; no relevance-based selection');
