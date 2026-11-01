import {createRequire} from 'node:module';
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const require = createRequire(import.meta.url), root = dirname(require.resolve('faiss-napi/package.json'));
// Run only the reviewed prebuilt installer. Never invoke its npm/source fallback.
const installer = createRequire(join(root,'package.json')).resolve('prebuild-install/bin.js');
const r = spawnSync(process.execPath,[installer,'--runtime','napi','--verbose'],{cwd:root,stdio:'inherit',timeout:120000});
if (r.error || r.status !== 0) throw r.error ?? Error('Native prebuilt download failed; no implicit source build');
const release = join(root,'build/Release'), files = [];
for (const file of (await readdir(release)).toSorted()) {
 if (!/\.(node|so(?:\.\d+)*)$/.test(file)) continue;
 const bytes = await readFile(join(release,file)); files.push({file,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
if (!files.some(f=>f.file.endsWith('.node'))) throw Error('Native addon missing');
await writeFile(new URL('native-runtime.json',import.meta.url),JSON.stringify({package:'faiss-napi',version:'0.10.3',platform:process.platform,arch:process.arch,node:process.version,files},null,2)+'\n');
console.log('FAISS native bundle recorded; no npm or source fallback');
