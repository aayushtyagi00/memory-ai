import {endpoint,HttpError} from '../_shared/http.ts';
Deno.serve(endpoint('load-demo-data',async()=>{throw new HttpError(400,'Sample data is available only in the isolated local demo.');}));
