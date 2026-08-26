'use client';

import * as React from 'react';
import { MoreVertical, Camera, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnassignedMeeting } from './data';

export interface MeetingRowProps {
  meeting: UnassignedMeeting;
}

/**
 * Unassigned-meeting card — Figma node I275:11164;275:10497.
 * White surface, orange-100 border, 24px padding, 12px gaps.
 */
export function MeetingRow({ meeting }: MeetingRowProps) {
  const isDark = meeting.thumb === 'dark';

  return (
    <div className="flex w-full items-center gap-3 overflow-hidden rounded-rd-xl border border-orange-100 bg-surface-card p-6">
      {/* Checkbox */}
      <span
        aria-hidden
        className="size-5 shrink-0 rounded-rd-sm border-[1.5px] border-[#bfbfbf] bg-white"
      />

      {/* Thumbnail */}
      <div
        className={cn(
          'relative flex h-[52px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-rd-xl',
          isDark
            ? 'bg-gradient-to-br from-[#3f3f46] to-[#18181b]'
            : 'bg-gradient-to-br from-[#ece0cf] to-[#d8c6ad]'
        )}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-white">
          {isDark ? (
            <Camera className="size-[11px] text-[#3f3f46]" strokeWidth={2} />
          ) : (
            <Sparkles className="size-[11px] text-[#52525b]" strokeWidth={2} />
          )}
        </span>
      </div>

      {/* Details */}
      <div className="flex min-w-px flex-1 flex-col gap-2">
        <p className="truncate font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-secondary">
          {meeting.title}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-rd-sans text-[12px] font-normal leading-4 tracking-[0.18px] text-ink-subtle">
            {meeting.date}
          </span>
          <span className="size-[3px] shrink-0 rounded-full bg-ink-subtle" />
          <span className="font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-subtle">
            {meeting.duration}
          </span>
        </div>
      </div>

      {/* Kebab */}
      <button
        type="button"
        aria-label="Meeting options"
        className="flex min-h-8 min-w-8 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted"
      >
        <MoreVertical className="size-[14.75px]" strokeWidth={2} />
      </button>
    </div>
  );
}
