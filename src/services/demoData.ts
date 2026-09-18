import { Memory, Reminder } from '../types';

export const INITIAL_DEMO_MEMORIES: Memory[] = [
  {
    id: 'demo-mem-1',
    user_id: 'demo-user-id',
    title: 'DBMS Exam Schedule',
    description: 'Autumn Semester 2026 examination schedule for CS-401 Database Management Systems.',
    type: 'document',
    category: 'Academic',
    tags: ['exam', 'dbms', 'schedule', 'college', 'semester'],
    original_file_name: 'exam_schedule.pdf',
    mime_type: 'application/pdf',
    file_size: 245000,
    indexing_status: 'ready',
    is_favorite: true,
    created_at: '2026-09-10T09:00:00.000Z',
    updated_at: '2026-09-10T09:02:00.000Z',
    content: `UNIVERSITY EXAMINATION SCHEDULE - AUTUMN SEMESTER 2026
Course: Database Management Systems (CS-401)
DBMS examination: 24 September 2026, 10:00 AM
Venue: Examination Hall 3, Block B
Duration: 3 Hours
Instructions: Bring university ID card and scientific calculator. No digital watches permitted.`,
  },
  {
    id: 'demo-mem-2',
    user_id: 'demo-user-id',
    title: 'Final-Year Project Presentation Announcement',
    description: 'Official department circular with presentation slot and evaluation criteria.',
    type: 'document',
    category: 'Academic',
    tags: ['project', 'final-year', 'presentation', 'deadline', 'demo'],
    original_file_name: 'project_announcement.pdf',
    mime_type: 'application/pdf',
    file_size: 184000,
    indexing_status: 'ready',
    is_favorite: true,
    created_at: '2026-09-12T11:00:00.000Z',
    updated_at: '2026-09-12T11:05:00.000Z',
    content: `DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
ANNOUNCEMENT FOR FINAL YEAR STUDENTS:
Final-year project presentation: 27 September 2026, 11:30 AM
Location: Seminar Room 102
Panel: Dr. K. Sharma, Prof. A. Mehta
Requirement: Each team must present project architecture, live software demonstration, and system metrics. Slides must be submitted 24 hours in advance.`,
  },
  {
    id: 'demo-mem-3',
    user_id: 'demo-user-id',
    title: 'Campus Hostel Payment Receipt',
    description: 'Official receipt for Autumn Semester accommodation and amenities fee.',
    type: 'document',
    category: 'Financial',
    tags: ['hostel', 'fees', 'receipt', 'accommodation', 'paid'],
    original_file_name: 'hostel_receipt.pdf',
    mime_type: 'application/pdf',
    file_size: 132000,
    indexing_status: 'ready',
    is_favorite: false,
    created_at: '2026-08-20T14:30:00.000Z',
    updated_at: '2026-08-20T14:32:00.000Z',
    content: `CAMPUS HOSTEL ACCOMMODATION RECEIPT
Receipt No: HST-2026-9812
Student Name: Aayush
Hostel payment: ₹42,500
Room: 402, Ganga Hostel
Period: Autumn Semester (July - December 2026)
Payment Status: PAID IN FULL via Net Banking.
Transaction Ref: TXN94810294. Verified by Warden Office.`,
  },
  {
    id: 'demo-mem-4',
    user_id: 'demo-user-id',
    title: 'Nova Labs Internship Interview',
    description: 'Interview invitation and role specifications for Software Engineering Intern.',
    type: 'document',
    category: 'Career',
    tags: ['internship', 'interview', 'career', 'tech', 'software'],
    original_file_name: 'internship_offer.pdf',
    mime_type: 'application/pdf',
    file_size: 310000,
    indexing_status: 'ready',
    is_favorite: true,
    created_at: '2026-09-15T16:00:00.000Z',
    updated_at: '2026-09-15T16:03:00.000Z',
    content: `NOVA LABS - TECHNICAL INTERNSHIP OPPORTUNITY
Role: Software Engineering Intern (AI & Systems)
Internship interview: 20 September 2026, 2:00 PM
Meeting Link: https://meet.google.com/nov-tech-int
Interviewer: Alex Rivera (Head of Engineering)
Stipend: ₹45,000 / month
Duration: 6 Months starting January 2027
Round: Technical System Design & Live Coding.`,
  },
  {
    id: 'demo-mem-5',
    user_id: 'demo-user-id',
    title: 'Guidance Notes from Professor',
    description: 'Personal notes from 1-on-1 meeting discussing capstone presentation prep.',
    type: 'note',
    category: 'Academic',
    tags: ['professor', 'notes', 'project', 'advice', 'review'],
    original_file_name: 'professor_notes.txt',
    mime_type: 'text/plain',
    file_size: 850,
    indexing_status: 'ready',
    is_favorite: false,
    created_at: '2026-09-16T18:45:00.000Z',
    updated_at: '2026-09-16T18:45:00.000Z',
    content: `Professor said prepare project architecture, database schema and demonstration.
Key recommendations from our discussion:
1. Emphasize the end-to-end grounded RAG pipeline visually: Add Memory -> Gemini Index -> Ask Question -> Grounded Answer -> Source Evidence.
2. Show strict evidence citations from real files rather than ungrounded claims.
3. Keep secrets strictly on server/Edge Functions; no keys in browser.
4. Prepare to answer questions regarding multimodal retrieval for screenshot receipts.`,
  },
  {
    id: 'demo-mem-6',
    user_id: 'demo-user-id',
    title: 'Semester Fee Payment Receipt',
    description: 'Screenshot of bank transaction acknowledgment for college tuition fees.',
    type: 'image',
    category: 'Financial',
    tags: ['tuition', 'fee', 'receipt', 'finance', 'screenshot'],
    original_file_name: 'fee_receipt.png',
    mime_type: 'image/png',
    file_size: 512000,
    indexing_status: 'ready',
    is_favorite: false,
    created_at: '2026-08-15T12:00:00.000Z',
    updated_at: '2026-08-15T12:05:00.000Z',
    content: `COLLEGE TUITION & EXAM FEE RECEIPT
Reference: HDFC-ONLINE-84729103
Student: Aayush (Roll: 22BCS108)
Academic Year: 2026-2027
Tuition Fee Paid: ₹78,000
Exam Fee: ₹2,000
Total Amount Paid: ₹80,000
Status: SUCCESSFUL
Timestamp: 15 August 2026, 11:42 AM`,
  },
];

export const DEMO_REMINDERS: Reminder[] = [
  {
    id: 'rem-1',
    user_id: 'demo-user-id',
    title: 'Nova Labs Internship Interview',
    description: 'Technical System Design & Live Coding round via Google Meet.',
    due_at: '2026-09-20T14:00:00.000Z',
    source_memory_id: 'demo-mem-4',
    source_memory_title: 'internship_offer.pdf',
    status: 'pending',
    created_at: '2026-09-15T16:05:00.000Z',
  },
  {
    id: 'rem-2',
    user_id: 'demo-user-id',
    title: 'DBMS Examination',
    description: 'Examination Hall 3, Block B. Bring scientific calculator.',
    due_at: '2026-09-24T10:00:00.000Z',
    source_memory_id: 'demo-mem-1',
    source_memory_title: 'exam_schedule.pdf',
    status: 'pending',
    created_at: '2026-09-10T09:05:00.000Z',
  },
  {
    id: 'rem-3',
    user_id: 'demo-user-id',
    title: 'Final-Year Project Presentation',
    description: 'Seminar Room 102. Present architecture, live demo, and metrics.',
    due_at: '2026-09-27T11:30:00.000Z',
    source_memory_id: 'demo-mem-2',
    source_memory_title: 'project_announcement.pdf',
    status: 'pending',
    created_at: '2026-09-12T11:10:00.000Z',
  },
];

export const INITIAL_DEMO_CONVERSATIONS = [
  {
    id: 'conv-dbms-exam',
    title: 'DBMS Exam Schedule',
    created_at: '2026-09-18T10:40:00.000Z',
    updated_at: '2026-09-18T10:41:00.000Z',
    messages: [
      {
        id: 'msg-dbms-user',
        role: 'user' as const,
        content: 'When is my DBMS exam?',
        timestamp: '10:40 AM',
      },
      {
        id: 'msg-dbms-assistant',
        role: 'assistant' as const,
        content: 'Your Database Management Systems (DBMS) examination is scheduled for 24 September 2026 at 10:00 AM in Examination Hall 3, Block B.',
        sources: [
          {
            id: 'demo-mem-1',
            memoryId: 'demo-mem-1',
            title: 'DBMS Exam Schedule',
            fileName: 'exam_schedule.pdf',
            type: 'document',
            citation: 'exam_schedule.pdf',
            snippet: 'Course: Database Management Systems (CS-401)\nDBMS examination: 24 September 2026, 10:00 AM\nVenue: Examination Hall 3, Block B',
          },
        ],
        conflictDetected: false,
        timestamp: '10:41 AM',
      },
    ],
    activeSources: [
      {
        id: 'demo-mem-1',
        memoryId: 'demo-mem-1',
        title: 'DBMS Exam Schedule',
        fileName: 'exam_schedule.pdf',
        type: 'document',
        citation: 'exam_schedule.pdf',
        snippet: 'Course: Database Management Systems (CS-401)\nDBMS examination: 24 September 2026, 10:00 AM\nVenue: Examination Hall 3, Block B',
      },
    ],
    conflictDetected: false,
  },
  {
    id: 'conv-hostel-payment',
    title: 'Campus Hostel Payment',
    created_at: '2026-09-17T14:20:00.000Z',
    updated_at: '2026-09-17T14:22:00.000Z',
    messages: [
      {
        id: 'msg-hostel-user',
        role: 'user' as const,
        content: 'How much did I pay for hostel?',
        timestamp: '02:20 PM',
      },
      {
        id: 'msg-hostel-assistant',
        role: 'assistant' as const,
        content: 'You paid ₹42,500 for your campus hostel accommodation (Room 402, Ganga Hostel) for the Autumn Semester 2026. The payment is marked as PAID IN FULL via Net Banking (Ref: TXN94810294).',
        sources: [
          {
            id: 'demo-mem-3',
            memoryId: 'demo-mem-3',
            title: 'Campus Hostel Payment Receipt',
            fileName: 'hostel_receipt.pdf',
            type: 'document',
            citation: 'hostel_receipt.pdf',
            snippet: 'Hostel payment: ₹42,500\nRoom: 402, Ganga Hostel\nPeriod: Autumn Semester (July - December 2026)',
          },
        ],
        conflictDetected: false,
        timestamp: '02:22 PM',
      },
    ],
    activeSources: [
      {
        id: 'demo-mem-3',
        memoryId: 'demo-mem-3',
        title: 'Campus Hostel Payment Receipt',
        fileName: 'hostel_receipt.pdf',
        type: 'document',
        citation: 'hostel_receipt.pdf',
        snippet: 'Hostel payment: ₹42,500\nRoom: 402, Ganga Hostel\nPeriod: Autumn Semester (July - December 2026)',
      },
    ],
    conflictDetected: false,
  },
  {
    id: 'conv-project-prep',
    title: 'Final-Year Project Prep',
    created_at: '2026-09-16T11:15:00.000Z',
    updated_at: '2026-09-16T11:18:00.000Z',
    messages: [
      {
        id: 'msg-project-user',
        role: 'user' as const,
        content: 'What should I prepare for the project presentation?',
        timestamp: '11:15 AM',
      },
      {
        id: 'msg-project-assistant',
        role: 'assistant' as const,
        content: 'For your final-year project presentation on 27 September 2026 at 11:30 AM (Seminar Room 102), you need to prepare the project architecture, database schema, live software demonstration, and system metrics. Slides must also be submitted 24 hours in advance.',
        sources: [
          {
            id: 'demo-mem-2',
            memoryId: 'demo-mem-2',
            title: 'Final-Year Project Presentation Announcement',
            fileName: 'project_announcement.pdf',
            type: 'document',
            citation: 'project_announcement.pdf',
            snippet: 'Final-year project presentation: 27 September 2026, 11:30 AM. Each team must present project architecture, live demonstration, and metrics.',
          },
        ],
        conflictDetected: false,
        timestamp: '11:18 AM',
      },
    ],
    activeSources: [
      {
        id: 'demo-mem-2',
        memoryId: 'demo-mem-2',
        title: 'Final-Year Project Presentation Announcement',
        fileName: 'project_announcement.pdf',
        type: 'document',
        citation: 'project_announcement.pdf',
        snippet: 'Final-year project presentation: 27 September 2026, 11:30 AM.',
      },
    ],
    conflictDetected: false,
  },
];

