/**
 * Mock "Ask Saransh" chat data for the redesign ask screen.
 */

export type ChatRole = 'user' | 'assistant';

export interface MockCitation {
  meetingId: string;
  meetingTitle: string;
  timestamp: string; // e.g. "12:04"
}

export interface MockChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: MockCitation[];
}

export const MOCK_CHAT: MockChatMessage[] = [
  {
    id: 'c1',
    role: 'user',
    content: 'What did we decide about the Q3 checkout funnel?',
  },
  {
    id: 'c2',
    role: 'assistant',
    content:
      'In the Analytics Deep Dive you agreed the biggest drop-off is at the checkout step, so the team decided to instrument that step with event tracking by Friday. Priya owns the instrumentation and Sam will review the dashboard next week.',
    citations: [
      { meetingId: 'm-analytics-deep-dive', meetingTitle: 'Analytics Deep Dive', timestamp: '12:04' },
      { meetingId: 'm-analytics-deep-dive', meetingTitle: 'Analytics Deep Dive', timestamp: '31:47' },
    ],
  },
  {
    id: 'c3',
    role: 'user',
    content: 'Who is responsible for the auth refactor?',
  },
  {
    id: 'c4',
    role: 'assistant',
    content:
      'The auth refactor was carved into its own track during Sprint Planning. Marcus is the DRI, with Vikram supporting on the token migration.',
    citations: [
      { meetingId: 'm-sprint-planning', meetingTitle: 'Sprint Planning', timestamp: '08:22' },
    ],
  },
];

export const MOCK_CHAT_SUGGESTIONS: string[] = [
  'Summarize this week’s meetings',
  'What are my open action items?',
  'Draft a follow-up email for Sprint Planning',
  'What did the customer flag about renewals?',
];
