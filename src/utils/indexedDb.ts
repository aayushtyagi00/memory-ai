const DB_NAME = 'memory_ai_blobs_db';
const STORE_NAME = 'file_blobs';
async function transaction<T>(mode: IDBTransactionMode, action: (store:IDBObjectStore)=>IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME);};
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); request.onblocked=()=>reject(new Error('Close other Memory AI tabs and try again.'));
  });
  return new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,mode); let request:IDBRequest<T>;
    try {request=action(tx.objectStore(STORE_NAME));}catch(error){tx.abort();db.close();reject(error);return;}
    tx.oncomplete=()=>{db.close();resolve(request.result);};
    tx.onabort=tx.onerror=()=>{db.close();reject(tx.error || request.error || new Error('Attachment transaction failed.'));};
  });
}
export async function saveImageToIndexedDB(key:string,data:string|Blob):Promise<void> {await transaction('readwrite',s=>s.put(data,key));}
export async function getImageFromIndexedDB(key:string):Promise<string|null> {
  const data=await transaction<Blob|string|undefined>('readonly',s=>s.get(key));
  if(!data)return null; if(typeof data==='string')return data;
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(data);});
}
export async function deleteImageFromIndexedDB(key:string):Promise<void> {await transaction('readwrite',s=>s.delete(key));}
export async function writeValuesToIndexedDB(values:Record<string,string|Blob|null>):Promise<void> {
  await transaction('readwrite',store=>{let last:IDBRequest=store.count();for(const [key,value] of Object.entries(values))last=value===null?store.delete(key):store.put(value,key);return last;});
}
export async function resetDemoStorage():Promise<void> {
  await transaction('readwrite',store=>{
    const request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(cursor){if(String(cursor.key).startsWith('demo:'))cursor.delete();cursor.continue();}else{for(const name of ['memories','reminders','conversations'])store.put('[]',`demo:${name}`);}};return request;
  });
}
export async function clearDemoAttachments():Promise<void> {
  await transaction('readwrite',store=>{const request=store.openCursor(); request.onsuccess=()=>{const c=request.result;if(c){if(String(c.key).startsWith('demo:'))c.delete();c.continue();}};return request;});
}
