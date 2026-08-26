'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LibraryMember } from './data';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export interface ProjectAvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  members: LibraryMember[];
  /** Total member count — the "+N" is derived from this minus the shown avatars. */
  total: number;
  /** Max avatars rendered before collapsing into "+N". */
  max?: number;
}

/**
 * Overlapping 30px orange avatars + "+N" — matches the Figma project-card
 * avatar stack (bg #c2410c, 2px white border, -8px overlap, 12px initials,
 * "+N" in 14px #52525b).
 */
export function ProjectAvatarStack({
  members,
  total,
  max = 3,
  className,
  ...props
}: ProjectAvatarStackProps) {
  const shown = members.slice(0, max);
  const overflow = total - shown.length;

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <div className="flex items-center">
        {shown.map((m, i) => (
          <span
            key={`${m.name}-${i}`}
            title={m.name}
            className={cn(
              'inline-flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full',
              'border-2 border-white bg-orange-700 text-white',
              'font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px]'
            )}
            style={{ marginRight: i === shown.length - 1 ? 0 : -8, zIndex: shown.length - i }}
          >
            {initials(m.name)}
          </span>
        ))}
      </div>
      {overflow > 0 ? (
        <span className="font-rd-sans text-[14px] leading-[21px] tracking-[0.07px] text-ink-subtle">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
