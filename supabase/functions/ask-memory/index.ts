import { endpoint,json,checked,HttpError } from '../_shared/http.ts';
import {generate} from '../_shared/ai.ts';
import {text,uuid,MAX_QUESTION_CHARS,verifiedAnswer,NOT_FOUND,type Evidence} from '../../../shared/contracts.ts';
import {GROUNDING_INSTRUCTION} from '../../../shared/retrieval.ts';
Deno.serve(endpoint('ask-memory',async(req,{client,userId})=>{
  const body=await json(req);const question=text(body.question,'Question',MAX_QUESTION_CHARS);
  let history:unknown[]=[];
  if(body.conversationId){const id=uuid(body.conversationId);const conv=checked(await client.from('conversations').select('id').eq('id',id).eq('user_id',userId).maybeSingle());if(!conv)throw new HttpError(404,'Conversation not found.');history=checked(await client.from('messages').select('role,content').eq('conversation_id',id).eq('user_id',userId).order('created_at',{ascending:false}).limit(8))?.reverse().map(m=>({role:m.role,content:m.content.slice(0,1000)}))||[];}
  const search=question+' '+history.slice(-2).map(m=>(m as {content:string}).content.slice(0,300)).join(' ');
  const chunks=checked(await client.rpc('search_memory_chunks',{p_query:search})) as Evidence[];
  if(!chunks.length)return {answer:NOT_FOUND,sources:[],foundInformation:false,conflictDetected:false};
  const merged:Evidence[]=[];for(const c of chunks){const m=merged.find(m=>m.id===c.id);if(m)m.content+='\n'+c.content;else merged.push({...c});}
  const output=await generate(JSON.stringify({question,history,memories:merged}),GROUNDING_INSTRUCTION,{model:body.model,json:true});
  let parsed:unknown;try{parsed=JSON.parse(output);}catch{throw new HttpError(502,'AI returned invalid output. Please retry.');}
  return verifiedAnswer(parsed,merged);
}));
