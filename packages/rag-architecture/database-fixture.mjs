import {Client} from 'pg';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),json=async file=>JSON.parse(await readFile(new URL(file,root)));
export async function withDatabaseFixture(run){
 const runtime=await json('runtime.json'),corpus=await json('corpus.json'),schema=await readFile(new URL('schema.sql',root),'utf8');
 const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 const name='rag-operations-'+randomUUID(),clients=new Set();let started=false,port;
 const result={runtime,corpus,containerRemoved:false};
 async function connect(role='rag_admin'){
  const client=new Client({host:'127.0.0.1',port,user:role,database:'rag_admin',connectionTimeoutMillis:1500,query_timeout:5000});
  try{await client.connect();clients.add(client);return client;}catch(error){await client.end().catch(()=>{});throw error;}
 }
 try{
  docker('run','--detach','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--user','999:999','--cap-drop','ALL','--security-opt','no-new-privileges:true','--read-only','--tmpfs','/var/lib/postgresql/data:rw,uid=999,gid=999,mode=0700,size=768m','--tmpfs','/var/run/postgresql:rw,uid=999,gid=999,mode=0775','--cpus','2','--memory','1g','--publish','127.0.0.1::5432','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_USER=rag_admin','--env','POSTGRES_DB=rag_admin',runtime.image);started=true;
  const inspect=JSON.parse(docker('inspect',name))[0],binding=inspect.NetworkSettings.Ports['5432/tcp'][0];assert.equal(binding.HostIp,'127.0.0.1');assert.equal(inspect.HostConfig.ReadonlyRootfs,true);assert.deepEqual(inspect.HostConfig.CapDrop,['ALL']);port=Number(binding.HostPort);
  let admin;for(let i=0;i<80;i++){try{admin=await connect();break;}catch{await new Promise(resolve=>setTimeout(resolve,150));}}
  if(!admin)throw Error('PostgreSQL did not become ready');
  result.postgres=(await admin.query('SELECT version() AS version')).rows[0].version;assert.match(result.postgres,/PostgreSQL 17\./);
  await admin.query('REVOKE ALL ON DATABASE rag_admin FROM PUBLIC');await admin.query(schema);
  for(const principal of corpus.principals){
   await admin.query(`CREATE ROLE ${principal.role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
   await admin.query(`GRANT CONNECT ON DATABASE rag_admin TO ${principal.role}; GRANT USAGE ON SCHEMA public TO ${principal.role}; GRANT SELECT ON documents,principals TO ${principal.role}`);
   await admin.query('INSERT INTO principals(role_name,tenant,max_level) VALUES($1,$2,$3)',[principal.role,principal.tenant,principal.maxLevel]);
  }
  for(const d of corpus.documents)await admin.query('INSERT INTO documents(id,tenant,document_key,revision,access_level,body) VALUES($1,$2,$3,$4,$5,$6)',[d.id,d.tenant,d.key,d.revision,d.accessLevel,d.body]);
  result.roles=(await admin.query("SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('alpha_reader','alpha_manager','beta_reader','beta_manager') ORDER BY rolname")).rows;
  result.value=await run({admin,connect,corpus});
 }catch(error){result.failure={message:error.message,code:error.code,stack:error.stack};}
 finally{for(const client of clients)await client.end().catch(()=>{});if(started){docker('rm','--force',name);result.containerRemoved=true;}}
 return result;
}
