'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DECISIONS, NEXT_STEPS } from '@/components/redesign/mock/meetingDetail';

/** Shared "· title + caption" section header. Figma node 423:18142/18143. */
function SectionHeader({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="flex w-full items-center justify-between whitespace-nowrap">
      <p className="text-rd-body font-semibold text-ink-secondary">{title}</p>
      <p className="text-[12px] leading-4 tracking-[0.18px] text-ink-muted">{caption}</p>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5 shadow-rd-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Decisions card — bulleted list of agreements. Figma node 518:42369. */
export function DecisionsCard() {
  return (
    <Card>
      <SectionHeader title="Decisions" caption="Agreed in this meeting" />
      <ul className="flex w-full flex-col gap-3">
        {DECISIONS.map((d) => (
          <li key={d.id} className="flex w-full items-start gap-2">
            <span
              className="shrink-0 text-[14px] leading-[21px] text-ink-secondary"
              aria-hidden
            >
              •
            </span>
            <p className="min-w-0 flex-1 text-[14px] leading-[21px] tracking-[0.07px] text-ink-secondary">
              {d.text}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Next Steps card — chevron-led list of owners/timing. Figma node 518:42383. */
export function NextStepsCard() {
  return (
    <Card>
      <SectionHeader title="Next Steps" caption="Owners and timing" />
      <ul className="flex w-full flex-col gap-3">
        {NEXT_STEPS.map((n) => (
          <li key={n.id} className="flex w-full items-start gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center">
              <ChevronRight className="size-4 text-orange-700" strokeWidth={2} />
            </span>
            <p className="min-w-0 flex-1 text-[14px] leading-[21px] tracking-[0.07px] text-ink-secondary">
              {n.text}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
