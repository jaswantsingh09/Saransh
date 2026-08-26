'use client';

import * as React from 'react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/redesign/Button';
import { AvatarGroup } from '@/components/redesign/Avatar';
import type { DetailMeeting } from '@/components/redesign/mock/meetingDetail';

/**
 * Meeting-detail header — back chevron + title, Export/Share actions, and a
 * meta row (date · duration · attendee stack). Figma node 400:21884.
 */
export interface DetailHeaderProps {
  meeting: DetailMeeting;
  className?: string;
}

function Dot() {
  return <span className="size-[3px] shrink-0 rounded-full bg-ink-tertiary" aria-hidden />;
}

export function DetailHeader({ meeting, className }: DetailHeaderProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {/* title row */}
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            className="flex size-6 shrink-0 items-center justify-center text-ink-primary transition-colors hover:text-ink-brand"
          >
            <ChevronLeft className="size-6" strokeWidth={2} />
          </button>
          <h1 className="text-rd-h4 text-ink-primary">{meeting.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm">
            Export
          </Button>
          <Button variant="primary" size="sm" className="border-transparent">
            Share
          </Button>
        </div>
      </div>

      {/* meta row */}
      <div className="flex w-full flex-wrap items-center gap-2">
        <span className="flex items-center gap-1">
          <Calendar className="size-[14px] shrink-0 text-ink-tertiary" strokeWidth={2} />
          <span className="text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-tertiary">
            {meeting.date}
          </span>
        </span>
        <Dot />
        <span className="text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-tertiary">
          {meeting.duration}
        </span>
        <Dot />
        <AvatarGroup members={meeting.attendees} max={5} size="xs" />
      </div>
    </div>
  );
}
