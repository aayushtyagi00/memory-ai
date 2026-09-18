import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts';
import { getGeminiClient, getOrCreateUserStore } from '../_shared/gemini.ts';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || file?.name || 'Untitled Memory';
    const category = (formData.get('category') as string) || 'General';
    const rawTags = (formData.get('tags') as string) || '[]';
    let tags: string[] = [];
    try {
      tags = JSON.parse(rawTags);
    } catch {
      tags = [];
    }

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File exceeds 15 MB limit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate MIME and extension
    const mimeType = file.type;
    const allowedExtensions = ALLOWED_MIME_TYPES[mimeType];
    if (!allowedExtensions) {
      return new Response(JSON.stringify({ error: `Unsupported file type: ${mimeType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const originalFileName = file.name.replace(/[^\w\.\-\s]/gi, '_');
    const hasValidExt = allowedExtensions.some((ext) => originalFileName.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      return new Response(JSON.stringify({ error: 'File extension does not match MIME type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBytes = await file.arrayBuffer();
    const supabaseAdmin = getServiceClient();

    // Determine memory type
    const memoryType: 'document' | 'image' = mimeType.startsWith('image/') ? 'image' : 'document';

    // 1. Insert memory row in pending state
    const { data: memoryRecord, error: insertError } = await supabaseAdmin
      .from('memories')
      .insert({
        user_id: user.id,
        title,
        type: memoryType,
        category,
        tags,
        original_file_name: originalFileName,
        mime_type: mimeType,
        file_size: file.size,
        indexing_status: 'pending',
      })
      .select()
      .single();

    if (insertError || !memoryRecord) {
      return new Response(JSON.stringify({ error: insertError?.message || 'Database insert failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const memoryId = memoryRecord.id;
    const storagePath = `${user.id}/${memoryId}/${originalFileName}`;

    // 2. Upload file to Supabase Storage bucket 'memory-files'
    const { error: storageError } = await supabaseAdmin.storage
      .from('memory-files')
      .upload(storagePath, fileBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (storageError) {
      await supabaseAdmin.from('memories').update({
        indexing_status: 'failed',
        indexing_error: `Storage error: ${storageError.message}`,
      }).eq('id', memoryId);

      return new Response(JSON.stringify({ error: storageError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update storage path and mark processing
    await supabaseAdmin.from('memories').update({
      storage_path: storagePath,
      indexing_status: 'processing',
    }).eq('id', memoryId);

    // 3. Upload to Gemini File Search Store
    try {
      const ai = getGeminiClient();
      const storeName = await getOrCreateUserStore(ai, supabaseAdmin, user.id);

      // Upload file to user store
      let operation = await (ai as any).fileSearchStores.uploadToFileSearchStore({
        file: new Blob([fileBytes], { type: mimeType }),
        fileSearchStoreName: storeName,
        config: {
          displayName: originalFileName,
          customMetadata: {
            memoryId,
            userId: user.id,
          },
        },
      });

      // Poll operation until finished
      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        operation = await (ai as any).operations.get({ name: operation.name });
      }

      if (operation.error) {
        throw new Error(operation.error.message || 'Gemini indexing failed');
      }

      const geminiDocName = operation.response?.name || operation.metadata?.documentName || null;

      // Update memory record to ready
      const { data: updatedMemory, error: updateErr } = await supabaseAdmin
        .from('memories')
        .update({
          indexing_status: 'ready',
          gemini_store_name: storeName,
          gemini_document_name: geminiDocName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoryId)
        .select()
        .single();

      return new Response(JSON.stringify({ success: true, memory: updatedMemory || memoryRecord }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (geminiError: any) {
      console.error('Gemini indexing error:', geminiError);
      await supabaseAdmin.from('memories').update({
        indexing_status: 'failed',
        indexing_error: geminiError?.message || 'Indexing failed',
        updated_at: new Date().toISOString(),
      }).eq('id', memoryId);

      return new Response(JSON.stringify({
        success: false,
        error: geminiError?.message || 'Gemini indexing error',
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
