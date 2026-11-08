import {cloudClient} from './backend';
import {getGeneration} from '../lib/storageMode';
import {geminiService} from './gemini';
export async function restoreAccountKey() {
 const generation=getGeneration();const {client,userId}=cloudClient();
 const {data,error}=await client.from('account_api_keys').select('api_key').eq('user_id',userId).maybeSingle();
 if(error)throw new Error('Could not load your saved API key. Check the account-key database migration.');
 if(generation===getGeneration())geminiService.setApiKey(data?.api_key||'');
}
export async function saveAccountKey(key:string) {
 const generation=getGeneration();const {client,userId}=cloudClient();
 const result=key.trim()?await client.from('account_api_keys').upsert({user_id:userId,api_key:key.trim(),updated_at:new Date().toISOString()},{onConflict:'user_id'}):await client.from('account_api_keys').delete().eq('user_id',userId);
 if(result.error)throw new Error('Could not save this API key. It may already belong to another account, or account-key storage is not configured.');
 if(generation!==getGeneration())throw new Error('Account changed. Sign in again.');
 geminiService.setApiKey(key);
}
