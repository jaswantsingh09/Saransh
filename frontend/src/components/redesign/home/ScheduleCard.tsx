'use client';

import * as React from 'react';
import { AvatarGroup, Button, Badge } from '@/components/redesign';
import type { MockScheduleItem } from '@/components/redesign/mock';
import { cn } from '@/lib/utils';
import { VendorMark } from './VendorMark';

/**
 * ScheduleCard — a single "Today's Schedule" row.
 * Figma (node 584:21597): white card, border #e2e8f0, rounded 12, p-20,
 * drop-shadow 0 2px 6px rgba(0,0,0,0.05). Row: [title + time-pill + stacked
 * single-initial avatars + "+N"] | vendor mark | dark "Record" pill.
 */
export interface ScheduleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  item: MockScheduleItem;
  onRecord?: (id: string) => void;
}

export const ScheduleCard = React.forwardRef<HTMLDivElement, ScheduleCardProps>(
  ({ item, onRecord, className, ...props }, ref) => {
    // Design shows single-letter initials, so seed AvatarGroup with first names.
    const members = item.attendees.map((a) => ({
      name: a.name.split(/\s+/)[0] ?? a.name,
      src: a.avatarUrl,
    }));

    return (
      <div
        ref={ref}
        className={cn(
          'flex w-full items-center gap-2 rounded-rd-xl border border-edge-default bg-surface-card p-5',
          'shadow-[0px_2px_6px_0px_rgba(0,0,0,0.05)]',
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex h-6 items-center gap-2">
            <p className="truncate font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-secondary">
              {item.title}
            </p>
            <Badge variant="muted" size="md" shape="pill">
              {item.time}
            </Badge>
          </div>
          <AvatarGroup members={members} max={5} size="xs" />
        </div>

        <VendorMark platform={item.platform} />

        <Button variant="dark" size="sm" onClick={() => onRecord?.(item.id)}>
          Record
        </Button>
      </div>
    );
  }
);
ScheduleCard.displayName = 'ScheduleCard';
