import {endpoint,HttpError} from '../_shared/http.ts';
// Retire the old shared-key endpoint, including for clients running an older build.
Deno.serve(endpoint('ask-memory',async()=>{
  throw new HttpError(410,'AI now uses your personal Gemini key directly from your browser. Refresh the app and add your key in Settings.');
}));
