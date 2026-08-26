'use client';

import * as React from 'react';
import { MoreVertical, Share2, Play, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/redesign/Avatar';
import type { ProjectDetailMeeting } from '@/components/redesign/mock/projectDetail';

/**
 * MeetingThumbCard — a single meeting tile in the Project Detail grid.
 * Figma nodes 450:25508 et al: white card, 1px #e2e8f0 border, 12px radius,
 * soft shadow (0 10 24 rgba(20,15,56,.08)); 88px gradient thumbnail with a
 * dark bottom overlay, two ghost action buttons top-right, and a centred
 * play / audio / speaker affordance; body (title / date / duration) below.
 */
export interface MeetingThumbCardProps {
  meeting: ProjectDetailMeeting;
}

function ThumbButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-[25px] w-7 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15"
    >
      {children}
    </button>
  );
}

export function MeetingThumbCard({ meeting }: MeetingThumbCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white',
        'shadow-[0px_10px_24px_0px_rgba(20,15,56,0.08)]',
        'transition-shadow hover:shadow-[0px_12px_28px_0px_rgba(20,15,56,0.14)]'
      )}
    >
      {/* Thumbnail */}
      <div
        className="relative h-[88px] w-full shrink-0 overflow-hidden"
        style={{ background: meeting.gradient }}
      >
        {/* Gallery mode: three overlapping frames for a montage feel */}
        {meeting.kind === 'gallery' ? (
          <div aria-hidden className="absolute inset-0 flex">
            <div className="h-full w-[84px] bg-gradient-to-br from-white/10 to-black/25" />
            <div className="h-full w-[118px] bg-gradient-to-br from-white/5 to-black/30 mix-blend-overlay" />
            <div className="h-full flex-1 bg-gradient-to-bl from-white/10 to-black/25" />
          </div>
        ) : null}

        {/* Top dark → transparent overlay so buttons stay legible */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/55 to-transparent"
        />

        {/* Centred affordance */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {meeting.showPlay ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-white shadow-[0px_3.6px_5px_rgba(30,70,170,0.13)]">
              <Play className="size-[13px] translate-x-[1px] fill-slate-500 text-slate-500" />
            </span>
          ) : meeting.kind === 'audio' ? (
            <AudioLines className="size-6 text-white/85" strokeWidth={2} />
          ) : meeting.speaker ? (
            <Avatar
              name={meeting.speaker}
              size="xs"
              className="border-[1.5px] border-white/70"
              style={{ width: 18, height: 18, fontSize: 9, lineHeight: '18px' }}
            />
          ) : null}
        </div>

        {/* Action buttons top-right */}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <ThumbButton label="More options">
            <MoreVertical className="size-[13px]" strokeWidth={2.25} />
          </ThumbButton>
          <ThumbButton label="Share meeting">
            <Share2 className="size-[13px]" strokeWidth={2.25} />
          </ThumbButton>
        </div>
      </div>

      {/* Body */}
      <div className="flex h-[90px] flex-col gap-1.5 px-4 pt-3">
        <p className="truncate font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-[#090927]">
          {meeting.title}
        </p>
        <p className="truncate font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-slate-500">
          {meeting.dateLabel}
        </p>
        <p className="truncate font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px] text-slate-500">
          {meeting.duration}
        </p>
      </div>
    </div>
  );
}
