import {api} from './api';
import {Memory,ChatConversation,Reminder} from '../types';
import {fileType,text,MAX_CONTENT_CHARS,category,tags,dueDate} from '../../shared/contracts';
export interface Backup {version:2;memories:Memory[];reminders:Reminder[];conversations:ChatConversation[];attachments:Record<string,string>}
export function validateBackup(value:unknown):Backup {
 const b=value as Backup;
 if(!b||b.version!==2||!Array.isArray(b.memories)||!Array.isArray(b.reminders)||!Array.isArray(b.conversations)||!b.attachments||typeof b.attachments!=='object'||b.memories.length>500||b.reminders.length>2000||b.conversations.length>500)throw new Error('Invalid backup, or backup exceeds the import limits.');
 const ids=new Set<string>();
 for(const m of b.memories){if(!m)throw new Error('Invalid memory.');text(m.id,'Memory ID',200);if(ids.has(m.id))throw new Error('Duplicate backup memory ID.');ids.add(m.id);text(m.title,'Title',200);text(m.content||'','Content',MAX_CONTENT_CHARS,m.type==='note');category(m.category||'General');tags(m.tags||[]);if(!['note','document','image'].includes(m.type))throw new Error('Invalid backup memory type.');const attachment=b.attachments[m.id];if(m.type!=='note'&&!attachment&&(m.storage_path||!m.content?.trim()))throw new Error('Backup is missing an original attachment.');if(attachment){if(typeof attachment!=='string'||!/^data:[\w.+/-]+;base64,[A-Za-z0-9+/]*={0,2}$/.test(attachment))throw new Error('Invalid backup attachment.');fileType({name:m.original_file_name||m.title,size:Math.floor(attachment.split(',')[1].length*3/4)-(attachment.endsWith('==')?2:attachment.endsWith('=')?1:0),type:m.mime_type||undefined});}}
 for(const r of b.reminders){if(!r||!['pending','completed'].includes(r.status))throw new Error('Invalid reminder status.');text(r.title,'Reminder title',200);text(r.description||'','Description',4000,false);dueDate(r.due_at);if(r.source_memory_id&&!ids.has(r.source_memory_id))throw new Error('Reminder points to an unknown backup memory.');}
 for(const c of b.conversations){if(!c)throw new Error('Invalid conversation.');text(c.title,'Conversation title',200);if(!Array.isArray(c.messages)||c.messages.length>200)throw new Error('Invalid conversation.');for(const m of c.messages){if(!m||m.sources!==undefined&&!Array.isArray(m.sources))throw new Error('Invalid message sources.');text(m.content,'Message',16000);if(!['user','assistant'].includes(m.role))throw new Error('Invalid message role.');}}
 return b;
}
export async function restoreBackup(backup:Backup,progress:(value:string)=>void){
 const ids=new Map<string,string>();let count=0;
 // Additive restore: existing data is never purged. A partial failure is reported with progress.
 for(const m of backup.memories){progress(`Restoring memory ${++count} of ${backup.memories.length}`);const created=(m.type==='note'||!backup.attachments[m.id])?await api.createNote(m.title,m.content||'',m.category||'General',m.tags||[]):await (async()=>{const blob=await(await fetch(backup.attachments[m.id])).blob();return api.uploadMemory(new File([blob],m.original_file_name||m.title,{type:m.mime_type||blob.type}),m.title,m.category||'General',m.tags||[],m.content);})();ids.set(m.id,created.id);if(m.is_favorite)await api.updateMemory(created.id,{is_favorite:true});}
 for(const r of backup.reminders){const created=await api.createReminder(r.title,r.description||undefined,r.due_at||undefined,r.source_memory_id?ids.get(r.source_memory_id):undefined);if(r.status==='completed'&&created.status!=='completed')await api.toggleReminder(created.id);}
 for(const c of backup.conversations){const mapped={...c,id:crypto.randomUUID(),messages:c.messages.map(m=>({...m,id:crypto.randomUUID(),sources:m.sources?.flatMap(s=>{const id=ids.get(s.memoryId||s.id||'');return id?[{...s,id,memoryId:id}]:[]})})),activeSources:[]};await api.saveConversation(mapped);}
 progress('Backup restored.');
}
export function download(name:string,data:Blob){const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
