'use client';

import * as React from 'react';
import { Info, Sparkles, CalendarDays, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MeetingRow } from './MeetingRow';
import { UNASSIGNED_MEETINGS } from './data';

export type PanelState = 'default' | 'empty' | 'loading';

export interface UnassignedPanelProps {
  state?: PanelState;
}

/**
 * Circular "Ask Saransh" sparkle button, straddling the panel's left border and
 * vertically centered (half-clipped by the panel edge) — Figma nodes 139:18584 etc.
 */
function AskSaranshButton() {
  return (
    <button
      type="button"
      aria-label="Ask Saransh"
      className={cn(
        'absolute left-0 top-1/2 z-10 flex size-12 -translate-x-1/2 -translate-y-1/2',
        'items-center justify-center rounded-full bg-orange-700 pl-4 text-white',
        'shadow-rd-md transition-colors hover:bg-brand-dark'
      )}
    >
      <Sparkles className="size-4" strokeWidth={2} />
    </button>
  );
}

/** Skeleton meeting card used in the loading state. */
function MeetingSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-rd-xl border border-orange-100 bg-surface-card p-6">
      <GripVertical className="size-4 shrink-0 text-edge-muted" strokeWidth={2} />
      <div className="h-[52px] w-[80px] shrink-0 animate-pulse rounded-rd-xl bg-neutral-200" />
      <div className="flex min-w-px flex-1 flex-col gap-2">
        <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-3 w-2/5 animate-pulse rounded-full bg-neutral-200" />
      </div>
      <div className="size-6 shrink-0 animate-pulse rounded-full bg-neutral-200" />
    </div>
  );
}

export function UnassignedPanel({ state = 'default' }: UnassignedPanelProps) {
  const count = state === 'empty' ? 0 : UNASSIGNED_MEETINGS.length;

  return (
    <aside className="relative flex h-full w-[420px] shrink-0 flex-col gap-2 overflow-hidden border-l border-orange-100 bg-surface-warm p-6">
      {/* Header */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1">
            <h2 className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-secondary">
              Unassigned Meetings
            </h2>
            <span className="flex size-5 items-center justify-center rounded-full text-ink-muted">
              <Info className="size-4" strokeWidth={2} />
            </span>
          </div>
          {state === 'loading' ? (
            <span className="h-5 w-6 animate-pulse rounded-full bg-neutral-200" />
          ) : (
            <span className="flex items-center justify-center rounded-full bg-orange-100 px-2 py-1 font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-subtle">
              {count}
            </span>
          )}
        </div>
        <p className="font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-subtle">
          Drag into a project to organize
        </p>
      </div>

      {/* Body */}
      {state === 'empty' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <span className="mb-2 flex size-24 items-center justify-center rounded-full bg-orange-50">
            <CalendarDays className="size-9 text-orange-300" strokeWidth={2} />
          </span>
          <p className="font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-secondary">
            No unassigned meetings
          </p>
          <p className="font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-muted">
            New meetings will appear here
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-20">
          {state === 'loading'
            ? Array.from({ length: 5 }).map((_, i) => <MeetingSkeleton key={i} />)
            : UNASSIGNED_MEETINGS.map((m) => <MeetingRow key={m.id} meeting={m} />)}
        </div>
      )}

      <AskSaranshButton />
    </aside>
  );
}
