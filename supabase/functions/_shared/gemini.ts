import { HttpError } from './http.ts';
// Only used to remove resources retained by older releases. New ingestion stores no provider files.
export async function deleteLegacyDocument(memory:{gemini_document_name?:string;gemini_store_name?:string},userId:string){
  if(!memory.gemini_document_name)return;
  const store=memory.gemini_store_name;const doc=memory.gemini_document_name;
  if(!store||!/^fileSearchStores\/[\w-]+$/.test(store)||!doc.startsWith(store+'/documents/')||!/^fileSearchStores\/[\w-]+\/documents\/[\w-]+$/.test(doc))throw new HttpError(409,'Legacy AI resource ownership requires operator review. No data was deleted.');
  const key=Deno.env.get('GEMINI_API_KEY');if(!key)throw new HttpError(503,'Set the server Gemini key to remove previously indexed AI documents.');
  const headers={'x-goog-api-key':key};
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/'+store,{headers,signal:AbortSignal.timeout(15_000)});
  if(response.status===404)return;
  if(!response.ok)throw new HttpError(502,'Could not verify legacy AI ownership. Retry deletion later.');
  const resource=await response.json();if(resource.displayName!==`memory-${userId}`)throw new HttpError(409,'Legacy AI resource ownership requires operator review.');
  const deleted=await fetch('https://generativelanguage.googleapis.com/v1beta/'+doc+'?force=true',{method:'DELETE',headers,signal:AbortSignal.timeout(15_000)});
  if(!deleted.ok&&deleted.status!==404)throw new HttpError(502,'AI document deletion failed. Retry deletion.');
}
export async function deleteLegacyStore(store:string,userId:string){
 if(!/^fileSearchStores\/[\w-]+$/.test(store))throw new HttpError(409,'Legacy AI store requires operator review.');
 const key=Deno.env.get('GEMINI_API_KEY');if(!key)throw new HttpError(503,'Set the server Gemini key to remove the legacy AI store.');
 const headers={'x-goog-api-key':key};const url='https://generativelanguage.googleapis.com/v1beta/'+store;
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(15_000)});if(response.status===404)return;
 if(!response.ok)throw new HttpError(502,'Could not verify the legacy AI store. Retry purge.');
 if((await response.json()).displayName!==`memory-${userId}`)throw new HttpError(409,'Legacy AI store ownership requires operator review.');
 const deleted=await fetch(url+'?force=true',{method:'DELETE',headers,signal:AbortSignal.timeout(15_000)});if(!deleted.ok&&deleted.status!==404)throw new HttpError(502,'Legacy AI store deletion failed. Retry purge.');
}
