import {fileURLToPath} from 'node:url'
import {resolve,relative,isAbsolute} from 'node:path'
const root=fileURLToPath(new URL('../docs/editorial/',import.meta.url))
export function editorialPath(file){
 const result=resolve(root,file),part=relative(root,result)
 if(part==='..'||part.startsWith('../')||isAbsolute(part))throw Error('Ruta fuera de docs/editorial')
 return result
}
