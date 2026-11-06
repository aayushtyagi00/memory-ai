import {endpoint,json,checked} from '../_shared/http.ts';
import {text,category,tags,MAX_CONTENT_CHARS} from '../../../shared/contracts.ts';
Deno.serve(endpoint('create-note',async(req,{admin,userId})=>{
 const body=await json(req);const content=text(body.content,'Content',MAX_CONTENT_CHARS);const title=text(body.title,'Title',200);
 const memory=checked(await admin.from('memories').insert({id:crypto.randomUUID(),user_id:userId,title,content,description:content.slice(0,160),type:'note',category:category(body.category||'Personal'),tags:tags(body.tags||[]),mime_type:'text/plain',original_file_name:title.replace(/[^\w .-]/g,'_')+'.txt',file_size:new TextEncoder().encode(content).length,indexing_status:'ready'}).select().single());
 return {memory};
}));
