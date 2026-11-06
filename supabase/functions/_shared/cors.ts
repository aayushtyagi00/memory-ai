export function corsHeaders(req:Request){
  const origin=req.headers.get('Origin');const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim());
  return {'Access-Control-Allow-Origin':origin&&allowed.includes(origin)?origin:allowed[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
}
export function allowedOrigin(req:Request){const origin=req.headers.get('Origin');return !origin||(Deno.env.get('ALLOWED_ORIGINS')||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim()).includes(origin);}
