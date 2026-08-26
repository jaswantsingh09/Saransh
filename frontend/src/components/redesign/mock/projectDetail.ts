/**
 * Mock data for the redesign Project Detail screen (static, no backend).
 * Mirrors Figma node 450:25161 ("Project Detail - Product launch").
 */

export interface ProjectDetailMember {
  /** Display name — first initial is shown in the stacked avatar. */
  name: string;
}

export interface ProjectDetailStat {
  label: string;
  value: string;
  /** Optional emphasised pill (e.g. "12 open"). */
  pill?: string;
  /** Render the value in the brand colour. */
  emphasised?: boolean;
}

/** Visual treatment for a meeting card thumbnail. */
export type MeetingThumbKind = 'video' | 'gallery' | 'audio';

export interface ProjectDetailMeeting {
  id: string;
  title: string;
  /** Pre-formatted date string, e.g. "Jun 12, 2026, 12:20 PM". */
  dateLabel: string;
  /** Pre-formatted duration, e.g. "1 min". */
  duration: string;
  kind: MeetingThumbKind;
  /** CSS gradient used as the thumbnail backdrop. */
  gradient: string;
  /** Show a centred play affordance (video that hasn't been opened). */
  showPlay?: boolean;
  /** Speaker shown as a small centred avatar (video meetings). */
  speaker?: string;
}

export interface ProjectDetailData {
  name: string;
  breadcrumb: string[];
  members: ProjectDetailMember[];
  summary: string;
  stats: ProjectDetailStat[];
  meetings: ProjectDetailMeeting[];
}

/** Warm, brand-aligned thumbnail gradients (placeholders for real recordings). */
const GRAD = {
  slate: 'linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)',
  ember: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
  night: 'linear-gradient(120deg, #0c2d5d 0%, #163d77 100%)',
  dune: 'linear-gradient(135deg, #78716c 0%, #a8a29e 60%, #d6d3d1 100%)',
  clay: 'linear-gradient(135deg, #9a3412 0%, #b45309 60%, #d97706 100%)',
  steel: 'linear-gradient(135deg, #334155 0%, #475569 60%, #64748b 100%)',
} as const;

export const MOCK_PROJECT_DETAIL: ProjectDetailData = {
  name: 'Product launch',
  breadcrumb: ['Projects', 'Product launch'],
  members: [
    { name: 'Riya Kapoor' },
    { name: 'Liam Ortega' },
    { name: 'Kenji Tanaka' },
    { name: 'Kabir Anand' },
    { name: 'Klara Novak' },
  ],
  summary:
    'Tracking the Q3 product launch — roadmap, go-to-market, and release readiness. Momentum is steady, but action items are piling up.',
  stats: [
    { label: 'Meetings', value: '6' },
    { label: 'Recorded', value: '4.2h' },
    { label: 'Action items', value: '17', pill: '12 open', emphasised: true },
    { label: 'Decisions', value: '9' },
    { label: 'Participants', value: '8' },
  ],
  meetings: [
    {
      id: 'pd-1',
      title: '6/12/2026-Meeting',
      dateLabel: 'Jun 12, 2026, 12:20 PM',
      duration: '1 min',
      kind: 'video',
      gradient: GRAD.slate,
      speaker: 'Riya Kapoor',
    },
    {
      id: 'pd-2',
      title: '6/11/2026-Meeting',
      dateLabel: 'Jun 11, 2026, 12:38 PM',
      duration: '<1 min',
      kind: 'video',
      gradient: GRAD.steel,
      speaker: 'Liam Ortega',
    },
    {
      id: 'pd-3',
      title: '6/10/2026-Meeting',
      dateLabel: 'Jun 10, 2026, 10:47 AM',
      duration: '1 min',
      kind: 'audio',
      gradient: GRAD.dune,
      showPlay: true,
    },
    {
      id: 'pd-4',
      title: 'tl;dv Basics: Record',
      dateLabel: 'Apr 16, 2026, 06:42 PM',
      duration: '7 mins',
      kind: 'audio',
      gradient: GRAD.ember,
    },
    {
      id: 'pd-5',
      title: 'tl;dv for AI Experts: Admin Co…',
      dateLabel: 'Apr 28, 2026, 09:04 PM',
      duration: '8 mins',
      kind: 'gallery',
      gradient: GRAD.night,
    },
    {
      id: 'pd-6',
      title: 'tl;dv for AI Experts: Admin Co…',
      dateLabel: 'Apr 28, 2026, 09:04 PM',
      duration: '8 mins',
      kind: 'audio',
      gradient: GRAD.clay,
    },
    {
      id: 'pd-7',
      title: 'tl;dv for AI Experts: Admin Co…',
      dateLabel: 'Apr 28, 2026, 09:04 PM',
      duration: '8 mins',
      kind: 'gallery',
      gradient: GRAD.night,
    },
    {
      id: 'pd-8',
      title: 'tl;dv for AI Experts: Admin Co…',
      dateLabel: 'Apr 28, 2026, 09:04 PM',
      duration: '8 mins',
      kind: 'audio',
      gradient: GRAD.steel,
    },
  ],
};
