/**
 * Mock meeting data for redesign screens (static, no backend).
 */

export type MeetingPlatform = 'google-meet' | 'microsoft-teams' | 'zoom' | 'in-person';

export type MeetingStatus = 'summary-ready' | 'transcribed' | 'generating' | 'recording';

export interface MockAttendee {
  name: string;
  avatarUrl?: string | null;
}

export interface MockMeeting {
  id: string;
  title: string;
  /** ISO date string. */
  date: string;
  /** Human duration, e.g. "48 min". */
  duration: string;
  platform: MeetingPlatform;
  status: MeetingStatus;
  attendees: MockAttendee[];
  /** Short one-line preview of the summary. */
  preview: string;
  tags: string[];
  project?: string;
}

export const MOCK_MEETINGS: MockMeeting[] = [
  {
    id: 'm-analytics-deep-dive',
    title: 'Analytics Deep Dive',
    date: '2026-08-25T16:00:00Z',
    duration: '52 min',
    platform: 'google-meet',
    status: 'summary-ready',
    attendees: [
      { name: 'Priya Nair' },
      { name: 'Sam Whitfield' },
      { name: 'Grace Okafor' },
      { name: 'Kenji Tanaka' },
      { name: 'Diego Alvarez' },
      { name: 'Nadia Rahman' },
      { name: 'Omar Haddad' },
    ],
    preview: 'Reviewed Q3 funnel drop-off; agreed to instrument the checkout step by Friday.',
    tags: ['Analytics', 'Q3', 'Growth'],
    project: 'Growth',
  },
  {
    id: 'm-sprint-planning',
    title: 'Sprint Planning',
    date: '2026-08-25T14:00:00Z',
    duration: '41 min',
    platform: 'google-meet',
    status: 'transcribed',
    attendees: [
      { name: 'Ava Bennett' },
      { name: 'Marcus Lee' },
      { name: 'Vikram Shah' },
      { name: 'Nina Patel' },
      { name: 'Paul Rivera' },
      { name: 'Sofia Marin' },
    ],
    preview: 'Committed 34 points; carved out the auth refactor into its own track.',
    tags: ['Engineering', 'Sprint 14'],
    project: 'Platform',
  },
  {
    id: 'm-design-critique',
    title: 'Design Critique',
    date: '2026-08-25T10:30:00Z',
    duration: '38 min',
    platform: 'microsoft-teams',
    status: 'summary-ready',
    attendees: [
      { name: 'Bea Coleman' },
      { name: 'Will Turner' },
      { name: 'Rosa Nunez' },
      { name: 'Mika Suzuki' },
      { name: 'Victor Bello' },
      { name: 'Hana Kim' },
      { name: 'Leo Fischer' },
      { name: 'Amara Diallo' },
    ],
    preview: 'Aligned on the warm palette; flagged contrast on secondary buttons.',
    tags: ['Design', 'Redesign'],
    project: 'Redesign',
  },
  {
    id: 'm-customer-sync',
    title: 'Customer Success Sync',
    date: '2026-08-24T15:30:00Z',
    duration: '29 min',
    platform: 'zoom',
    status: 'summary-ready',
    attendees: [{ name: 'Elena Rossi' }, { name: 'Tom Becker' }, { name: 'Jade Lin' }],
    preview: 'Two renewals at risk; success plan owners assigned for both accounts.',
    tags: ['CS', 'Renewals'],
    project: 'Revenue',
  },
  {
    id: 'm-all-hands',
    title: 'Monthly All-Hands',
    date: '2026-08-22T17:00:00Z',
    duration: '1 hr 6 min',
    platform: 'google-meet',
    status: 'generating',
    attendees: [
      { name: 'Priya Nair' },
      { name: 'Marcus Lee' },
      { name: 'Elena Rossi' },
      { name: 'Kenji Tanaka' },
      { name: 'Grace Okafor' },
    ],
    preview: 'Generating summary…',
    tags: ['Company'],
  },
  {
    id: 'm-1on1',
    title: '1:1 — Marcus & Ava',
    date: '2026-08-21T13:00:00Z',
    duration: '24 min',
    platform: 'in-person',
    status: 'transcribed',
    attendees: [{ name: 'Marcus Lee' }, { name: 'Ava Bennett' }],
    preview: 'Career growth check-in; set two goals for the next quarter.',
    tags: ['1:1'],
    project: 'Platform',
  },
];

export const MOCK_MEETING = MOCK_MEETINGS[0];
