import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts';
import { getGeminiClient } from '../_shared/gemini.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { memoryId } = await req.json();
    if (!memoryId) {
      return new Response(JSON.stringify({ error: 'memoryId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getServiceClient();

    // 1. Fetch memory record (must belong to authenticated user)
    const { data: memory, error: fetchErr } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('id', memoryId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !memory) {
      return new Response(JSON.stringify({ error: 'Memory not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Delete from Gemini File Search Store if document name exists
    if (memory.gemini_document_name) {
      try {
        const ai = getGeminiClient();
        await (ai as any).fileSearchStores.documents.delete({
          name: memory.gemini_document_name,
          force: true,
        });
      } catch (geminiDelErr) {
        console.warn('Could not delete Gemini document:', geminiDelErr);
      }
    }

    // 3. Delete from Supabase Storage
    if (memory.storage_path) {
      try {
        await supabaseAdmin.storage.from('memory-files').remove([memory.storage_path]);
      } catch (storageDelErr) {
        console.warn('Could not delete storage file:', storageDelErr);
      }
    }

    // 4. Delete notes and memory row
    await supabaseAdmin.from('notes').delete().eq('memory_id', memoryId);
    await supabaseAdmin.from('memories').delete().eq('id', memoryId);

    return new Response(JSON.stringify({ success: true, memoryId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
