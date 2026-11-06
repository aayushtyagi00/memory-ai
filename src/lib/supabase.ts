import {createClient, type SupabaseClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim()||'';
const anonKey=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()||'';
function validURL(value:string){try{const u=new URL(value);return u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname));}catch{return false;}}
const configured=validURL(url)&&anonKey.length>20;
let client:SupabaseClient|null=null;
export function isSupabaseConfigured(){return configured;}
export function getSupabaseConfig(){return {url,anonKey,isConfigured:configured};}
export function getSupabaseClient(){if(!client&&configured)client=createClient(url,anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
