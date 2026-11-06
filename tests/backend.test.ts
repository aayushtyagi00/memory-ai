import {beforeEach, describe, expect, it, vi} from 'vitest';
import {invoke} from '../src/services/backend';
import {setStorageMode} from '../src/lib/storageMode';

const {call} = vi.hoisted(() => ({call: vi.fn()}));
vi.mock('../src/lib/supabase', () => ({getSupabaseClient: () => ({functions: {invoke: call}})}));

beforeEach(() => {
  call.mockReset();
  setStorageMode({kind: 'cloud', userId: 'test-user'});
});

describe('cloud backend failures', () => {
  it('explains a missing deployed function', async () => {
    call.mockResolvedValue({error: {message: 'HTTP error', context: new Response(JSON.stringify({code: 'NOT_FOUND', message: 'Requested function was not found'}), {status: 404})}});
    await expect(invoke('manage-memory', {action: 'stats'})).rejects.toThrow('function is not deployed');
  });

  it('does not mislabel a missing user record as a missing function', async () => {
    call.mockResolvedValue({error: {message: 'HTTP error', context: new Response(JSON.stringify({error: 'Memory not found'}), {status: 404})}});
    await expect(invoke('manage-memory', {})).rejects.toThrow('Memory not found');
  });

  it('explains network and CORS failures without claiming a save succeeded', async () => {
    call.mockResolvedValue({error: {name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function'}});
    await expect(invoke('create-note', {})).rejects.toThrow('Could not reach the cloud backend');
  });

  it('preserves gateway authentication errors', async () => {
    call.mockResolvedValue({error: {message: 'HTTP error', context: new Response(JSON.stringify({message: 'Invalid JWT'}), {status: 401})}});
    await expect(invoke('manage-memory', {})).rejects.toThrow('Invalid JWT');
  });

  it('rejects cloud calls from demo mode', async () => {
    setStorageMode({kind: 'demo'});
    await expect(invoke('create-note', {})).rejects.toThrow('Sign in');
    expect(call).not.toHaveBeenCalled();
  });
});
