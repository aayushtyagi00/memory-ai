import { createClient } from '@supabase/supabase-js';
export function getServiceClient(){const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw new Error('Backend configuration is incomplete.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function getAuthenticatedUser(req:Request){
  const header=req.headers.get('Authorization');if(!header?.startsWith('Bearer '))return {user:null,error:'Unauthorized',client:null};
  const client=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_ANON_KEY')||'',{global:{headers:{Authorization:header}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser();return {user:data.user,error:error?.message||(!data.user?'Unauthorized':null),client};
}
