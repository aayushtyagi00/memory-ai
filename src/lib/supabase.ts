import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'memory_ai_supabase_url';
const STORAGE_KEY_KEY = 'memory_ai_supabase_anon_key';

// Read from import.meta.env safely
function getEnvConfig(): { url: string; anonKey: string } {
  try {
    const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
    return {
      url: env.VITE_SUPABASE_URL || '',
      anonKey: env.VITE_SUPABASE_ANON_KEY || '',
    };
  } catch {
    return { url: '', anonKey: '' };
  }
}

// Check if a URL & Key pair is valid and not a placeholder
function isValidConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  return (
    cleanUrl.startsWith('https://') &&
    cleanUrl !== 'https://your-project.supabase.co' &&
    !cleanUrl.includes('placeholder') &&
    cleanKey.length > 20
  );
}

// Current in-memory client
let activeClient: SupabaseClient | null = null;
let activeUrl = '';
let activeKey = '';
let memUrl = '';
let memKey = '';

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = '';
  let anonKey = '';

  if (typeof window !== 'undefined' && window.localStorage) {
    url = localStorage.getItem(STORAGE_KEY_URL) || '';
    anonKey = localStorage.getItem(STORAGE_KEY_KEY) || '';
  }

  if (!url || !anonKey) {
    url = url || memUrl;
    anonKey = anonKey || memKey;
  }

  if (!url || !anonKey) {
    const envConfig = getEnvConfig();
    url = url || envConfig.url;
    anonKey = anonKey || envConfig.anonKey;
  }

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    isConfigured: isValidConfig(url, anonKey),
  };
}

export function initSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    activeClient = null;
    activeUrl = '';
    activeKey = '';
    return null;
  }

  if (activeClient && activeUrl === url && activeKey === anonKey) {
    return activeClient;
  }

  try {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    activeUrl = url;
    activeKey = anonKey;
    return activeClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    activeClient = null;
    return null;
  }
}

export function setSupabaseConfig(url: string, anonKey: string): boolean {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  memUrl = cleanUrl;
  memKey = cleanKey;

  if (typeof window !== 'undefined' && window.localStorage) {
    if (cleanUrl && cleanKey) {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_KEY);
    }
  }

  initSupabaseClient();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-changed'));
  }

  return isValidConfig(cleanUrl, cleanKey);
}

export async function testSupabaseConnection(
  url?: string,
  anonKey?: string
): Promise<{ success: boolean; latencyMs: number; error?: string; details?: string }> {
  const targetUrl = (url || getSupabaseConfig().url).trim();
  const targetKey = (anonKey || getSupabaseConfig().anonKey).trim();

  if (!targetUrl || !targetKey) {
    return { success: false, latencyMs: 0, error: 'Project URL and Anon Public Key are required.' };
  }

  if (!isValidConfig(targetUrl, targetKey)) {
    return { success: false, latencyMs: 0, error: 'Invalid Supabase URL or Anon key format.' };
  }

  const start = performance.now();

  try {
    const testClient = createClient(targetUrl, targetKey, {
      auth: { persistSession: false },
    });

    // 1. Test Auth Endpoint
    const authRes = await testClient.auth.getSession();
    if (authRes.error) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        error: `Supabase Auth error: ${authRes.error.message}`,
      };
    }

    // 2. Test Database Access (check memories table or schema)
    const { error: dbError } = await testClient
      .from('memories')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    const latencyMs = Math.round(performance.now() - start);

    if (dbError && dbError.code === '42P01') {
      // Table doesn't exist yet, but connection succeeded!
      return {
        success: true,
        latencyMs,
        details: 'Connected to Supabase! The "memories" table does not exist yet. Please run the SQL migration.',
      };
    }

    if (dbError && !['PGRST116', 'PGRST204'].includes(dbError.code)) {
      // Other error (e.g. permission or network)
      return {
        success: true,
        latencyMs,
        details: `Connected to Supabase Auth. Note: Database query returned notice: ${dbError.message}`,
      };
    }

    return {
      success: true,
      latencyMs,
      details: 'Connected successfully to Supabase Auth & PostgreSQL Database!',
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Math.round(performance.now() - start),
      error: err?.message || 'Connection attempt timed out or failed.',
    };
  }
}

// Initial client instantiation
initSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!activeClient) {
    initSupabaseClient();
  }
  return activeClient;
}

// Dynamic proxy export so `supabase` always resolves to the active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      return undefined;
    }
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});
