'use client';

import * as React from 'react';
import { Avatar } from '@/components/redesign/Avatar';
import { SPEAKING_TIME } from '@/components/redesign/mock/meetingDetail';

/** Speaking-time breakdown card. Figma node 333:4613. */
export function SpeakingTimeCard() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5 shadow-rd-sm">
      <div className="flex w-full items-center justify-between whitespace-nowrap">
        <p className="text-rd-body font-semibold text-ink-secondary">Speaking Time</p>
        <p className="text-[12px] leading-4 tracking-[0.18px] text-ink-muted">Total percentage</p>
      </div>

      <ul className="flex w-full flex-col gap-4">
        {SPEAKING_TIME.map((stat) => (
          <li key={stat.name} className="flex w-full items-center gap-2">
            <Avatar name={stat.name} size="xs" className="border-orange-100" />
            <span className="min-w-0 flex-1 text-[14px] font-medium leading-[21px] tracking-[0.07px] text-ink-secondary">
              {stat.name}
            </span>
            <span className="text-[12px] leading-4 tracking-[0.18px] text-ink-muted">
              {stat.pct}%
            </span>
            <span className="h-2 w-[140px] shrink-0 overflow-hidden rounded-full bg-orange-100">
              <span
                className="block h-full rounded-full bg-orange-700"
                style={{ width: `${stat.pct}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
