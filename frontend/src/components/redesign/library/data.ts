/**
 * Local, presentational mock data for the Library / Projects screen family.
 * Static only — no backend, no Tauri. Values mirror the Figma design
 * (nodes 139:18584 / 139:19599 / 335:3225 / 335:4767).
 */

export interface LibraryMember {
  name: string;
}

export interface LibraryProject {
  id: string;
  name: string;
  members: LibraryMember[];
  /** Total member count (drives the "+N" overflow). */
  memberCount: number;
  meetingCount: number;
}

/** Three orange "AR" avatars + overflow, matching the Figma placeholder rows. */
const AR_TRIO: LibraryMember[] = [
  { name: 'Aria Reyes' },
  { name: 'Adam Ross' },
  { name: 'Amir Raza' },
];

export const LIBRARY_PROJECTS: LibraryProject[] = [
  { id: 'p-product-launch', name: 'Product launch', members: AR_TRIO, memberCount: 4, meetingCount: 12 },
  { id: 'p-customer-onboarding', name: 'Customer onboarding', members: AR_TRIO, memberCount: 4, meetingCount: 9 },
  { id: 'p-design-critique', name: 'Design critique', members: AR_TRIO, memberCount: 4, meetingCount: 7 },
  { id: 'p-sales-discovery', name: 'Sales discovery', members: AR_TRIO, memberCount: 4, meetingCount: 15 },
  { id: 'p-hiring-interviews', name: 'Hiring interviews', members: AR_TRIO, memberCount: 4, meetingCount: 6 },
  { id: 'p-weekly-leadership', name: 'Weekly leadership', members: AR_TRIO, memberCount: 4, meetingCount: 18 },
  { id: 'p-others', name: 'Others', members: [{ name: 'Aria Reyes' }], memberCount: 1, meetingCount: 5 },
];

export type ThumbTone = 'dark' | 'warm';

export interface UnassignedMeeting {
  id: string;
  title: string;
  date: string; // pre-formatted, e.g. "Jun 12, 2026"
  duration: string; // e.g. "12 min"
  thumb: ThumbTone;
}

export const UNASSIGNED_MEETINGS: UnassignedMeeting[] = [
  { id: 'u1', title: '6/12 Team Standup', date: 'Jun 12, 2026', duration: '12 min', thumb: 'dark' },
  { id: 'u2', title: '6/11 Client Call', date: 'Jun 11, 2026', duration: '45 min', thumb: 'warm' },
  { id: 'u3', title: '6/11 Client Call', date: 'Jun 11, 2026', duration: '45 min', thumb: 'warm' },
  { id: 'u4', title: '6/10 Design Review', date: 'Jun 10, 2026', duration: '1 hr', thumb: 'dark' },
  { id: 'u5', title: '6/9 Sales Demo', date: 'Jun 09, 2026', duration: '30 min', thumb: 'dark' },
  { id: 'u6', title: '6/8 Sprint Planning', date: 'Jun 08, 2026', duration: '55 min', thumb: 'dark' },
  { id: 'u7', title: '6/6 All Hands', date: 'Jun 06, 2026', duration: '1 hr 15 min', thumb: 'dark' },
  { id: 'u8', title: '6/11 Client Call', date: 'Jun 11, 2026', duration: '45 min', thumb: 'warm' },
];
