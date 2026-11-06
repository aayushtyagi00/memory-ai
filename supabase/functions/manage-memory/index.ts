import {endpoint,json,checked,HttpError} from '../_shared/http.ts';
import {text,uuid,category,tags,MAX_CONTENT_CHARS} from '../../../shared/contracts.ts';
import {deleteLegacyDocument,deleteLegacyStore} from '../_shared/gemini.ts';
Deno.serve(endpoint('manage-memory',async(req,{admin,client,userId})=>{
 const body=await json(req,4_000_000);
 if(body.action==='stats')return checked(await client.rpc('vault_stats'));
 if(body.action==='toggle-favorite'){
   const rows=checked(await client.rpc('toggle_memory_favorite',{p_id:uuid(body.id)}));
   if(!rows?.length)throw new HttpError(404,'Memory not found.');
   return {memory:rows[0]};
 }
 if(body.action==='capabilities')return {ai:false,aiMode:'user-key',emailReminders:!!Deno.env.get('RESEND_API_KEY')&&!!Deno.env.get('REMINDER_FROM_EMAIL')&&(Deno.env.get('REMINDER_CRON_SECRET')||'').length>=32};
 if(body.action==='delete-account'){
   const count=await admin.from('memories').select('id',{count:'exact',head:true}).eq('user_id',userId);if(count.error)throw count.error;
   if(count.count)throw new HttpError(409,'Purge your vault before deleting the account.');
   const files=checked(await admin.storage.from('memory-files').list(userId,{limit:1}))||[];if(files.length)throw new HttpError(409,'Purge remaining attachments before deleting the account.');
   const deleted=await admin.auth.admin.deleteUser(userId);if(deleted.error)throw deleted.error;return {success:true};
 }
 if(body.action==='save-conversation'){
   const c=body.conversation as {id:unknown;title:unknown;messages:unknown[]};if(!c||!Array.isArray(c.messages)||c.messages.length>200)throw new HttpError(400,'Invalid conversation.');
   const messages=c.messages.map(raw=>{const m=raw as {id:unknown;role:unknown;content:unknown;sources?:unknown[]};if(!m||!['user','assistant'].includes(String(m.role)))throw new HttpError(400,'Invalid message.');return {id:uuid(m.id),role:m.role,content:text(m.content,'Message',16000),sources:Array.isArray(m.sources)?m.sources.slice(0,12):[]};});
   checked(await client.rpc('save_chat',{p_id:uuid(c.id),p_title:text(c.title,'Conversation title',200),p_messages:messages}));return {success:true};
 }
 if(body.action==='update'){
   const id=uuid(body.id);const current=checked(await admin.from('memories').select('*').eq('id',id).eq('user_id',userId).maybeSingle());if(!current)throw new HttpError(404,'Memory not found.');
   const u=body.updates as Record<string,unknown>;if(!u||Array.isArray(u)||typeof u!=='object')throw new HttpError(400,'Invalid updates.');
   const updates:Record<string,unknown>={};if(u.title!==undefined)updates.title=text(u.title,'Title',200);if(u.category!==undefined)updates.category=category(u.category);if(u.tags!==undefined)updates.tags=tags(u.tags);if(u.is_favorite!==undefined){if(typeof u.is_favorite!=='boolean')throw new HttpError(400,'Invalid favorite.');updates.is_favorite=u.is_favorite;}
   if(u.content!==undefined){updates.content=text(u.content,'Content',MAX_CONTENT_CHARS,current.type==='note');if(current.type==='note')updates.file_size=new TextEncoder().encode(String(updates.content)).length;updates.description=String(updates.content).slice(0,160);updates.indexing_status=updates.content?'ready':'failed';updates.indexing_error=updates.content?null:'No readable text. Retry extraction.';await deleteLegacyDocument(current,userId);updates.gemini_document_name=null;updates.gemini_store_name=null;}
   return {memory:checked(await admin.from('memories').update(updates).eq('id',id).eq('user_id',userId).select().single())};
 }
 if(body.action==='purge'){
   // Delete in bounded, retryable batches. Successful prior batches stay deleted on retry.
   const all=checked(await admin.from('memories').select('*').eq('user_id',userId).order('id').limit(10))||[];
   for(const m of all){await deleteLegacyDocument(m,userId);if(m.storage_path){if(!m.storage_path.startsWith(userId+'/')||m.storage_path.includes('..'))throw new HttpError(409,'Attachment ownership requires operator review.');checked(await admin.storage.from('memory-files').remove([m.storage_path]));}checked(await admin.from('memories').delete().eq('id',m.id).eq('user_id',userId));}
   if(all.length===10)return {success:false,remaining:true};
   // Include orphaned/nested files, with pagination implied by deleting each listed page.
   async function removeFolder(prefix:string):Promise<void>{for(;;){const list=checked(await admin.storage.from('memory-files').list(prefix,{limit:100,sortBy:{column:'name',order:'asc'}}))||[];if(!list.length)break;for(const f of list){const path=prefix+'/'+f.name;if(f.id)checked(await admin.storage.from('memory-files').remove([path]));else await removeFolder(path);}if(list.length<100)break;}}
   await removeFolder(userId);
   const store=checked(await admin.from('memory_stores').select('gemini_store_name').eq('user_id',userId).maybeSingle());if(store?.gemini_store_name)await deleteLegacyStore(store.gemini_store_name,userId);
   checked(await admin.from('conversations').delete().eq('user_id',userId));checked(await admin.from('reminders').delete().eq('user_id',userId));checked(await admin.from('memory_stores').delete().eq('user_id',userId));return {success:true,remaining:false};
 }
 throw new HttpError(400,'Invalid action.');
}));
