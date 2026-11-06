import {endpoint,json,checked,HttpError} from '../_shared/http.ts';
import {uuid} from '../../../shared/contracts.ts';
import {deleteLegacyDocument} from '../_shared/gemini.ts';
Deno.serve(endpoint('delete-memory',async(req,{admin,userId})=>{
 const body=await json(req);const id=uuid(body.memoryId);const memory=checked(await admin.from('memories').select('*').eq('id',id).eq('user_id',userId).maybeSingle());if(!memory)return {success:true};
 await deleteLegacyDocument(memory,userId);
 if(memory.storage_path){if(!memory.storage_path.startsWith(userId+'/')||memory.storage_path.includes('..'))throw new HttpError(409,'Attachment ownership requires operator review. No data was deleted.');checked(await admin.storage.from('memory-files').remove([memory.storage_path]));}
 checked(await admin.from('memories').delete().eq('id',id).eq('user_id',userId));return {success:true};
}));
