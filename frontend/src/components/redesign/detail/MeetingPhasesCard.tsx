'use client';

import * as React from 'react';
import { MEETING_PHASES } from '@/components/redesign/mock/meetingDetail';

/** Meeting-phases timeline card. Figma node 333:4648. */
export function MeetingPhasesCard() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5 shadow-rd-sm">
      <div className="flex w-full items-center justify-between whitespace-nowrap">
        <p className="text-rd-body font-semibold text-ink-secondary">Meeting Phases</p>
        <p className="text-[12px] leading-4 tracking-[0.18px] text-ink-muted">Timeline</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {/* track */}
        <div className="relative h-11 w-full">
          <div className="absolute left-0 right-0 top-[21px] h-0.5 bg-edge-default" />
          <div className="relative flex h-11 items-center">
            {MEETING_PHASES.map((phase) => (
              <div key={phase.id} className="flex min-w-0 flex-1 items-center justify-center">
                <span
                  className="size-2.5 rounded-full ring-2 ring-surface-card"
                  style={{ backgroundColor: phase.color }}
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </div>
        {/* labels */}
        <div className="flex w-full items-start">
          {MEETING_PHASES.map((phase) => (
            <div key={phase.id} className="flex min-w-0 flex-1 flex-col items-center">
              <p className="text-center text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-secondary">
                {phase.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
