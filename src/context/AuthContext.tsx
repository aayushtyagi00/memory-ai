import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isDemoUser: boolean;
  isSupabaseActive: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password?: string,
    displayName?: string
  ) => Promise<{ error?: string; requiresEmailVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; success?: boolean }>;
  enableDemoUser: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_ID = 'demo-user-13506280';
const DEMO_USER_OBJ = {
  id: DEMO_USER_ID,
  email: 'aayush@memory.ai',
  user_metadata: {
    full_name: 'Aayush',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-09-01T00:00:00.000Z',
} as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [supabaseActive, setSupabaseActive] = useState(isSupabaseConfigured());

  const syncAuthState = useCallback(async () => {
    const configured = isSupabaseConfigured();
    setSupabaseActive(configured);

    const client = getSupabaseClient();
    if (configured && client) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          setIsDemoUser(false);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Error fetching Supabase session:', err);
      }
    }

    // Fallback: check demo user session
    const savedAuth = localStorage.getItem('memory_ai_auth_state');
    if (savedAuth === 'true') {
      setUser(DEMO_USER_OBJ);
      setIsDemoUser(true);
    } else {
      setUser(null);
      setIsDemoUser(false);
      setSession(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncAuthState();

    const client = getSupabaseClient();
    let unsubscribe: (() => void) | undefined;

    if (client) {
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          setIsDemoUser(false);
          localStorage.removeItem('memory_ai_auth_state');
        }
        setIsLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    // Listen to custom configuration changes from Settings
    const handleConfigChange = () => {
      syncAuthState();
    };

    window.addEventListener('supabase-config-changed', handleConfigChange);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('supabase-config-changed', handleConfigChange);
    };
  }, [syncAuthState]);

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    const client = getSupabaseClient();

    if (isSupabaseConfigured() && client && password) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) return { error: error.message };

        setUser(data.user);
        setSession(data.session);
        setIsDemoUser(false);
        localStorage.removeItem('memory_ai_auth_state');
        return {};
      } catch (err: any) {
        return { error: err?.message || 'Authentication error occurred.' };
      }
    }

    // Demo sign in
    const demoUser = {
      ...DEMO_USER_OBJ,
      email: email.trim() || DEMO_USER_OBJ.email,
      user_metadata: { full_name: email.split('@')[0] || 'Aayush' },
    };
    setUser(demoUser);
    setIsDemoUser(true);
    localStorage.setItem('memory_ai_auth_state', 'true');
    return {};
  };

  const signUp = async (
    email: string,
    password?: string,
    displayName?: string
  ): Promise<{ error?: string; requiresEmailVerification?: boolean }> => {
    const client = getSupabaseClient();

    if (isSupabaseConfigured() && client && password) {
      try {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: displayName || email.split('@')[0] },
          },
        });
        if (error) return { error: error.message };

        if (!data.session && data.user) {
          // Email confirmation is enabled in Supabase
          return { requiresEmailVerification: true };
        }

        setUser(data.user);
        setSession(data.session);
        setIsDemoUser(false);
        localStorage.removeItem('memory_ai_auth_state');
        return {};
      } catch (err: any) {
        return { error: err?.message || 'Registration error occurred.' };
      }
    }

    // Demo sign up
    const demoUser = {
      ...DEMO_USER_OBJ,
      email: email.trim() || DEMO_USER_OBJ.email,
      user_metadata: { full_name: displayName || email.split('@')[0] },
    };
    setUser(demoUser);
    setIsDemoUser(true);
    localStorage.setItem('memory_ai_auth_state', 'true');
    return {};
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Error signing out of Supabase:', err);
      }
    }
    setUser(null);
    setSession(null);
    setIsDemoUser(false);
    localStorage.removeItem('memory_ai_auth_state');
  };

  const resetPassword = async (email: string): Promise<{ error?: string; success?: boolean }> => {
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/login?reset=true',
        });
        if (error) return { error: error.message };
        return { success: true };
      } catch (err: any) {
        return { error: err?.message || 'Failed to send password reset email.' };
      }
    }
    return { error: 'Supabase is not configured yet. Add your Project URL & Anon Key in Settings.' };
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err?.message || 'Failed to initialize Google sign in.' };
      }
    }
    return { error: 'Supabase backend is not configured in .env.' };
  };

  const enableDemoUser = () => {
    setUser(DEMO_USER_OBJ);
    setIsDemoUser(true);
    localStorage.setItem('memory_ai_auth_state', 'true');
  };

  const refreshSession = async () => {
    await syncAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isDemoUser,
        isSupabaseActive: supabaseActive,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        enableDemoUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
