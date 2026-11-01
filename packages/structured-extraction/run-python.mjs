import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const runtime=JSON.parse(await readFile(new URL('runtime.json',import.meta.url)));
const mode=process.argv[2],commands={tests:['-m','unittest','discover','-s','tests','-p','test_*.py','-v'],schema:['contract.py','schema'],validate:['contract.py','validate'],fixtures:['contract.py','fixtures']};
if(!commands[mode])throw Error('Use tests, schema or validate');
const name='structured-'+randomUUID();
try{
 const r=spawnSync('docker',['run','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--network','none','--read-only','--tmpfs','/tmp','--cpus','2','--memory','2g','--user','1000:100','--cap-drop','ALL','--env','PYTHONDONTWRITEBYTECODE=1','--mount',`type=bind,src=${root},dst=/work,readonly`,'--workdir','/work','--entrypoint','python',runtime.image,...commands[mode]],{encoding:'utf8',maxBuffer:32*1024*1024,timeout:300000});
 if(r.stderr)process.stderr.write(r.stderr);if(r.error||r.status!==0)throw r.error??Error('Python failed: '+r.status);
 if(mode==='schema')await writeFile(new URL('extraction.schema.json',import.meta.url),r.stdout);
 else if(mode==='validate')await writeFile(new URL('results/validation.json',import.meta.url),r.stdout);
 else if(mode==='fixtures')await writeFile(new URL('results/fixtures.json',import.meta.url),r.stdout);
 else process.stdout.write(r.stdout);
}finally{spawnSync('docker',['rm','-f',name],{stdio:'ignore',timeout:10000});}
