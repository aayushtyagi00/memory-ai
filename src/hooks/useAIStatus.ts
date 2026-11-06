import {useEffect, useState} from 'react';
import {getStorageMode} from '../lib/storageMode';
import {invoke} from '../services/backend';
import {geminiService} from '../services/gemini';

// A cloud account alone does not prove that the server has an AI key.
export function useAIStatus() {
  const mode = getStorageMode();
  const [status, setStatus] = useState<'checking' | 'configured' | 'unavailable'>(
    mode.kind === 'cloud' ? 'checking' : geminiService.getApiKey() ? 'configured' : 'unavailable',
  );
  useEffect(() => {
    let active = true;
    if (mode.kind !== 'cloud') {
      setStatus(geminiService.getApiKey() ? 'configured' : 'unavailable');
      return;
    }
    setStatus('checking');
    invoke<{ai: boolean}>('manage-memory', {action: 'capabilities'})
      .then(result => {if (active) setStatus(result.ai ? 'configured' : 'unavailable');})
      .catch(() => {if (active) setStatus('unavailable');});
    return () => {active = false;};
  }, [mode.kind, mode.kind === 'cloud' ? mode.userId : null]);
  return {status, setStatus};
}
