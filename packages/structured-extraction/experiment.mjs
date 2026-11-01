import {AutoTokenizer,AutoModelForCausalLM,env} from '@huggingface/transformers';
import {readFile,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus,arch,platform} from 'node:os';
import {fileURLToPath} from 'node:url';
import {buildMessages} from './prompts.mjs';
const root=new URL('.',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root)));
const protocol=await json('protocol.json'),runtime=await json('runtime.json'),schema=await json('extraction.schema.json'),examples=await json('few-shot.json'),documents=await json('documents.json'),snapshot=await json('model-files.json');
env.allowRemoteModels=false;env.allowLocalModels=true;
const local=fileURLToPath(new URL('.cache/model',root));
for(const f of snapshot.files){const hash=createHash('sha256');for await(const b of createReadStream(new URL('.cache/model/'+f.file,root)))hash.update(b);if(hash.digest('hex')!==f.sha256)throw Error('Model file changed: '+f.file);}
const sourceFiles=['protocol.json','runtime.json','documents.json','few-shot.json','extraction.schema.json','prompts.mjs','experiment.mjs','model-files.json','../../pnpm-lock.yaml'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,root))).digest('hex')])));
const tokenizer=await AutoTokenizer.from_pretrained(local,{local_files_only:true});
const model=await AutoModelForCausalLM.from_pretrained(local,{local_files_only:true,dtype:runtime.dtype,device:'cpu',session_options:{intraOpNumThreads:runtime.intraOpNumThreads,interOpNumThreads:runtime.interOpNumThreads}});
const eos=Array.isArray(model.generation_config.eos_token_id)?model.generation_config.eos_token_id:[model.generation_config.eos_token_id];
const runs=[];
try{for(const variant of protocol.variants)for(const doc of documents){
 const messages=buildMessages(variant,doc.source,schema,examples);
 const input=tokenizer.apply_chat_template(messages,{tokenize:true,add_generation_prompt:true,return_dict:true});
 const inputIds=input.input_ids.tolist()[0].map(Number),start=performance.now();
 const output=await model.generate({...input,...protocol.decode});
 const generatedIds=output.tolist()[0].slice(inputIds.length).map(Number),elapsedMs=performance.now()-start;
 const raw=tokenizer.decode(generatedIds,{skip_special_tokens:true,clean_up_tokenization_spaces:false});
 const reason=eos.includes(generatedIds.at(-1))?'eos':'max_new_tokens';
 runs.push({documentId:doc.id,variant,messages,renderedChat:tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true}),inputIds,generatedIds,tokenCount:generatedIds.length,raw,reason,elapsedMs});
 console.log(variant+' '+doc.id+' '+reason+' '+generatedIds.length+' tokens');
}}finally{await model.dispose();}
const capture={capturedAt:new Date().toISOString(),protocol,sourceHashes,environment:{node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0].model,transformersJs:runtime.transformersJs,dtype:runtime.dtype,device:runtime.device,intraOpNumThreads:runtime.intraOpNumThreads,interOpNumThreads:runtime.interOpNumThreads},runs};
await writeFile(new URL('results/generations.json',root),JSON.stringify(capture,null,2)+'\n');
