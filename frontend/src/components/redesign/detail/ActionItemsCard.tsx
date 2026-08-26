'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '@/components/redesign/Avatar';
import { ACTION_ITEMS } from '@/components/redesign/mock/meetingDetail';

/**
 * Action Items card. Figma nodes 133:12796 (summary, no assignee) and
 * 356:14899 (transcript, with assignee avatar).
 */
export interface ActionItemsCardProps {
  /** Show the assignee avatar on the right of each row. */
  showAssignees?: boolean;
}

function Checkbox() {
  return (
    <span className="relative block size-4 shrink-0" aria-hidden>
      <span className="absolute left-px top-px size-[14px] rounded-rd-sm border border-edge-default bg-surface-card shadow-rd-xs" />
    </span>
  );
}

export function ActionItemsCard({ showAssignees = false }: ActionItemsCardProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-rd-xl border border-orange-100 bg-surface-card p-5 shadow-rd-sm">
      <h3 className="text-rd-h4 text-ink-secondary">Action Items</h3>

      <ul className="flex w-full flex-col gap-4">
        {ACTION_ITEMS.map((item) => (
          <li key={item.id} className="flex w-full items-center gap-2">
            <Checkbox />
            <p className="min-w-0 flex-1 truncate text-[14px] leading-[21px] tracking-[0.07px] text-ink-secondary">
              {item.text}
            </p>
            {showAssignees && item.assignee ? (
              <Avatar name={item.assignee} size="xs" className="border-orange-100" />
            ) : null}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="flex items-center gap-2 py-3 text-left transition-colors hover:opacity-80"
      >
        <Plus className="size-6 shrink-0 text-orange-700" strokeWidth={2} />
        <span className="text-[14px] leading-[21px] tracking-[0.07px] text-ink-secondary">
          Add action item
        </span>
      </button>
    </div>
  );
}
