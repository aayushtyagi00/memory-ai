import {beforeEach,it,expect,vi} from 'vitest';
import 'fake-indexeddb/auto';
import {setStorageMode} from '../src/lib/storageMode';
import {api} from '../src/services/api';
import {validateBackup,restoreBackup} from '../src/services/backup';
vi.mock('../src/services/backend',()=>({cloudClient:vi.fn(),invoke:vi.fn()}));
beforeEach(async()=>{setStorageMode({kind:'demo'});await api.clearAllMemories();});
it('round-trips actual notes, attachments, favorites and chats',async()=>{
 const note=await api.createNote('Private note','Keep this text');await api.toggleFavorite(note.id);const file=await api.uploadMemory(new File(['Original contents'],'original.txt',{type:'text/plain'}));await api.saveConversation({id:crypto.randomUUID(),title:'A chat',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),messages:[{id:crypto.randomUUID(),role:'user',content:'Question',timestamp:new Date().toISOString()}]});
 const backup=validateBackup(await api.exportData());expect(backup.attachments[file.id]).toMatch(/^data:/);await api.clearAllMemories();await restoreBackup(backup,()=>{});expect((await api.listMemories()).map(m=>m.title).sort()).toEqual(['Private note','original']);expect((await api.listMemories()).find(m=>m.title==='Private note')?.is_favorite).toBe(true);expect((await api.listConversations())[0].messages[0].content).toBe('Question');
});
it('can restore sample records that have text but no original binary',async()=>{
 await api.loadDemoData();const backup=validateBackup(await api.exportData());await api.clearAllMemories();await restoreBackup(backup,()=>{});expect((await api.listMemories()).length).toBe(backup.memories.length);expect((await api.listMemories()).every(m=>m.type==='note')).toBe(true);
});
it('rejects incomplete real attachments and malformed reminder status before writing',async()=>{
 const b={version:2,memories:[{id:'x',title:'Lost PDF',content:'Text',category:'General',type:'document',storage_path:'indexeddb:missing'}],reminders:[],conversations:[],attachments:{}};expect(()=>validateBackup(b)).toThrow('missing an original');expect(()=>validateBackup({...b,memories:[],reminders:[{title:'Oops',status:'sending'}]})).toThrow('status');
});
