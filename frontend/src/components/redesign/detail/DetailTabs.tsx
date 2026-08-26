'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Segmented Summary / Transcript control. Figma node 408:38238.
 * Container: brand-subtle fill, warm hairline, 4px pad, 12px radius.
 * Active tab: white fill, soft shadow, 10px radius.
 * Tabs deep-link to the sibling preview routes.
 */
export interface DetailTabsProps {
  active: 'summary' | 'transcript';
  className?: string;
}

const TABS: { key: 'summary' | 'transcript'; label: string; href: string }[] = [
  { key: 'summary', label: 'Summary', href: '/preview/meeting-summary' },
  { key: 'transcript', label: 'Transcript', href: '/preview/meeting-transcript' },
];

export function DetailTabs({ active, className }: DetailTabsProps) {
  return (
    <div className={cn('flex w-full items-center', className)}>
      <div className="flex items-center rounded-rd-xl border border-edge-warm bg-orange-50 p-1">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[29px] min-w-[29px] items-center justify-center rounded-[10px] px-2 py-1',
                'text-[14px] font-semibold leading-[21px] tracking-[0.07px] transition-colors',
                isActive
                  ? 'bg-surface-card text-ink-primary shadow-rd-sm'
                  : 'text-ink-tertiary hover:text-ink-secondary'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
