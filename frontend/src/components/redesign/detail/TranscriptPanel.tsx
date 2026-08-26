'use client';

import * as React from 'react';
import { Search, Copy } from 'lucide-react';
import { TRANSCRIPT_TURNS } from '@/components/redesign/mock/meetingDetail';

/**
 * Transcript container — search bar + Copy action, then diarized turns.
 * Figma node 333:4556.
 */
export function TranscriptPanel() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 self-stretch rounded-rd-xl border border-orange-100 bg-surface-card p-6 shadow-rd-sm">
      {/* search row */}
      <div className="flex w-full items-center gap-2 pr-0.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-rd-xl border border-edge-default bg-surface-app p-3 text-left transition-colors hover:border-edge-strong"
        >
          <Search className="size-4 shrink-0 text-ink-muted" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate text-[14px] leading-[21px] tracking-[0.07px] text-ink-muted">
            Search within transcript...
          </span>
        </button>
        <button
          type="button"
          className="flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-rd-lg bg-slate-100 px-3 py-[5.5px] text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-heading transition-colors hover:bg-slate-200"
        >
          Copy
          <Copy className="size-[13px] shrink-0" strokeWidth={2} />
        </button>
      </div>

      {/* turns */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-auto">
        {TRANSCRIPT_TURNS.map((turn) => (
          <div key={turn.id} className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: turn.color }}
                aria-hidden
              />
              <span className="text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-secondary">
                {turn.speaker}
              </span>
              <span className="text-[12px] leading-4 tracking-[0.18px] text-ink-muted">
                {turn.time}
              </span>
            </div>
            <p className="w-full text-[14px] leading-[21px] tracking-[0.07px] text-ink-secondary">
              {turn.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
