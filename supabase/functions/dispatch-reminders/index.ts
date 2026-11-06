import {getServiceClient} from '../_shared/auth.ts';
import {checked} from '../_shared/http.ts';
async function sameSecret(input:string,secret:string){const encode=new TextEncoder();const [a,b]=await Promise.all([input,secret].map(s=>crypto.subtle.digest('SHA-256',encode.encode(s))));const x=new Uint8Array(a),y=new Uint8Array(b);let difference=0;for(let i=0;i<x.length;i++)difference|=x[i]^y[i];return difference===0;}
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};const secret=Deno.env.get('REMINDER_CRON_SECRET');const key=Deno.env.get('RESEND_API_KEY');const sender=Deno.env.get('REMINDER_FROM_EMAIL');
 if(req.method!=='POST')return new Response('{}',{status:405,headers});
 if(!secret||secret.length<32||!key||!sender)return new Response(JSON.stringify({error:'Reminder delivery is not configured.'}),{status:503,headers});
 if(!await sameSecret(req.headers.get('x-reminder-secret')||'',secret))return new Response('{}',{status:401,headers});
 const admin=getServiceClient();let sent=0;let failed=0;
 try{
  const due=checked(await admin.rpc('claim_due_reminders')) as {id:string;user_id:string;title:string;description:string|null;due_at:string}[];
  for(const reminder of due){try{
   // Recheck consent and status immediately before delivery; never use editable profile.email.
   const profile=checked(await admin.from('profiles').select('email_reminders').eq('id',reminder.user_id).single());
   const latest=checked(await admin.from('reminders').select('status').eq('id',reminder.id).eq('user_id',reminder.user_id).maybeSingle());if(!profile?.email_reminders||latest?.status!=='pending')continue;
   const auth=await admin.auth.admin.getUserById(reminder.user_id);if(auth.error||!auth.data.user.email||!auth.data.user.email_confirmed_at)throw new Error('Recipient unavailable');
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15_000),headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`reminder-${reminder.id}-${reminder.due_at}`},body:JSON.stringify({from:sender,to:[auth.data.user.email],subject:`Memory AI reminder: ${reminder.title}`,text:`${reminder.title}\nDue: ${reminder.due_at}\n\n${reminder.description||''}\n\nYou enabled email reminders in Memory AI Settings. Sign in to manage or disable them.`})});
   if(!response.ok)throw new Error('Delivery failed');checked(await admin.from('reminders').update({delivered_at:new Date().toISOString(),delivery_lease_until:null}).eq('id',reminder.id).eq('user_id',reminder.user_id));sent++;
  }catch{failed++;}}
  return new Response(JSON.stringify({sent,failed}),{headers});
 }catch{console.error(JSON.stringify({event:'reminder_dispatch_failed'}));return new Response(JSON.stringify({error:'Reminder dispatch failed.'}),{status:500,headers});}
});
