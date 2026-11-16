import {Client} from 'pg';
import {readFile, writeFile, access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {evaluateRetrieval, eligible} from './core.mjs';
const root = new URL('.', import.meta.url);
const read = file => readFile(new URL(file, root));
const json = async file => JSON.parse(await read(file));
const hash = data => createHash('sha256').update(data).digest('hex');
for (const file of ['results/isolation.json', 'results/isolation-failed.json']) {
  try { await access(new URL(file, root)); throw new Error('Existing artifact: preserve/version it first: '+file); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const protocol = await json('protocol.json'), runtime = await json('runtime.json');
const corpus = await json('corpus.json'), cases = await json('cases.json');
const schema = await readFile(new URL('schema.sql', root), 'utf8');
const sql = await readFile(new URL('search.sql', root), 'utf8');
const sourceFiles = ['protocol.json','runtime.json','corpus.json','cases.json','schema.sql','search.sql','core.mjs','capture-isolation.mjs','dependency-lock.capture.json'];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file,hash(await read(file))])));
const name = 'rag-isolation-'+randomUUID();
const docker = (...args) => execFileSync('docker', args, {encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
const transcript = {capturedAt:new Date().toISOString(),kind:'real_postgresql_database_isolation',sourceHashes,protocol,runtime,roles:[],databases:[],requests:[],probes:[],plans:[]};
let port, started = false, failure;
const clients = new Set();
async function connect(user, database) {
  const client = new Client({host:'127.0.0.1',port,user,database,connectionTimeoutMillis:1500,query_timeout:5000});
  try { await client.connect(); clients.add(client); return client; }
  catch (error) { await client.end().catch(()=>{}); throw error; }
}
async function close(client) { await client.end(); clients.delete(client); }
async function probe(label, client, query, params = []) {
  try { const result = await client.query(query, params); return {label,sql:query,params,rows:result.rows,code:null}; }
  catch (error) { return {label,sql:query,params,rows:null,code:error.code,message:error.message}; }
}
try {
  docker('run','--detach','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--user','999:999','--cap-drop','ALL','--security-opt','no-new-privileges:true','--read-only','--tmpfs','/var/lib/postgresql/data:rw,uid=999,gid=999,mode=0700,size=768m','--tmpfs','/var/run/postgresql:rw,uid=999,gid=999,mode=0775','--cpus','2','--memory','1g','--publish','127.0.0.1::5432','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_USER=rag_admin','--env','POSTGRES_DB=rag_admin',runtime.image);
  started = true;
  const inspect = JSON.parse(docker('inspect',name))[0];
  assert.equal(inspect.HostConfig.ReadonlyRootfs,true);
  assert.deepEqual(inspect.HostConfig.CapDrop,['ALL']);
  const binding = inspect.NetworkSettings.Ports['5432/tcp'][0];
  assert.equal(binding.HostIp,'127.0.0.1'); port = Number(binding.HostPort);
  let admin;
  for (let i=0;i<80;i++) {
    try { admin=await connect('rag_admin','rag_admin'); break; }
    catch { await new Promise(resolve=>setTimeout(resolve,150)); }
  }
  if (!admin) throw new Error('Temporary PostgreSQL did not become ready');
  transcript.postgres = (await admin.query('SELECT version() AS version')).rows[0].version;
  assert.match(transcript.postgres,/PostgreSQL 17\./);
  for (const principal of corpus.principals) {
    await admin.query(`CREATE ROLE ${principal.role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  }
  await admin.query('CREATE ROLE outsider LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS');
  for (const database of ['rag_global','rag_alpha','rag_beta']) {
    await admin.query('CREATE DATABASE '+database);
    await admin.query('REVOKE ALL ON DATABASE '+database+' FROM PUBLIC');
    const allowed=corpus.principals.filter(p=>database==='rag_global'||database==='rag_'+p.tenant);
    for (const principal of allowed) await admin.query(`GRANT CONNECT ON DATABASE ${database} TO ${principal.role}`);
    if(database==='rag_global') await admin.query('GRANT CONNECT ON DATABASE rag_global TO outsider');
    const db=await connect('rag_admin',database);
    await db.query(schema);
    for(const principal of allowed) {
      await db.query('INSERT INTO principals(role_name,tenant,max_level) VALUES($1,$2,$3)',[principal.role,principal.tenant,principal.maxLevel]);
      await db.query(`GRANT USAGE ON SCHEMA public TO ${principal.role}`);
      await db.query(`GRANT SELECT ON documents,principals TO ${principal.role}`);
    }
    if(database==='rag_global') await db.query('GRANT USAGE ON SCHEMA public TO outsider; GRANT SELECT ON documents,principals TO outsider');
    const documents=corpus.documents.filter(d=>database==='rag_global'||database==='rag_'+d.tenant);
    for(const d of documents) await db.query('INSERT INTO documents(id,tenant,document_key,revision,access_level,body) VALUES($1,$2,$3,$4,$5,$6)',[d.id,d.tenant,d.key,d.revision,d.accessLevel,d.body]);
    await db.query('ANALYZE documents');
    const relations=(await db.query(`SELECT c.relname, c.relkind, pg_relation_filepath(c.oid) AS file, pg_relation_size(c.oid)::int AS bytes,
      c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('documents','documents_terms_gin','documents_scope') ORDER BY c.relname`)).rows;
    transcript.databases.push({name:database,documentIds:documents.map(d=>d.id),relations});
    await close(db);
  }
  transcript.roles=(await admin.query(`SELECT rolname,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit FROM pg_roles WHERE rolname IN ('alpha_reader','alpha_manager','beta_reader','beta_manager','outsider') ORDER BY rolname`)).rows;
  for(const layout of ['global','isolated']) for(const principal of corpus.principals) {
    const database=layout==='global'?'rag_global':'rag_'+principal.tenant;
    const client=await connect(principal.role,database);
    const identity=(await client.query('SELECT session_user, current_user, current_database() AS database')).rows[0];
    assert.equal(identity.session_user,principal.role); assert.equal(identity.current_user,principal.role);
    const visible=await probe('plain-select',client,'SELECT id,tenant,access_level FROM documents ORDER BY id');
    const expected=corpus.documents.filter(d=>eligible(d,principal)).map(d=>d.id).sort();
    assert.deepEqual(visible.rows.map(r=>r.id),expected);
    transcript.probes.push({layout,role:principal.role,database,...visible});
    for(const entry of cases.filter(c=>c.role===principal.role)) {
      const rows=(await client.query(sql,[entry.query,protocol.retriever.k])).rows;
      const evaluation=evaluateRetrieval(rows,entry.goldIds,corpus.documents,principal);
      transcript.requests.push({layout,database,identity,caseId:entry.id,query:entry.query,goldIds:entry.goldIds,rows,...evaluation});
      assert.equal(evaluation.exposedIds.length,0);
    }
    transcript.plans.push({layout,role:principal.role,database,plan:(await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,['retencion',3])).rows[0]['QUERY PLAN']});
    const other=principal.tenant==='alpha'?'beta':'alpha';
    const foreign=await probe('foreign-id',client,'SELECT id,tenant,body FROM documents WHERE id=$1',[other+'-retention-v1']);
    assert.deepEqual(foreign.rows,[]);
    transcript.probes.push({layout,role:principal.role,database,...foreign});
    const tenant=await probe('tenant-predicate',client,'SELECT id,body FROM documents WHERE tenant=$1',[other]);
    assert.deepEqual(tenant.rows,[]); transcript.probes.push({layout,role:principal.role,database,...tenant});
    await client.query("SELECT set_config('app.tenant',$1,false)",[other]);
    const fake=await probe('fake-tenant-setting',client,'SELECT id,tenant FROM documents ORDER BY id');
    assert.deepEqual(fake.rows.map(r=>r.id),expected);
    transcript.probes.push({layout,role:principal.role,database,...fake});
    const denied=[['switch-role',`SET ROLE ${other}_manager`],['disable-row-security','SET row_security=off; SELECT id FROM documents'],['insert-document',"INSERT INTO documents(id,tenant,document_key,revision,access_level,body) VALUES('intruder','beta','x',1,0,'x')"],['change-principal','UPDATE principals SET max_level=1 WHERE role_name=session_user']];
    for(const[label,query]of denied) {
      const result=await probe(label,client,query); assert.equal(result.code,'42501',label);
      transcript.probes.push({layout,role:principal.role,database,...result});
      if(label==='disable-row-security') await client.query('SET row_security=on');
    }
    if(layout==='isolated') {
      try {const wrong=await connect(principal.role,'rag_'+other);await close(wrong);throw new Error('Foreign database allowed');}
      catch(error) {assert.equal(error.code,'42501');transcript.probes.push({layout,role:principal.role,database:'rag_'+other,label:'foreign-database-connect',code:error.code,message:error.message});}
    }
    await close(client);
  }
  const outsider=await connect('outsider','rag_global');
  const empty=await probe('missing-principal',outsider,'SELECT id,body FROM documents');
  assert.deepEqual(empty.rows,[]); transcript.probes.push({layout:'global',role:'outsider',database:'rag_global',...empty});
  await close(outsider); await close(admin);
} catch(error) {
  failure={message:error.message,code:error.code,stack:error.stack};
} finally {
  for(const client of clients) await client.end().catch(()=>{});
  if(started) {docker('rm','--force',name); transcript.containerRemoved=true;}
}
transcript.connection={host:'127.0.0.1',port};
if(failure) {transcript.failure=failure; await writeFile(new URL('results/isolation-failed.json',root),JSON.stringify(transcript,null,2)+'\n'); throw new Error(failure.message);}
await writeFile(new URL('results/isolation.json',root),JSON.stringify(transcript,null,2)+'\n');
console.log(JSON.stringify({postgres:transcript.postgres,requests:transcript.requests.length,probes:transcript.probes.length,exposed:transcript.requests.flatMap(r=>r.exposedIds).length,relations:transcript.databases.map(d=>({database:d.name,relations:d.relations})),containerRemoved:transcript.containerRemoved},null,2));
