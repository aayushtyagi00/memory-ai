import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts';
import { getGeminiClient, SYSTEM_INSTRUCTION } from '../_shared/gemini.ts';

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

    const { question, conversationId: reqConvId } = await req.json();
    if (!question || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getServiceClient();

    // 1. Look up user's store
    const { data: storeRecord } = await supabaseAdmin
      .from('memory_stores')
      .select('gemini_store_name')
      .eq('user_id', user.id)
      .single();

    if (!storeRecord?.gemini_store_name) {
      return new Response(JSON.stringify({
        answer: "You don't have any indexed memories yet. Upload a document or write a note to get started!",
        sources: [],
        foundInformation: false,
        conflictDetected: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storeName = storeRecord.gemini_store_name;

    // 2. Query Gemini with File Search Grounding
    const ai = getGeminiClient();
    const modelName = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: question,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
      },
    });

    const candidate = response.candidates?.[0];
    const answerText = candidate?.content?.parts?.map((p: any) => p.text || '').join('\n') ||
      "I couldn't find this information in your memories.";

    const notFoundPhrase = "I couldn't find this information in your memories.";
    const isNotFound = answerText.includes(notFoundPhrase) || answerText.trim().length === 0;

    // Detect conflict mentioned in answer
    const conflictDetected = /conflict|differing|discrepancy|differs/i.test(answerText);

    // 3. Extract grounding chunks and citations
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    // Map chunks to memories in database
    const { data: userMemories } = await supabaseAdmin
      .from('memories')
      .select('id, title, original_file_name, type')
      .eq('user_id', user.id);

    const memoryLookupByFileName = new Map<string, any>();
    (userMemories || []).forEach((m: any) => {
      if (m.original_file_name) memoryLookupByFileName.set(m.original_file_name.toLowerCase(), m);
      if (m.title) memoryLookupByFileName.set(m.title.toLowerCase(), m);
    });

    const sources: Array<{
      id?: string;
      title: string;
      fileName?: string;
      type?: string;
      citation?: string;
      memoryId?: string;
      snippet?: string;
    }> = [];

    if (!isNotFound && groundingChunks.length > 0) {
      const seenFiles = new Set<string>();
      for (const chunk of groundingChunks) {
        const title = chunk.retrievedContext?.title || '';
        const textSnippet = chunk.retrievedContext?.text || '';
        const normTitle = title.toLowerCase();

        if (!seenFiles.has(normTitle)) {
          seenFiles.add(normTitle);
          const matchedMemory = memoryLookupByFileName.get(normTitle);

          sources.push({
            id: matchedMemory?.id,
            title: matchedMemory?.title || title || 'Memory Source',
            fileName: matchedMemory?.original_file_name || title,
            type: matchedMemory?.type || (title.endsWith('.png') || title.endsWith('.jpg') ? 'image' : 'document'),
            citation: title,
            memoryId: matchedMemory?.id,
            snippet: textSnippet ? textSnippet.slice(0, 300) : undefined,
          });
        }
      }
    }

    // 4. Manage Conversation and Message History
    let conversationId = reqConvId;
    if (!conversationId) {
      const convTitle = question.slice(0, 40) + (question.length > 40 ? '...' : '');
      const { data: newConv } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: user.id,
          title: convTitle,
        })
        .select()
        .single();
      conversationId = newConv?.id;
    }

    if (conversationId) {
      // Insert user message
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: question,
      });

      // Insert assistant message
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: isNotFound ? notFoundPhrase : answerText,
        sources: isNotFound ? [] : sources,
      });
    }

    return new Response(JSON.stringify({
      answer: isNotFound ? notFoundPhrase : answerText,
      sources: isNotFound ? [] : sources,
      foundInformation: !isNotFound,
      conflictDetected,
      conversationId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Ask memory error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
