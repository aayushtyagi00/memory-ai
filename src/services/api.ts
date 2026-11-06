import { Memory, Reminder, AskResponse, UserStats, ChatConversation } from '../types';
import { INITIAL_DEMO_MEMORIES, DEMO_REMINDERS, INITIAL_DEMO_CONVERSATIONS } from './demoData';
import { geminiService } from './gemini';
import { saveImageToIndexedDB, getImageFromIndexedDB, deleteImageFromIndexedDB, writeValuesToIndexedDB, resetDemoStorage } from '../utils/indexedDb';
import { requireMode, getGeneration } from '../lib/storageMode';
import { cloudClient, invoke } from './backend';
import { extractDocument } from './documents';
import { category as validCategory, tags as validTags, text, fileType, dueDate, STORAGE_LIMIT, MAX_CONTENT_CHARS, MAX_QUESTION_CHARS, validateSignature, NOT_FOUND, chunks } from '../../shared/contracts';

export const USER_STORAGE_CAP_BYTES = STORAGE_LIMIT;
export function formatStorageSize(bytes:number):string {if(!bytes||bytes<0)return '0 B';const units=['B','KB','MB','GB'];const p=Math.min(3,Math.floor(Math.log(bytes)/Math.log(1024)));return `${(bytes/1024**p).toFixed(p?2:0)} ${units[p]}`;}
const clone=<T,>(value:T):T=>structuredClone(value);
const localKey=(name:string)=>`demo:${name}`;
async function read<T>(name:string,initial:T):Promise<T> {
  if(requireMode().kind!=='demo')throw new Error('Local data is isolated from cloud accounts.');
  const data=await getImageFromIndexedDB(localKey(name));
  if(data===null)return clone(initial);
  try {return JSON.parse(data) as T;} catch {throw new Error('Local data could not be read. Export a backup before making further changes.');}
}
async function write(name:string,data:unknown) {if(requireMode().kind!=='demo')throw new Error('Session changed. Please try again.');await saveImageToIndexedDB(localKey(name),JSON.stringify(data));}
let mutation=Promise.resolve();
async function localMutation<T>(action:()=>Promise<T>):Promise<T> {
  const generation=getGeneration();
  const run=async()=>{if(generation!==getGeneration()||requireMode().kind!=='demo')throw new Error('Session changed. Please try again.');return action();};
  const task:Promise<T>=mutation.then(async()=>{if(typeof navigator!=='undefined'&&navigator.locks)return await navigator.locks.request('memory-ai-demo',async()=>await run());return await run();});
  mutation=task.then(()=>{},()=>{});return task;
}
async function pages<T>(table:string,order='created_at'):Promise<T[]> {
  const {client,userId}=cloudClient(); const result:T[]=[];
  for(let start=0;;start+=500){const {data,error}=await client.from(table).select('*').eq('user_id',userId).order(order,{ascending:false}).order('id').range(start,start+499);if(error)throw error;result.push(...(data||[]) as T[]);if(!data||data.length<500)return result;}
}
const memories=()=>read<Memory[]>('memories',INITIAL_DEMO_MEMORIES);
const reminders=()=>read<Reminder[]>('reminders',DEMO_REMINDERS);
const conversations=()=>read<ChatConversation[]>('conversations',INITIAL_DEMO_CONVERSATIONS);
function noteInput(title:string,content:string,category:string,tags:string[]) {return {title:text(title,'Title',200),content:text(content,'Content',MAX_CONTENT_CHARS),category:validCategory(category),tags:validTags(tags)};}
function assertGeneration(generation:number){if(generation!==getGeneration())throw new Error('Session changed. Please try again.');}
export const api={
  async getStats():Promise<UserStats> {
    if(requireMode().kind==='cloud')return invoke<UserStats>('manage-memory',{action:'stats'});
    const all=await memories();return {total:all.length,documents:all.filter(m=>m.type==='document').length,images:all.filter(m=>m.type==='image').length,notes:all.filter(m=>m.type==='note').length,storageBytes:all.reduce((sum,m)=>sum+(m.file_size||new Blob([m.content||'']).size),0),storageLimitBytes:STORAGE_LIMIT};
  },
  async listMemories():Promise<Memory[]> {return (requireMode().kind==='cloud'?await pages<Memory>('memories'):await memories()).sort((a,b)=>b.created_at.localeCompare(a.created_at));},
  async getMemory(id:string):Promise<Memory|null> {
    if(requireMode().kind==='demo')return (await memories()).find(m=>m.id===id)||null;
    const {client,userId}=cloudClient();const {data,error}=await client.from('memories').select('*').eq('id',id).eq('user_id',userId).maybeSingle();if(error)throw error;return data;
  },
  async getFileUrl(path?:string|null,id?:string|null):Promise<string|null> {
    if(!path)return null;
    if(requireMode().kind==='demo') {
      if(!path.startsWith('indexeddb:demo:'))return null;
      return getImageFromIndexedDB(path.slice('indexeddb:'.length));
    }
    const {client,userId}=cloudClient();
    if(!path.startsWith(`${userId}/`)||path.includes('..'))throw new Error('Invalid attachment path.');
    const {data,error}=await client.storage.from('memory-files').createSignedUrl(path,300);if(error)throw error;return data.signedUrl;
  },
  async uploadMemory(file:File,title?:string,category='General',tags:string[]=[],extractedContent?:string):Promise<Memory> {
    const mode=requireMode();const generation=getGeneration();const mime=fileType(file);await validateSignature(file);
    const image=mime.startsWith('image/');let content=extractedContent?.trim()||'';
    if(!content&&!image)content=await extractDocument(file);
    // Only scanned PDFs/images need AI. Text-bearing documents are parsed locally.
    if(!content&&(image||mime==='application/pdf')&&geminiService.hasApiKey()){try{content=(await geminiService.extractTextFromImage(file)).extractedText;}catch{/* Preserve originals even when the provider is unavailable. */}}
    const input={title:text(title||file.name.replace(/\.[^.]+$/,''),'Title',200),category:validCategory(category),tags:validTags(tags)};
    assertGeneration(generation);
    if(mode.kind==='cloud') {
      const body=new FormData();body.set('file',file);body.set('title',input.title);body.set('category',input.category);body.set('tags',JSON.stringify(input.tags));body.set('content',text(content,'Extracted text',MAX_CONTENT_CHARS,false));
      return (await invoke<{memory:Memory}>('upload-memory',body)).memory;
    }
    return localMutation(async()=>{
      const all=await memories();if(all.reduce((s,m)=>s+(m.file_size||0),0)+file.size>STORAGE_LIMIT)throw new Error('Demo vault limit exceeded. Export or delete files first.');
      const id=crypto.randomUUID();const key=`demo:attachment:${id}`;
      await saveImageToIndexedDB(key,file);
      const memory:Memory={id,user_id:'demo',...input,type:image?'image':'document',content,description:content.slice(0,160)||'Original saved. Text extraction is required before this file can be searched.',storage_path:`indexeddb:${key}`,original_file_name:file.name,mime_type:mime,file_size:file.size,indexing_status:content?'ready':'failed',indexing_error:content?null:'No readable text. Configure AI and retry OCR.',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_favorite:false};
      try {assertGeneration(generation);await write('memories',[memory,...all]);}catch(error){await deleteImageFromIndexedDB(key);throw error;}return memory;
    });
  },
  async createNote(title:string,content:string,category='Personal',tags:string[]=[]):Promise<Memory> {
    const input=noteInput(title,content,category,tags);
    if(requireMode().kind==='cloud')return (await invoke<{memory:Memory}>('create-note',input)).memory;
    return localMutation(async()=>{const all=await memories();const size=new Blob([input.content]).size;if(all.reduce((s,m)=>s+(m.file_size||0),0)+size>STORAGE_LIMIT)throw new Error('Demo vault limit exceeded.');const m:Memory={id:crypto.randomUUID(),user_id:'demo',...input,type:'note',description:input.content.slice(0,160),original_file_name:`${input.title}.txt`,file_size:size,indexing_status:'ready',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_favorite:false};await write('memories',[m,...all]);return m;});
  },
  async updateMemory(id:string,updates:Partial<Pick<Memory,'title'|'description'|'category'|'tags'|'content'|'is_favorite'|'indexing_status'>>):Promise<Memory|null> {
    if(updates.title!==undefined)text(updates.title,'Title',200);if(updates.content!==undefined)text(updates.content,'Content',MAX_CONTENT_CHARS,false);if(updates.category!==undefined)validCategory(updates.category);if(updates.tags!==undefined)validTags(updates.tags);
    if(requireMode().kind==='cloud')return (await invoke<{memory:Memory}>('manage-memory',{action:'update',id,updates})).memory;
    return localMutation(async()=>{const all=await memories();const idx=all.findIndex(m=>m.id===id);if(idx<0)throw new Error('Memory not found.');const m={...all[idx],...updates,updated_at:new Date().toISOString()};if(m.type==='note')text(m.content,'Content',MAX_CONTENT_CHARS);m.file_size=m.type==='note'?new Blob([m.content||'']).size:Math.max(m.file_size||0,new Blob([m.content||'']).size);if(all.reduce((sum,item)=>sum+(item.id===id?(m.file_size||0):item.file_size||0),0)>STORAGE_LIMIT)throw new Error('Demo vault limit exceeded.');m.indexing_status=m.content?'ready':'failed';all[idx]=m;await write('memories',all);return m;});
  },
  async transcribeImageMemory(id:string):Promise<Memory> {
    const memory=await this.getMemory(id);if(!memory)throw new Error('Memory not found.');
    const url=await this.getFileUrl(memory.storage_path,id);if(!url)throw new Error('Original attachment not found. Re-upload the file.');
    const result=await geminiService.extractTextFromImage(url,memory.mime_type||undefined);
    const updated=await this.updateMemory(id,{content:result.extractedText});if(!updated)throw new Error('Could not save extracted text.');return updated;
  },
  async transcribeAllPendingImages(){let count=0;let failed=0;const errors:string[]=[];for(const m of await this.listMemories()){if((m.type==='image'||m.mime_type==='application/pdf')&&m.indexing_status!=='ready'){try{await this.transcribeImageMemory(m.id);count++;}catch(e){failed++;errors.push(e instanceof Error?e.message:'OCR failed');}}}return {count,failed,errors};},
  // A missing browser cache never authorizes deletion. Keep this compatibility method non-destructive.
  async cleanGhostMemories():Promise<number>{throw new Error('Automatic deletion is disabled. Open a memory to retry extraction or explicitly delete it.');},
  async askMemory(question:string,conversationId?:string):Promise<AskResponse> {
    text(question,'Question',MAX_QUESTION_CHARS);
    const generation=getGeneration();
    const history=conversationId?(await this.getConversation(conversationId))?.messages.slice(-8)||[]:[];
    const all=(await this.listMemories()).filter(m=>m.indexing_status==='ready'&&m.content);
    assertGeneration(generation);
    if(geminiService.hasApiKey())return geminiService.askMemoryWithGemini(question,all,history);
    // Without a personal key, both cloud and demo return actual quoted excerpts.
    const terms=question.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(t=>t.length>2&&!['what','when','where','does','have','from','with','about','this','that','tell','show','give','the','and','are','for','how'].includes(t))||[];
    const results=all.flatMap(m=>chunks(m.content||'').map(content=>({memory:m,content,score:terms.reduce((sum,t)=>sum+(content.toLowerCase().includes(t)?1:0),0)}))).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
    if(!results.length)return {answer:NOT_FOUND,sources:[],foundInformation:false,conflictDetected:false};
    const sources=results.map(r=>({id:r.memory.id,memoryId:r.memory.id,title:r.memory.title,fileName:r.memory.original_file_name||r.memory.title,type:r.memory.type,snippet:r.content.slice(0,1000)}));
    return {answer:'Matching excerpts from your saved memories:\n\n'+sources.map(s=>`${s.title}:\n${s.snippet}`).join('\n\n'),sources,foundInformation:true,conflictDetected:false};
  },
  async deleteMemory(id:string):Promise<void> {
    if(requireMode().kind==='cloud'){await invoke('delete-memory',{memoryId:id});return;}
    await localMutation(async()=>{const all=await memories();const target=all.find(m=>m.id===id);const values:Record<string,string|null>={'demo:memories':JSON.stringify(all.filter(m=>m.id!==id)),'demo:reminders':JSON.stringify((await reminders()).filter(r=>r.source_memory_id!==id))};if(target?.storage_path?.startsWith('indexeddb:demo:'))values[target.storage_path.slice(10)]=null;await writeValuesToIndexedDB(values);});
  },
  async toggleFavorite(id:string):Promise<Memory|null> {if(requireMode().kind==='demo')return localMutation(async()=>{const all=await memories();const memory=all.find(m=>m.id===id);if(!memory)throw new Error('Memory not found.');memory.is_favorite=!memory.is_favorite;await write('memories',all);return memory;});return (await invoke<{memory:Memory}>('manage-memory',{action:'toggle-favorite',id})).memory;},
  async listReminders():Promise<Reminder[]> {return (requireMode().kind==='cloud'?await pages<Reminder>('reminders'):await reminders()).sort((a,b)=>(a.due_at||'9999').localeCompare(b.due_at||'9999'));},
  async createReminder(title:string,description?:string,due_at?:string,source_memory_id?:string):Promise<Reminder> {
    const input={title:text(title,'Title',200),description:text(description||'','Description',4000,false),due_at:dueDate(due_at),source_memory_id:source_memory_id||null};
    const existing=await this.listReminders();const match=existing.find(r=>r.title.toLowerCase()===input.title.toLowerCase()&&r.due_at===input.due_at&&r.source_memory_id===input.source_memory_id);if(match)return match;
    if(requireMode().kind==='cloud'){const {client,userId}=cloudClient();const {data,error}=await client.from('reminders').insert({...input,user_id:userId,status:'pending'}).select().single();if(error)throw error;return data;}
    return localMutation(async()=>{if(source_memory_id&&!(await memories()).some(m=>m.id===source_memory_id))throw new Error('Source memory not found.');const all=await reminders();const duplicate=all.find(r=>r.title.toLowerCase()===input.title.toLowerCase()&&r.due_at===input.due_at&&r.source_memory_id===input.source_memory_id);if(duplicate)return duplicate;const r:Reminder={id:crypto.randomUUID(),user_id:'demo',...input,status:'pending',created_at:new Date().toISOString()};await write('reminders',[r,...all]);return r;});
  },
  async toggleReminder(id:string):Promise<Reminder|null> {
    if(requireMode().kind==='demo')return localMutation(async()=>{const all=await reminders();const rem=all.find(r=>r.id===id);if(!rem)throw new Error('Reminder not found.');rem.status=rem.status==='pending'?'completed':'pending';await write('reminders',all);return rem;});
    const rem=(await this.listReminders()).find(r=>r.id===id);if(!rem)throw new Error('Reminder not found.');const status=rem.status==='pending'?'completed':'pending';
    if(requireMode().kind==='cloud'){const {client}=cloudClient();const {data,error}=await client.rpc('toggle_reminder_status',{p_id:id});if(error)throw error;if(!data?.length)throw new Error('Reminder not found.');return data[0];}
    throw new Error('Session changed. Please try again.');
  },
  async deleteReminder(id:string):Promise<void>{if(requireMode().kind==='cloud'){const {client,userId}=cloudClient();const {error}=await client.from('reminders').delete().eq('id',id).eq('user_id',userId);if(error)throw error;}else await localMutation(async()=>write('reminders',(await reminders()).filter(r=>r.id!==id)));},
  async loadDemoData():Promise<number>{if(requireMode().kind!=='demo')throw new Error('Sample data is only available in the isolated demo.');await localMutation(async()=>{await write('memories',clone(INITIAL_DEMO_MEMORIES));await write('reminders',clone(DEMO_REMINDERS));await write('conversations',clone(INITIAL_DEMO_CONVERSATIONS));});return INITIAL_DEMO_MEMORIES.length;},
  async clearAllMemories():Promise<void>{if(requireMode().kind==='cloud'){for(;;){const result=await invoke<{remaining:boolean}>('manage-memory',{action:'purge'});if(!result.remaining)break;}}else await localMutation(()=>resetDemoStorage());geminiService.setApiKey('');},
  async listConversations():Promise<ChatConversation[]> {
    if(requireMode().kind==='demo')return (await conversations()).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
    const convs=await pages<{id:string;title:string;created_at:string;updated_at:string}>('conversations');const messages=await pages<{id:string;conversation_id:string;role:'user'|'assistant';content:string;sources?:Memory[];created_at:string}>('messages');
    return convs.map(c=>({...c,messages:messages.filter(m=>m.conversation_id===c.id).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)).map(m=>({...m,timestamp:m.created_at})),activeSources:messages.filter(m=>m.conversation_id===c.id&&m.role==='assistant').sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]?.sources||[]}));
  },
  async getConversation(id:string):Promise<ChatConversation|null>{return (await this.listConversations()).find(c=>c.id===id)||null;},
  async saveConversation(conv:ChatConversation):Promise<void>{
    if(requireMode().kind==='cloud'){await invoke('manage-memory',{action:'save-conversation',conversation:conv});return;}
    await localMutation(async()=>{const all=await conversations();const idx=all.findIndex(c=>c.id===conv.id);const updated={...conv,created_at:idx<0?conv.created_at:all[idx].created_at,updated_at:new Date().toISOString()};if(idx<0)all.unshift(updated);else all[idx]=updated;await write('conversations',all);});
  },
  async deleteConversation(id:string):Promise<void>{if(requireMode().kind==='cloud'){const {client,userId}=cloudClient();const {error}=await client.from('conversations').delete().eq('id',id).eq('user_id',userId);if(error)throw error;}else await localMutation(async()=>write('conversations',(await conversations()).filter(c=>c.id!==id)));},
  async clearAllConversations():Promise<void>{if(requireMode().kind==='cloud'){const {client,userId}=cloudClient();const {error}=await client.from('conversations').delete().eq('user_id',userId);if(error)throw error;}else await localMutation(()=>write('conversations',[]));},
  async exportData(){const [memories,reminders,conversations]=await Promise.all([this.listMemories(),this.listReminders(),this.listConversations()]);const attachments:Record<string,string>={};for(const m of memories){if(m.storage_path){const url=await this.getFileUrl(m.storage_path,m.id);if(url){const response=await fetch(url);if(!response.ok)throw new Error('Could not export an attachment. Try again.');const blob=await response.blob();attachments[m.id]=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}}}return {version:2,exportedAt:new Date().toISOString(),memories,reminders,conversations,attachments};},
};
