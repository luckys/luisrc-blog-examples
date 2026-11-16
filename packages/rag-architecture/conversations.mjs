import {randomUUID} from 'node:crypto';
const ownerKey=principal=>JSON.stringify([principal.role,principal.tenant]);
export class Conversations {
 #sessions=new Map();
 start(principal,references,question){
  if(!Array.isArray(references)||references.some(r=>typeof r.id!=='string'||!Number.isInteger(r.revision)||r.revision<1))throw Error('Invalid reference');
  const id=randomUUID();
  this.#sessions.set(id,{owner:ownerKey(principal),question:String(question),references:references.map(r=>({id:r.id,revision:r.revision}))});
  return id;
 }
 async resume(id,principal,question,loadReference){
  const session=this.#sessions.get(id);
  if(!session)return{status:'not_found',evidence:[]};
  if(session.owner!==ownerKey(principal))return{status:'forbidden',evidence:[]};
  if(!session.references.length)return{status:'no_evidence',evidence:[]};
  const evidence=[];
  for(const reference of session.references){
   const row=await loadReference(reference);
   if(!row||row.id!==reference.id||row.revision!==reference.revision||row.tenant!==principal.tenant||row.access_level>principal.maxLevel)return{status:'unavailable_reference',evidence:[]};
   evidence.push({...row});
  }
  return{status:'ready',previousQuestion:session.question,question:String(question),evidence};
 }
}
