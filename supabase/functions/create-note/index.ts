import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts';
import { getGeminiClient, getOrCreateUserStore } from '../_shared/gemini.ts';

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

    const { title, content, category = 'Personal', tags = [] } = await req.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Title and content are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getServiceClient();

    // 1. Insert memory record
    const safeTitle = title.trim();
    const fileName = `${safeTitle.replace(/[^\w\.\-\s]/gi, '_')}.txt`;
    const textDocument = `Title: ${safeTitle}\nCategory: ${category}\nTags: ${tags.join(', ')}\n\n${content}`;
    const textBytes = new TextEncoder().encode(textDocument);

    const { data: memoryRecord, error: memError } = await supabaseAdmin
      .from('memories')
      .insert({
        user_id: user.id,
        title: safeTitle,
        type: 'note',
        category,
        tags,
        original_file_name: fileName,
        mime_type: 'text/plain',
        file_size: textBytes.length,
        indexing_status: 'pending',
      })
      .select()
      .single();

    if (memError || !memoryRecord) {
      return new Response(JSON.stringify({ error: memError?.message || 'Database insert failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const memoryId = memoryRecord.id;

    // 2. Insert notes table record
    await supabaseAdmin.from('notes').insert({
      user_id: user.id,
      memory_id: memoryId,
      content,
    });

    // 3. Upload text to Supabase Storage
    const storagePath = `${user.id}/${memoryId}/${fileName}`;
    await supabaseAdmin.storage.from('memory-files').upload(storagePath, textBytes, {
      contentType: 'text/plain',
      upsert: true,
    });

    await supabaseAdmin.from('memories').update({
      storage_path: storagePath,
      indexing_status: 'processing',
    }).eq('id', memoryId);

    // 4. Index into Gemini File Search Store
    try {
      const ai = getGeminiClient();
      const storeName = await getOrCreateUserStore(ai, supabaseAdmin, user.id);

      let operation = await (ai as any).fileSearchStores.uploadToFileSearchStore({
        file: new Blob([textBytes], { type: 'text/plain' }),
        fileSearchStoreName: storeName,
        config: {
          displayName: fileName,
          customMetadata: {
            memoryId,
            userId: user.id,
            isNote: 'true',
          },
        },
      });

      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        operation = await (ai as any).operations.get({ name: operation.name });
      }

      if (operation.error) {
        throw new Error(operation.error.message || 'Gemini indexing error');
      }

      const { data: readyMemory } = await supabaseAdmin
        .from('memories')
        .update({
          indexing_status: 'ready',
          gemini_store_name: storeName,
          gemini_document_name: operation.response?.name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoryId)
        .select()
        .single();

      return new Response(JSON.stringify({ success: true, memory: readyMemory || memoryRecord }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (indexError: any) {
      console.error('Note indexing error:', indexError);
      await supabaseAdmin.from('memories').update({
        indexing_status: 'failed',
        indexing_error: indexError?.message || 'Indexing failed',
      }).eq('id', memoryId);

      return new Response(JSON.stringify({
        success: false,
        error: indexError?.message || 'Indexing failed',
        memoryId,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
