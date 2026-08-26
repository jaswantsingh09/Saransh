'use client';

import * as React from 'react';
import { Pencil, Copy } from 'lucide-react';
import { SUMMARY_CARD } from '@/components/redesign/mock/meetingDetail';

/** Small secondary chip (Edit / Copy) — Figma node 508:41888. */
function ActionChip({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex min-h-6 shrink-0 items-center justify-center gap-1.5 rounded-rd-lg bg-slate-100 px-2 py-[3px] text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-heading transition-colors hover:bg-slate-200"
    >
      {label}
      <span className="shrink-0 [&_svg]:size-[13px]">{icon}</span>
    </button>
  );
}

/**
 * Summary content card — overview, key takeaways, topic chips.
 * Figma node 132:2253 (meeting-detail-card).
 */
export function SummaryPanel() {
  const { title, participants, overview, takeaways, topics } = SUMMARY_CARD;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-rd-xl border border-orange-100 bg-surface-card p-6 shadow-rd-sm">
      {/* header */}
      <div className="flex w-full items-center gap-2">
        <h2 className="min-w-0 flex-1 text-rd-h4 text-ink-secondary">{title}</h2>
        <ActionChip label="Edit" icon={<Pencil strokeWidth={2} />} />
        <ActionChip label="Copy" icon={<Copy strokeWidth={2} />} />
      </div>

      {/* participants */}
      <p className="text-[14px] leading-[21px] tracking-[0.07px] text-ink-muted">{participants}</p>

      {/* overview */}
      <p className="text-rd-body text-ink-secondary">{overview}</p>

      {/* key takeaways */}
      <h3 className="text-rd-h4 text-ink-secondary">Key Takeaways</h3>
      <ul className="flex w-full flex-col gap-4">
        {takeaways.map((t) => (
          <li key={t.id} className="flex w-full items-start gap-2">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-orange-700" aria-hidden />
            <p className="min-w-0 flex-1 text-[14px] leading-[21px] tracking-[0.07px] text-ink-primary">
              {t.text}
            </p>
          </li>
        ))}
      </ul>

      {/* topics discussed */}
      <h3 className="text-rd-h4 text-ink-secondary">Topics Discussed</h3>
      <div className="flex w-full flex-wrap items-start gap-x-2 gap-y-2.5">
        {topics.map((topic) => (
          <span
            key={topic.id}
            className="flex min-h-6 items-center justify-center rounded-rd-lg bg-orange-50 px-2 py-[3px] text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-secondary"
          >
            {topic.label}
          </span>
        ))}
      </div>
    </div>
  );
}
