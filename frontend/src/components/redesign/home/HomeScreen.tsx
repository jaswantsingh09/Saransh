'use client';

import * as React from 'react';
import { TvMinimal, Upload, Search, Bell, Mic, CalendarPlus, Check, X } from 'lucide-react';
import { Avatar, Button, Toast, TopBar } from '@/components/redesign';
import { VendorMark } from './VendorMark';
import { MOCK_SCHEDULE, MOCK_GREETING, type MockScheduleItem } from '@/components/redesign/mock';
import { cn } from '@/lib/utils';
import { CaptureCard } from './CaptureCard';
import { ScheduleCard } from './ScheduleCard';
import { HomeSkeleton } from './HomeSkeleton';
import { AskSaranshButton } from '@/components/redesign/detail/AskSaranshButton';

export type HomeState = 'populated' | 'empty' | 'loading' | 'noResults';

export interface HomeScreenProps {
  state?: HomeState;
  schedule?: MockScheduleItem[];
  /** Query shown in the active search field for the no-results state. */
  query?: string;
}

const USER = { name: 'Eric Anderson' };

/* ─────────────────────────── Header ─────────────────────────── */

function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Notifications"
        className="relative flex size-10 items-center justify-center rounded-rd-lg text-ink-secondary transition-colors hover:bg-surface-muted"
      >
        <Bell className="size-6" strokeWidth={2} />
        <span className="absolute right-[6px] top-[6px] size-2 rounded-full bg-status-error ring-2 ring-surface-app" />
      </button>
      <button type="button" aria-label="Account" className="flex size-10 items-center justify-center rounded-full">
        <Avatar name={USER.name} size="md" />
      </button>
    </div>
  );
}

/** Active-search header (no-results state): 320px input, brand border, typed query + caret. */
function SearchHeader({ query }: { query: string }) {
  return (
    <div className="flex h-16 w-full shrink-0 items-center justify-between px-8">
      <div className="flex w-80 items-center">
        <div
          className={cn(
            'flex min-h-9 flex-1 items-center gap-2 overflow-hidden rounded-rd-lg px-3 py-[7.5px]',
            'border border-brand bg-white shadow-rd-xs'
          )}
        >
          <Search className="size-5 shrink-0 text-ink-muted" strokeWidth={2} />
          <div className="flex min-w-0 flex-1 items-center gap-px">
            <span className="h-[18px] w-px animate-pulse bg-[#171717]" />
            <span className="truncate font-rd-sans text-[14px] leading-[21px] tracking-[0.07px] text-ink-primary">
              {query}
            </span>
          </div>
        </div>
      </div>
      <HeaderActions />
    </div>
  );
}

/* ─────────────────────────── Left column ─────────────────────────── */

function Greeting() {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="font-rd-sans text-[30px] font-semibold leading-none tracking-[-0.3px] text-ink-secondary">
        {MOCK_GREETING.heading}
      </p>
      <p className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-brand">
        {MOCK_GREETING.tagline}
      </p>
      <p className="font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-muted">
        {MOCK_GREETING.subtext}
      </p>
    </div>
  );
}

/** Onboarding greeting shown in the zero / empty state (Figma 593:30533). */
function WelcomeGreeting() {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="font-rd-sans text-[30px] font-semibold leading-none tracking-[-0.3px] text-ink-heading">
        Welcome to Saransh.
      </p>
      <p className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-brand">
        Capture your first meeting
      </p>
      <p className="max-w-[560px] font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-muted">
        Saransh helps you capture meetings, organize brainstorms, and synthesize complex ideas. Get
        started by uploading files or starting a new ambient capture session.
      </p>
    </div>
  );
}

function CaptureSection({ recordIcon }: { recordIcon?: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-start">
      <div className="flex h-[180px] w-full items-start gap-3">
        <CaptureCard
          tone="record"
          icon={recordIcon ?? <TvMinimal strokeWidth={2} />}
          title="Record Audio"
          description="Record ambient audio and capture meetings in real-time."
        />
        <CaptureCard
          tone="upload"
          icon={<Upload strokeWidth={2} />}
          title="Upload"
          description="Upload transcripts, audio files, or meeting recordings."
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Onboarding (empty state) ─────────────────────────── */

function ChecklistRow({ done, label }: { done?: boolean; label: string }) {
  return (
    <div className="flex w-full items-center gap-3">
      <span
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center rounded-[5px]',
          done ? 'bg-orange-700 text-white' : 'border border-edge-muted bg-white'
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span
        className={cn(
          'font-rd-sans text-[14px] leading-[21px] tracking-[0.07px]',
          done ? 'text-ink-body' : 'text-ink-muted'
        )}
      >
        {label}
      </span>
    </div>
  );
}

function GettingStartedChecklist() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5 shadow-[0px_2px_6px_0px_rgba(0,0,0,0.05)]">
      <div className="flex w-full items-start justify-between">
        <p className="font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-heading">
          Getting Started Checklist
        </p>
        <button
          type="button"
          aria-label="Dismiss checklist"
          className="flex size-5 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink-body"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>
      <div className="flex w-full flex-col gap-2">
        <p className="font-rd-sans text-[12px] font-normal leading-4 tracking-[0.18px] text-ink-muted">
          1 of 3 completed
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
          <div className="h-full w-1/3 rounded-full bg-orange-700" />
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        <ChecklistRow done label="Record or upload your first file" />
        <ChecklistRow label="Connect your calendar (Google Calendar)" />
        <ChecklistRow label="Generate your first automated summary" />
      </div>
    </div>
  );
}

/** Right column for the zero / empty state — "Upcoming Meeting" onboarding block. */
function UpcomingMeetingEmpty() {
  return (
    <div className="flex w-[506px] shrink-0 flex-col gap-4">
      <p className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-heading">
        Upcoming Meeting
      </p>
      <div className="flex w-full flex-col items-center gap-4 px-6 pt-6 text-center">
        <span className="flex size-28 items-center justify-center rounded-rd-2xl bg-orange-50 text-orange-700">
          <CalendarPlus className="size-10" strokeWidth={2} />
        </span>
        <p className="font-rd-sans text-[18px] font-semibold leading-7 text-ink-heading">
          Your schedule is clear
        </p>
        <p className="max-w-[380px] font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-muted">
          Link your calendar to automatically sync Google Meet and Microsoft Teams meetings directly
          into Saransh.
        </p>
        <Button
          variant="dark"
          size="md"
          leadingIcon={<VendorMark platform="google-meet" />}
          className="mt-1"
        >
          Connect Google Calendar
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Right column ─────────────────────────── */

function ScheduleColumn({ items }: { items: MockScheduleItem[] }) {
  return (
    <div className="flex w-[506px] shrink-0 flex-col gap-4">
      <p className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-heading">
        Today&rsquo;s Schedule
      </p>
      <div className="flex w-full flex-col gap-4">
        {items.map((item) => (
          <ScheduleCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── No-results block ─────────────────────────── */

function NoResultsBlock({ query }: { query: string }) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center p-8">
      <div className="flex w-[480px] max-w-full flex-col items-center gap-4 text-center">
        <div className="flex size-28 items-center justify-center rounded-rd-2xl bg-orange-50">
          <Search className="size-10 text-orange-700" strokeWidth={2} />
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <p className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-secondary">
            No results found
          </p>
          <p className="font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-subtle">
            We couldn&rsquo;t find anything matching &ldquo;{query}&rdquo;. Try a different search term
            or check spelling.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="min-h-9 border-edge-muted bg-white px-4 py-[7.5px] text-ink-heading"
        >
          Clear search query
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Transcribing dock ─────────────────────────── */

function TranscribingDock() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;

  return (
    <div className="absolute bottom-[84px] right-8 z-30">
      {/* Foundation Toast is re-created here inline to pin geometry to the dock. */}
      <ToastDock
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onClose={() => setVisible(false)}
      />
    </div>
  );
}

function ToastDock({
  collapsed,
  onToggle,
  onClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <Toast
      title="Transcribing audio"
      subtitle="About 2 min left"
      progress={collapsed ? undefined : 64}
      collapsed={collapsed}
      onToggle={onToggle}
      onClose={onClose}
    />
  );
}

/* ─────────────────────────── Screen ─────────────────────────── */

export function HomeScreen({ state = 'populated', schedule = MOCK_SCHEDULE, query = 'unassigned quarterly report' }: HomeScreenProps) {
  return (
    <div className="relative flex min-h-full w-full flex-col">
      {state === 'noResults' ? (
        <SearchHeader query={query} />
      ) : (
        <TopBar searchPlaceholder="Ask or search..." shortcutHint="⌘K" user={USER} hasNotification />
      )}

      {state === 'loading' ? (
        <HomeSkeleton />
      ) : state === 'noResults' ? (
        <NoResultsBlock query={query} />
      ) : state === 'empty' ? (
        <div className="flex w-full flex-1 items-start gap-6 p-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <WelcomeGreeting />
            <CaptureSection recordIcon={<Mic strokeWidth={2} />} />
            <GettingStartedChecklist />
          </div>
          <UpcomingMeetingEmpty />
        </div>
      ) : (
        <div className="flex w-full flex-1 items-start gap-6 p-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Greeting />
            <CaptureSection />
          </div>
          <ScheduleColumn items={schedule} />
        </div>
      )}

      {/* Floating "Ask Saransh" pill, pinned bottom-right (matches meeting-summary). */}
      <AskSaranshButton />
      {state === 'populated' && <TranscribingDock />}
    </div>
  );
}
