/**
 * Mock project/library data for the redesign library + project-detail screens.
 */

export interface MockProject {
  id: string;
  name: string;
  description: string;
  /** Tailwind-friendly accent hex used for the project chip/cover. */
  color: string;
  meetingCount: number;
  memberCount: number;
  updated: string; // ISO
  /** IDs from MOCK_MEETINGS that belong to this project. */
  meetingIds: string[];
}

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'p-redesign',
    name: 'Redesign',
    description: 'Warm, focused refresh of the Saransh desktop app.',
    color: '#c2410c',
    meetingCount: 12,
    memberCount: 6,
    updated: '2026-08-25T10:30:00Z',
    meetingIds: ['m-design-critique'],
  },
  {
    id: 'p-growth',
    name: 'Growth',
    description: 'Funnel, activation, and retention experiments.',
    color: '#d35238',
    meetingCount: 9,
    memberCount: 5,
    updated: '2026-08-25T16:00:00Z',
    meetingIds: ['m-analytics-deep-dive'],
  },
  {
    id: 'p-platform',
    name: 'Platform',
    description: 'Core services, auth, and developer experience.',
    color: '#9a3412',
    meetingCount: 18,
    memberCount: 8,
    updated: '2026-08-25T14:00:00Z',
    meetingIds: ['m-sprint-planning', 'm-1on1'],
  },
  {
    id: 'p-revenue',
    name: 'Revenue',
    description: 'Sales, customer success, and renewals.',
    color: '#a2492e',
    meetingCount: 7,
    memberCount: 4,
    updated: '2026-08-24T15:30:00Z',
    meetingIds: ['m-customer-sync'],
  },
];

export const MOCK_PROJECT = MOCK_PROJECTS[0];
