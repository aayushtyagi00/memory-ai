import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password?: string, displayName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  enableDemoUser: () => void;
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

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Supabase Auth listener
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Local demo mode: check if previously logged in
      const savedAuth = localStorage.getItem('memory_ai_auth_state');
      if (savedAuth === 'true') {
        setUser(DEMO_USER_OBJ);
        setIsDemoUser(true);
      }
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password?: string) => {
    if (isSupabaseConfigured && supabase && password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      setUser(data.user);
      setSession(data.session);
      return {};
    }

    // Demo sign in
    const demoUser = {
      ...DEMO_USER_OBJ,
      email: email || DEMO_USER_OBJ.email,
      user_metadata: { full_name: email.split('@')[0] || 'Aayush' },
    };
    setUser(demoUser);
    setIsDemoUser(true);
    localStorage.setItem('memory_ai_auth_state', 'true');
    return {};
  };

  const signUp = async (email: string, password?: string, displayName?: string) => {
    if (isSupabaseConfigured && supabase && password) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName || email.split('@')[0] },
        },
      });
      if (error) return { error: error.message };
      setUser(data.user);
      setSession(data.session);
      return {};
    }

    // Demo sign up
    const demoUser = {
      ...DEMO_USER_OBJ,
      email: email || DEMO_USER_OBJ.email,
      user_metadata: { full_name: displayName || email.split('@')[0] },
    };
    setUser(demoUser);
    setIsDemoUser(true);
    localStorage.setItem('memory_ai_auth_state', 'true');
    return {};
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsDemoUser(false);
    localStorage.removeItem('memory_ai_auth_state');
  };

  const enableDemoUser = () => {
    setUser(DEMO_USER_OBJ);
    setIsDemoUser(true);
    localStorage.setItem('memory_ai_auth_state', 'true');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isDemoUser, signIn, signUp, signOut, enableDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
