import { getSupabaseClient } from '../lib/supabase';
import { requireMode } from '../lib/storageMode';
export function cloudClient() {
  const mode=requireMode();
  const client=getSupabaseClient();
  if(mode.kind!=='cloud'||!client)throw new Error('Sign in to the configured cloud backend first.');
  return {client,userId:mode.userId};
}
export async function invoke<T>(name:string,body:Record<string,unknown>|FormData):Promise<T> {
  const {client}=cloudClient();
  const {data,error}=await client.functions.invoke(name,{body});
  if(error) {
    let message=error.message;
    if(error.context instanceof Response) {const detail=await error.context.json().catch(()=>null);message=detail?.error||message;}
    throw new Error(message || 'The cloud operation failed. Your data has not been saved locally.');
  }
  if(data?.error)throw new Error(data.error);
  return data as T;
}
