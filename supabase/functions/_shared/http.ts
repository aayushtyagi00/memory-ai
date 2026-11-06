import {allowedOrigin,corsHeaders} from './cors.ts';
import {getAuthenticatedUser,getServiceClient} from './auth.ts';
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export function checked<T>(result:{data:T;error:unknown}):T {if(result.error)throw result.error;return result.data;}
export async function bytes(req:Request,limit:number):Promise<Uint8Array>{
  if(Number(req.headers.get('content-length'))>limit)throw new HttpError(413,'Request is too large.');
  const reader=req.body?.getReader();if(!reader)return new Uint8Array();const parts:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new HttpError(413,'Request is too large.');}parts.push(value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(size);let offset=0;for(const p of parts){result.set(p,offset);offset+=p.length;}return result;
}
export async function json(req:Request,limit=1_000_000):Promise<Record<string,unknown>>{try{const data=JSON.parse(new TextDecoder().decode(await bytes(req,limit)));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data;}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'Invalid JSON body.');}}
export function endpoint(name:string,handler:(req:Request,context:{userId:string;admin:ReturnType<typeof getServiceClient>;client:NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>['client']>})=>Promise<unknown>){
  return async(req:Request):Promise<Response>=>{
    const headers={...corsHeaders(req),'Content-Type':'application/json'};
    try{
      if(!allowedOrigin(req))throw new HttpError(403,'Origin not allowed.');
      if(req.method==='OPTIONS')return new Response(null,{headers});
      if(req.method!=='POST')throw new HttpError(405,'Use POST.');
      const {user,error,client}=await getAuthenticatedUser(req);if(error||!user||!client)throw new HttpError(401,'Sign in again to continue.');
      const admin=getServiceClient();const rate=checked(await admin.rpc('consume_request',{p_user:user.id,p_action:name}));if(rate!==true)throw new HttpError(429,'Usage limit reached. Try again later.');
      const result=await handler(req,{userId:user.id,admin,client});return new Response(JSON.stringify(result),{headers});
    }catch(e){
      const expected=e instanceof HttpError;const validation=e instanceof Error&&/must be|Invalid |Use at most|Choose |Supported |match its extension|exceeds|limit exceeded/.test(e.message);
      const status=expected?e.status:validation?400:500;
      if(status>=500)console.error(JSON.stringify({event:'request_failed',endpoint:name,code:(e as {code?:string})?.code||'internal'}));
      return new Response(JSON.stringify({error:expected||validation?(e as Error).message:'The operation failed. Please retry; no local fallback was used.'}),{status,headers});
    }
  };
}
