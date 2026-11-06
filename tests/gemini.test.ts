import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {geminiService, DEFAULT_MODEL} from '../src/services/gemini';
import {setStorageMode} from '../src/lib/storageMode';
import {api} from '../src/services/api';
import type {Memory} from '../src/types';

const {backend} = vi.hoisted(() => ({backend: vi.fn()}));
vi.mock('../src/services/backend', () => ({invoke: backend, cloudClient: vi.fn()}));
const personalKey='personal-test-key';
const content='The launch code is ALPHA-427.';
const memory={id: '11111111-1111-4111-8111-111111111111', user_id:'user-a', title:'Launch', content, type:'note', indexing_status:'ready', created_at:'2026-11-06T12:00:00Z'} as Memory;
function output(text:string) {return new Response(JSON.stringify({candidates:[{content:{parts:[{text}]}}]}));}

beforeEach(() => {
  vi.restoreAllMocks();
  backend.mockReset();
  setStorageMode({kind:'cloud',userId:'user-a'});
  geminiService.setApiKey('');
  geminiService.setModel(DEFAULT_MODEL);
});
afterEach(() => {vi.unstubAllGlobals();});

describe('personal Gemini keys for cloud accounts', () => {
  it('sends the user key directly to Google and never invokes a server AI function', async () => {
    const request=vi.fn().mockResolvedValue(output('OK'));
    vi.stubGlobal('fetch',request);
    geminiService.setApiKey(personalKey);
    expect(await geminiService.callGenerateContent('Test')).toBe('OK');
    const [url,options]=request.mock.calls[0];
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`);
    expect(options.headers['x-goog-api-key']).toBe(personalKey);
    expect(backend).not.toHaveBeenCalled();
  });

  it('does not consider a cloud login to be a configured AI key', async () => {
    const request=vi.fn();vi.stubGlobal('fetch',request);
    expect(geminiService.hasApiKey()).toBe(false);
    await expect(geminiService.callGenerateContent('Test')).rejects.toThrow('your own Gemini API key');
    expect(request).not.toHaveBeenCalled();expect(backend).not.toHaveBeenCalled();
  });

  it('tests the supplied key rather than a previously saved key', async () => {
    const request=vi.fn().mockResolvedValue(output('OK'));vi.stubGlobal('fetch',request);
    geminiService.setApiKey('previous-key');
    expect((await geminiService.testConnection(personalKey)).success).toBe(true);
    expect(request.mock.calls[0][1].headers['x-goog-api-key']).toBe(personalKey);
  });

  it('isolates the key when switching accounts, even if switching back', () => {
    geminiService.setApiKey(personalKey);
    setStorageMode({kind:'cloud',userId:'user-b'});
    expect(geminiService.getApiKey()).toBe('');
    setStorageMode({kind:'cloud',userId:'user-a'});
    expect(geminiService.getApiKey()).toBe('');
  });

  it('rejects an AI response after the signed-in account changes', async () => {
    vi.stubGlobal('fetch',vi.fn(async()=>{setStorageMode({kind:'cloud',userId:'user-b'});return output('Private answer');}));
    geminiService.setApiKey(personalKey);
    await expect(geminiService.callGenerateContent('Test')).rejects.toThrow('Session changed');
  });

  it('uses cloud memories for direct, citation-checked personal-key Q&A', async () => {
    vi.spyOn(api,'listMemories').mockResolvedValue([memory]);
    const request=vi.fn().mockResolvedValue(output(JSON.stringify({answer:content,foundInformation:true,conflictDetected:false,sources:[{memoryId:memory.id,snippet:content}]})));
    vi.stubGlobal('fetch',request);geminiService.setApiKey(personalKey);
    const result=await api.askMemory('launch code');
    expect(result.sources[0].memoryId).toBe(memory.id);
    expect(result.answer).toContain('ALPHA-427');
    expect(JSON.parse(request.mock.calls[0][1].body).contents[0].parts[0].text).toContain(content);
    expect(backend).not.toHaveBeenCalled();
  });

  it('supports cloud text search without calling Google when no key is set', async () => {
    vi.spyOn(api,'listMemories').mockResolvedValue([memory]);
    const request=vi.fn();vi.stubGlobal('fetch',request);
    const result=await api.askMemory('launch code');
    expect(result.answer).toContain('ALPHA-427');expect(request).not.toHaveBeenCalled();expect(backend).not.toHaveBeenCalled();
  });

  it('performs cloud upload OCR directly and sends only the extracted text to Supabase', async () => {
    const request=vi.fn().mockResolvedValue(output(JSON.stringify({extractedText:content,title:'Launch',category:'General',tags:[]})));
    vi.stubGlobal('fetch',request);geminiService.setApiKey(personalKey);
    backend.mockResolvedValue({memory});
    const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT7sAAAAASUVORK5CYII=','base64');
    await api.uploadMemory(new File([bytes],'receipt.png',{type:'image/png'}));
    expect(request.mock.calls[0][1].headers['x-goog-api-key']).toBe(personalKey);
    expect(backend).toHaveBeenCalledOnce();
    const [name,body]=backend.mock.calls[0];
    expect(name).toBe('upload-memory');expect(body.get('content')).toBe(content);
    expect([...body.keys()]).not.toContain('apiKey');
    expect([...body.values()].some(value=>typeof value==='string'&&value.includes(personalKey))).toBe(false);
  });
});
