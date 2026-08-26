'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * HomeSkeleton — loading placeholder body for the Home dashboard.
 * Figma (node 333:2906): two-column split. Left = welcome-header lines, two
 * quick-action skeleton cards, and a checklist card. Right = 420px timeline
 * with two upcoming-list skeleton cards. All bars are #e2e8f0, rounded 12.
 */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-rd-xl bg-edge-default', className)} />;
}

function SkCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex w-full flex-1 items-start gap-6 p-8">
      {/* Left — workspace actions */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Welcome header */}
        <div className="flex w-full flex-col gap-4">
          <Sk className="h-9 w-[380px] max-w-full" />
          <Sk className="h-6 w-[480px] max-w-full" />
          <Sk className="h-4 w-full" />
        </div>

        {/* Quick-action cards */}
        <div className="flex h-[180px] w-full gap-3">
          {[0, 1].map((i) => (
            <SkCard key={i} className="min-w-0 flex-1">
              <Sk className="size-12" />
              <Sk className="h-5 w-40" />
              <Sk className="h-[14px] w-full" />
            </SkCard>
          ))}
        </div>

        {/* Checklist card */}
        <SkCard className="w-full">
          <Sk className="h-[18px] w-[200px]" />
          <div className="flex w-full flex-col gap-4">
            {[300, 260, 320].map((w) => (
              <div key={w} className="flex w-full items-center gap-2">
                <Sk className="size-[18px] rounded-full" />
                <div
                  className="h-[14px] max-w-full animate-pulse rounded-rd-xl bg-edge-default"
                  style={{ width: w }}
                />
              </div>
            ))}
          </div>
        </SkCard>
      </div>

      {/* Right — timeline */}
      <div className="flex w-[420px] shrink-0 flex-col gap-4">
        <div className="flex w-full items-center">
          <Sk className="h-6 w-[220px]" />
        </div>
        <div className="flex w-full flex-col gap-4">
          <SkCard className="w-full">
            <div className="flex w-full items-start justify-between">
              <Sk className="h-4 w-[180px]" />
              <Sk className="h-5 w-[70px]" />
            </div>
            <div className="flex items-center gap-2">
              <Sk className="size-6 rounded-full" />
              <Sk className="size-6 rounded-full" />
              <Sk className="size-6 rounded-full" />
              <Sk className="h-[14px] w-20" />
            </div>
          </SkCard>
          <SkCard className="w-full">
            <div className="flex w-full items-start justify-between">
              <Sk className="h-4 w-[140px]" />
              <Sk className="h-5 w-[70px]" />
            </div>
            <div className="flex items-center gap-2">
              <Sk className="size-6 rounded-full" />
              <Sk className="size-6 rounded-full" />
              <Sk className="h-[14px] w-20" />
            </div>
          </SkCard>
        </div>
      </div>
    </div>
  );
}
