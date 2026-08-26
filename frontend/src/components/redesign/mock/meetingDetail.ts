/**
 * Mock data for the Meeting-detail screen family (summary / transcript /
 * generating). Static seeds only — no backend. Content mirrors the Figma
 * design (nodes 132:1870, 333:4239, 333:4674).
 */

export interface DetailAttendee {
  /** Single-token first name — the avatar stack renders its first letter. */
  name: string;
}

export interface DetailMeeting {
  title: string;
  date: string;
  duration: string;
  attendees: DetailAttendee[];
}

export interface SummaryTakeaway {
  id: string;
  text: string;
}

export interface Topic {
  id: string;
  label: string;
}

export interface ActionItem {
  id: string;
  text: string;
  /** Full name — used for the assignee avatar's initials. */
  assignee?: string;
}

export interface Decision {
  id: string;
  text: string;
}

export interface NextStep {
  id: string;
  text: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: string;
  time: string;
  text: string;
  /** Diarization dot color (hex). */
  color: string;
}

export interface SpeakingStat {
  name: string;
  pct: number;
}

export interface MeetingPhase {
  id: string;
  label: string;
  /** Marker dot color (hex). */
  color: string;
}

/** Header meta (shared across states). */
export const DETAIL_MEETING: DetailMeeting = {
  title: 'CPG - Q3 scope review',
  date: 'June 16 at 9:00 am',
  duration: '2 min',
  attendees: [
    { name: 'Priya' },
    { name: 'Sam' },
    { name: 'Grace' },
    { name: 'Kenji' },
    { name: 'Diego' },
    { name: 'Nadia' },
    { name: 'Omar' },
  ],
};

export const SUMMARY_CARD = {
  title: 'Meeting recorder — UI design review',
  participants: 'Meeting • August 12 — Aryan Rana, Aditi Singh, Maya Chen',
  overview:
    'Discussed UI design for a meeting recording feature including floating controls, project organization, recording management, and implementation timeline with daily updates required by next week.',
  takeaways: [
    {
      id: 't1',
      text: 'External recording controls: Recording should remain visible outside the main app through a floating control bar or compact system-level popup.',
    },
    {
      id: 't2',
      text: 'Clean recording organization: Keep only the latest unassigned recording visible on the home dashboard, while older recordings live in Project sections.',
    },
    {
      id: 't3',
      text: 'Project alignment: Users should be able to add recordings to an existing project, create a new project, and set defaults smoothly.',
    },
  ] as SummaryTakeaway[],
  topics: [
    { id: 'c1', label: 'Sprint Planning' },
    { id: 'c2', label: 'UI Flow' },
    { id: 'c3', label: 'External Controls' },
    { id: 'c4', label: 'Organization' },
    { id: 'c5', label: 'Project Defaults' },
  ] as Topic[],
};

export const ACTION_ITEMS: ActionItem[] = [
  { id: 'a1', text: 'Ensure the team reviews Sprint 11 deliverables.', assignee: 'Aryan Rana' },
  { id: 'a2', text: 'Arrange and conduct demo practice in stage.', assignee: 'Aditi Singh' },
  { id: 'a3', text: 'Review the current service changes for tickets.', assignee: 'Maya Chen' },
  { id: 'a4', text: 'Update RDM roles in the project list.', assignee: 'Riya Kapoor' },
];

export const DECISIONS: Decision[] = [
  { id: 'd1', text: 'Ship Q3 scope with the CPG pricing tier included.' },
  { id: 'd2', text: 'Design owns the invite hierarchy; engineering follows the agreed roles.' },
  { id: 'd3', text: 'Speaking-time analytics dropped from V1.' },
];

export const NEXT_STEPS: NextStep[] = [
  { id: 'n1', text: 'Send the revised scope doc to CPG by Thursday.' },
  { id: 'n2', text: 'Rebuild the invite flow to the new hierarchy.' },
  { id: 'n3', text: 'Confirm pricing tier with finance.' },
];

export const TRANSCRIPT_TURNS: TranscriptTurn[] = [
  {
    id: 'tr1',
    speaker: 'Maya Chen',
    time: '00:00:12',
    text: "Welcome everyone to our UI design review. Today we're mapping out the floating external controls and managing recordings efficiently.",
    color: '#c2410c',
  },
  {
    id: 'tr2',
    speaker: 'Aryan Rana',
    time: '00:00:45',
    text: 'I wanted to focus first on the external controls. They must remain accessible even if a designer switches windows.',
    color: '#0ea5e9',
  },
  {
    id: 'tr3',
    speaker: 'Maya Chen',
    time: '00:01:10',
    text: 'Agreed. A floating control bar or native widget overlay is likely our best path forward there.',
    color: '#c2410c',
  },
  {
    id: 'tr4',
    speaker: 'Jordan Kim',
    time: '00:01:35',
    text: 'How will users clean up older unassigned recordings? Will they cluster the home screen?',
    color: '#eab308',
  },
  {
    id: 'tr5',
    speaker: 'Aditi Singh',
    time: '00:02:05',
    text: 'We can prompt them to drop older ones directly into specific project directories, leaving only the active sprint workspace clean.',
    color: '#14b8a6',
  },
];

export const SPEAKING_TIME: SpeakingStat[] = [
  { name: 'Alex Rivera', pct: 38 },
  { name: 'Maya Chen', pct: 27 },
  { name: 'Jordan Kim', pct: 20 },
];

export const MEETING_PHASES: MeetingPhase[] = [
  { id: 'p1', label: 'Kick-off', color: '#fdba74' },
  { id: 'p2', label: 'Review', color: '#94a3b8' },
  { id: 'p3', label: 'Spec Review', color: '#c2410c' },
  { id: 'p4', label: 'Planning', color: '#c2410c' },
];
