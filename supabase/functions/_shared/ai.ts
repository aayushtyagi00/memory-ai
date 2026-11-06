import {HttpError} from './http.ts';
export const MODELS=['gemini-2.5-flash','gemini-2.5-pro','gemini-2.5-flash-lite'];
export async function generate(prompt:string,system:string,options:{model?:unknown;json?:boolean;inlineData?:{mimeType:string;data:string}[]}={}):Promise<string>{
  const key=Deno.env.get('GEMINI_API_KEY');if(!key)throw new HttpError(503,'Server AI is not configured. Ask the operator to set GEMINI_API_KEY.');
  const model=options.model||Deno.env.get('GEMINI_MODEL')||MODELS[0];if(typeof model!=='string'||!MODELS.includes(model))throw new HttpError(400,'Invalid model.');
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:AbortSignal.timeout(45_000),headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[...(options.inlineData||[]).map(inlineData=>({inlineData})),{text:prompt}]}],systemInstruction:{parts:[{text:system}]},generationConfig:{temperature:0.1,maxOutputTokens:8192,...(options.json?{responseMimeType:'application/json'}:{})}})});
  if(!response.ok)throw new HttpError(response.status===429?429:502,response.status===429?'AI usage limit reached. Try later.':'The AI provider could not complete the request. Retry later.');
  const result=await response.json();const output=result.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||'').join('');if(!output)throw new HttpError(502,'AI returned no usable text. Retry later.');return output;
}
export function base64(bytes:Uint8Array){let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);}
