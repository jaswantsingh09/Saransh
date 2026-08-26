/**
 * Mock "Today's Schedule" data for the home dashboard.
 */
import type { MeetingPlatform, MockAttendee } from './meetings';

export interface MockScheduleItem {
  id: string;
  title: string;
  /** Display time, e.g. "4:00 PM". */
  time: string;
  platform: MeetingPlatform;
  attendees: MockAttendee[];
  /** Whether the meeting can be recorded/joined now. */
  joinable: boolean;
}

export const MOCK_SCHEDULE: MockScheduleItem[] = [
  {
    id: 's-analytics',
    title: 'Analytics Deep Dive',
    time: '4:00 PM',
    platform: 'google-meet',
    joinable: true,
    attendees: [
      { name: 'Priya Nair' },
      { name: 'Sam Whitfield' },
      { name: 'Grace Okafor' },
      { name: 'Kenji Tanaka' },
      { name: 'Diego Alvarez' },
      { name: 'Nadia Rahman' },
      { name: 'Omar Haddad' },
    ],
  },
  {
    id: 's-sprint',
    title: 'Sprint Planning',
    time: '2:00 PM',
    platform: 'google-meet',
    joinable: true,
    attendees: [
      { name: 'Ava Bennett' },
      { name: 'Marcus Lee' },
      { name: 'Vikram Shah' },
      { name: 'Nina Patel' },
      { name: 'Paul Rivera' },
      { name: 'Sofia Marin' },
    ],
  },
  {
    id: 's-critique',
    title: 'Design Critique',
    time: '10:30 AM',
    platform: 'microsoft-teams',
    joinable: true,
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
  },
];

export const MOCK_GREETING = {
  heading: 'Good Morning.',
  tagline: 'Turn every meeting into a summary.',
  subtext: 'Upload existing files or record direct from your workspace.',
};
