'use client';

import * as React from 'react';

/**
 * Generic right-column skeleton card shown while the summary generates.
 * Figma node 333:4674 (generating state) — three all-gray placeholder cards,
 * each a header pill above N rows of (dot + line).
 */
export function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5 shadow-rd-sm">
      <div className="h-5 w-[120px] animate-pulse rounded-full bg-neutral-200" />
      <div className="flex w-full flex-col gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex w-full items-center gap-3">
            <div className="size-4 shrink-0 animate-pulse rounded-full bg-neutral-200" />
            <div className="h-3.5 min-w-0 flex-1 animate-pulse rounded-full bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
