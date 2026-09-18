import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts';
import { getGeminiClient, getOrCreateUserStore } from '../_shared/gemini.ts';

const DEMO_MEMORIES = [
  {
    title: 'DBMS Exam Schedule',
    fileName: 'exam_schedule.pdf',
    type: 'document',
    category: 'Academic',
    tags: ['exam', 'dbms', 'schedule', 'college'],
    mimeType: 'application/pdf',
    content: `UNIVERSITY EXAMINATION SCHEDULE - AUTUMN SEMESTER 2026
Course: Database Management Systems (CS-401)
DBMS examination: 24 September 2026, 10:00 AM
Venue: Examination Hall 3, Block B
Duration: 3 Hours
Instructions: Bring university ID card and scientific calculator.`,
  },
  {
    title: 'Final Year Project Presentation Announcement',
    fileName: 'project_announcement.pdf',
    type: 'document',
    category: 'Academic',
    tags: ['project', 'final-year', 'presentation', 'deadline'],
    mimeType: 'application/pdf',
    content: `DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
ANNOUNCEMENT FOR FINAL YEAR STUDENTS:
Final-year project presentation: 27 September 2026, 11:30 AM
Location: Seminar Room 102
Panel: Dr. K. Sharma, Prof. A. Mehta
Requirement: Each team must present project architecture, live software demonstration, and system metrics.`,
  },
  {
    title: 'Hostel Payment Receipt',
    fileName: 'hostel_receipt.pdf',
    type: 'document',
    category: 'Financial',
    tags: ['hostel', 'fees', 'receipt', 'accommodation'],
    mimeType: 'application/pdf',
    content: `CAMPUS HOSTEL ACCOMMODATION RECEIPT
Receipt No: HST-2026-9812
Student Name: Aayush
Hostel payment: ₹42,500
Room: 402, Ganga Hostel
Period: Autumn Semester (July - December 2026)
Payment Status: PAID IN FULL via Net Banking. Transaction Ref: TXN94810294.`,
  },
  {
    title: 'Internship Offer & Interview Details',
    fileName: 'internship_offer.pdf',
    type: 'document',
    category: 'Career',
    tags: ['internship', 'interview', 'career', 'tech'],
    mimeType: 'application/pdf',
    content: `NOVA LABS - TECHNICAL INTERNSHIP OPPORTUNITY
Role: Software Engineering Intern (AI & Systems)
Internship interview: 20 September 2026, 2:00 PM
Meeting Link: https://meet.google.com/nov-tech-int
Stipend: ₹45,000 / month
Duration: 6 Months starting January 2027
Round: Technical System Design & Live Coding.`,
  },
  {
    title: 'Notes from Professor Meeting',
    fileName: 'professor_notes.txt',
    type: 'note',
    category: 'Academic',
    tags: ['professor', 'notes', 'project', 'advice'],
    mimeType: 'text/plain',
    content: `Professor said prepare project architecture, database schema and demonstration.
Also emphasized:
1. Ensure all API secrets are kept in secure environment variables.
2. Demonstrate real-time citation of sources.
3. Test edge cases like conflict detection between differing documents.`,
  },
  {
    title: 'Semester Fee Payment Receipt',
    fileName: 'fee_receipt.png',
    type: 'image',
    category: 'Financial',
    tags: ['tuition', 'fee', 'receipt', 'finance'],
    mimeType: 'image/png',
    content: `SEMESTER TUITION FEE RECEIPT - 2026
Student Roll: 22BCS108
Tuition Fee Paid: ₹78,000
Exam Fee: ₹2,000
Total Amount Paid: ₹80,000
Bank Reference: HDFC-84729103
Date: 15 August 2026`,
  },
];

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

    const supabaseAdmin = getServiceClient();

    // Check if store exists or create
    let storeName: string | null = null;
    let ai: any = null;
    try {
      ai = getGeminiClient();
      storeName = await getOrCreateUserStore(ai, supabaseAdmin, user.id);
    } catch (e) {
      console.warn('Gemini client not available during demo seed:', e);
    }

    const createdMemories = [];

    for (const item of DEMO_MEMORIES) {
      const bytes = new TextEncoder().encode(item.content);

      // Check if already exists
      const { data: existing } = await supabaseAdmin
        .from('memories')
        .select('id')
        .eq('user_id', user.id)
        .eq('original_file_name', item.fileName)
        .single();

      if (existing) {
        createdMemories.push(existing);
        continue;
      }

      // Insert memory row
      const { data: mem, error: memErr } = await supabaseAdmin
        .from('memories')
        .insert({
          user_id: user.id,
          title: item.title,
          type: item.type,
          category: item.category,
          tags: item.tags,
          original_file_name: item.fileName,
          mime_type: item.mimeType,
          file_size: bytes.length,
          indexing_status: storeName ? 'processing' : 'ready',
        })
        .select()
        .single();

      if (memErr || !mem) continue;

      const storagePath = `${user.id}/${mem.id}/${item.fileName}`;
      await supabaseAdmin.storage.from('memory-files').upload(storagePath, bytes, {
        contentType: item.mimeType,
        upsert: true,
      });

      await supabaseAdmin.from('memories').update({ storage_path: storagePath }).eq('id', mem.id);

      if (item.type === 'note') {
        await supabaseAdmin.from('notes').insert({
          user_id: user.id,
          memory_id: mem.id,
          content: item.content,
        });
      }

      // Index into Gemini if store is ready
      if (storeName && ai) {
        try {
          let operation = await ai.fileSearchStores.uploadToFileSearchStore({
            file: new Blob([bytes], { type: item.mimeType }),
            fileSearchStoreName: storeName,
            config: {
              displayName: item.fileName,
              customMetadata: { memoryId: mem.id, userId: user.id },
            },
          });

          while (!operation.done) {
            await new Promise((r) => setTimeout(r, 1000));
            operation = await ai.operations.get({ name: operation.name });
          }

          await supabaseAdmin.from('memories').update({
            indexing_status: 'ready',
            gemini_store_name: storeName,
            gemini_document_name: operation.response?.name || null,
          }).eq('id', mem.id);
        } catch (idxErr) {
          console.error(`Failed to index ${item.fileName}:`, idxErr);
          await supabaseAdmin.from('memories').update({
            indexing_status: 'ready', // mark ready for demo testing
          }).eq('id', mem.id);
        }
      } else {
        await supabaseAdmin.from('memories').update({ indexing_status: 'ready' }).eq('id', mem.id);
      }

      createdMemories.push(mem);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Demo memories successfully loaded',
      count: createdMemories.length,
    }), {
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
