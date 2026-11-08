import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { setStorageMode } from '../lib/storageMode';
import {restoreAccountKey} from '../services/accountKey';
import {reportError} from '../components/common/Feedback';
import { geminiService } from '../services/gemini';
interface AuthContextType {
  user:User|null;session:Session|null;isLoading:boolean;isDemoUser:boolean;isSupabaseActive:boolean;
  signIn:(email:string,password?:string)=>Promise<{error?:string}>;
  signUp:(email:string,password?:string,displayName?:string)=>Promise<{error?:string;requiresEmailVerification?:boolean}>;
  signInWithGoogle:()=>Promise<{error?:string}>;signOut:()=>Promise<void>;
  resetPassword:(email:string)=>Promise<{error?:string;success?:boolean}>;
  refreshSession:()=>Promise<void>;
}
const AuthContext=createContext<AuthContextType|undefined>(undefined);
const errorText=(error:unknown)=>error instanceof Error?error.message:'Authentication failed. Try again.';
export const AuthProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const [user,setUser]=useState<User|null>(null);const [session,setSession]=useState<Session|null>(null);const [isLoading,setLoading]=useState(true);const isDemoUser=false;const [active,setActive]=useState(isSupabaseConfigured());
  const authEpoch=useRef(0);
  const apply=useCallback(async(incoming:Session|null)=>{
    const epoch=++authEpoch.current;
    setLoading(true);
    let verified=incoming;
    if(incoming){
      try {const client=getSupabaseClient();const result=await client?.auth.getUser(incoming.access_token);
        if(!result||result.error||!result.data.user||result.data.user.id!==incoming.user.id)verified=null;
        else verified={...incoming,user:result.data.user};
      }catch{verified=null;}
    }
    if(epoch!==authEpoch.current)return;
    setSession(verified);setUser(verified?.user||null);
    setStorageMode(verified?{kind:'cloud',userId:verified.user.id}:{kind:'signed-out'});
    setLoading(false);
  },[]);
  useEffect(()=>{geminiService.setApiKey('');if(user?.id)void restoreAccountKey().catch(reportError);},[user?.id]);
  const sync=useCallback(async()=>{const client=getSupabaseClient();setActive(isSupabaseConfigured());if(!client){apply(null);return;}const {data,error}=await client.auth.getSession();if(error){apply(null);return;}apply(data.session);},[apply]);
  useEffect(()=>{
    let subscription:{unsubscribe:()=>void}|undefined;let alive=true;let epoch=0;
    const bind=()=>{const current=++epoch;subscription?.unsubscribe();setActive(isSupabaseConfigured());const client=getSupabaseClient();
      if(!client){apply(null);return;}
      subscription=client.auth.onAuthStateChange((_event,newSession)=>{if(alive&&current===epoch){if(_event==='SIGNED_OUT')geminiService.setApiKey('');apply(newSession);}}).data.subscription;
      client.auth.getSession().then(({data,error})=>{if(alive&&current===epoch)apply(error?null:data.session);}).catch(()=>{if(alive&&current===epoch)apply(null);});
    };
    bind();window.addEventListener('supabase-config-changed',bind);
    return()=>{alive=false;subscription?.unsubscribe();window.removeEventListener('supabase-config-changed',bind);};
  },[apply]);
  const signIn=async(email:string,password?:string)=>{const client=getSupabaseClient();if(!client||!password)return {error:'Cloud sign-in is not configured. Contact the app administrator.'};try{sessionStorage.removeItem('memory_ai_demo');const {data,error}=await client.auth.signInWithPassword({email:email.trim(),password});if(error)return {error:error.message};apply(data.session);return {};}catch(e){return {error:errorText(e)};}};
  const signUp=async(email:string,password?:string,displayName?:string)=>{const client=getSupabaseClient();if(!client||!password)return {error:'Cloud registration is not configured. Contact the app administrator.'};try{sessionStorage.removeItem('memory_ai_demo');const {data,error}=await client.auth.signUp({email:email.trim(),password,options:{data:{full_name:displayName?.slice(0,100)||email.split('@')[0]},emailRedirectTo:window.location.origin+'/dashboard'}});if(error)return {error:error.message};if(!data.session)return {requiresEmailVerification:true};apply(data.session);return {};}catch(e){return {error:errorText(e)};}};
  const signOut=async()=>{const client=getSupabaseClient();if(client){const {error}=await client.auth.signOut();if(error)throw error;}sessionStorage.removeItem('memory_ai_demo');localStorage.removeItem('memory_ai_auth_state');geminiService.setApiKey('');apply(null);};
  const resetPassword=async(email:string)=>{const client=getSupabaseClient();if(!client)return {error:'Configure Supabase in .env to send password recovery emails.'};try{const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/reset-password'});return error?{error:error.message}:{success:true};}catch(e){return {error:errorText(e)};}};
  const signInWithGoogle=async()=>{const client=getSupabaseClient();if(!client)return {error:'Configure Supabase and its Google provider first.'};sessionStorage.removeItem('memory_ai_demo');const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/dashboard'}});return error?{error:error.message}:{};};
  return <AuthContext.Provider value={{user,session,isLoading,isDemoUser,isSupabaseActive:active,signIn,signUp,signOut,signInWithGoogle,resetPassword,refreshSession:sync}}>{children}</AuthContext.Provider>;
};
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be inside AuthProvider');return context;}
