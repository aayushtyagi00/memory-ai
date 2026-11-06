import {useSyncExternalStore} from 'react';
import {geminiService} from '../services/gemini';

// A key belongs only to the current tab and signed-in identity.
export function useAIStatus() {
  const configured=useSyncExternalStore(geminiService.subscribeKey,()=>geminiService.hasApiKey(),()=>false);
  return {status: configured ? 'configured' as const : 'unavailable' as const};
}
