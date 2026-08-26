'use client';

import * as React from 'react';
import { DETAIL_MEETING } from '@/components/redesign/mock/meetingDetail';
import { DetailHeader } from './DetailHeader';
import { DetailTabs } from './DetailTabs';
import { SummaryPanel } from './SummaryPanel';
import { TranscriptPanel } from './TranscriptPanel';
import { ActionItemsCard } from './ActionItemsCard';
import { DecisionsCard, NextStepsCard } from './DecisionsCard';
import { GeneratingPanel } from './GeneratingPanel';
import { SkeletonCard } from './SkeletonCards';
import { AskSaranshButton } from './AskSaranshButton';

/**
 * Meeting-detail screen family. One component, three static states:
 *  - 'summary'    → node 132:1870
 *  - 'transcript' → node 333:4239
 *  - 'generating' → node 333:4674
 */
export interface MeetingDetailProps {
  state: 'summary' | 'transcript' | 'generating';
}

export function MeetingDetail({ state }: MeetingDetailProps) {
  const activeTab = state === 'transcript' ? 'transcript' : 'summary';

  return (
    <div className="flex min-h-full flex-col gap-6 p-8">
      {/* The generating state hides the meeting header (per Figma). */}
      {state !== 'generating' ? <DetailHeader meeting={DETAIL_MEETING} /> : null}

      <div className="flex w-full flex-col gap-4">
        <DetailTabs active={activeTab} />

        <div className="flex w-full items-start gap-6">
          {/* left column */}
          {state === 'summary' ? <SummaryPanel /> : null}
          {state === 'transcript' ? <TranscriptPanel /> : null}
          {state === 'generating' ? (
            <div className="flex min-w-0 flex-1 flex-col">
              <GeneratingPanel />
            </div>
          ) : null}

          {/* right column */}
          <aside className="flex w-[420px] shrink-0 flex-col gap-4">
            {state === 'summary' ? (
              <>
                <ActionItemsCard />
                <DecisionsCard />
                <NextStepsCard />
              </>
            ) : null}

            {state === 'transcript' ? (
              <>
                <ActionItemsCard showAssignees />
                <DecisionsCard />
                <NextStepsCard />
              </>
            ) : null}

            {state === 'generating' ? (
              <>
                <SkeletonCard rows={3} />
                <SkeletonCard rows={4} />
                <SkeletonCard rows={4} />
              </>
            ) : null}
          </aside>
        </div>
      </div>

      {state !== 'generating' ? <AskSaranshButton /> : null}
    </div>
  );
}
