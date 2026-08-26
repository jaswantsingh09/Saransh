'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * TitleBar — macOS-style window chrome.
 * Figma: height 40px, bg #f5f5f4, border-bottom #e2e8f0, traffic lights at
 * left 16/36/56 (12px), centered muted title (12px medium).
 */
export interface TitleBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Centered window title (12px, muted). */
  title?: string;
}

const lights = [
  { name: 'Close', className: 'bg-traffic-close' },
  { name: 'Minimize', className: 'bg-traffic-minimize' },
  { name: 'Maximize', className: 'bg-traffic-maximize' },
] as const;

export const TitleBar = React.forwardRef<HTMLDivElement, TitleBarProps>(
  ({ title, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-tauri-drag-region
        className={cn(
          'relative flex h-10 w-full shrink-0 items-center',
          'border-b border-edge-default bg-surface-muted',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 pl-4">
          {lights.map((l) => (
            <span
              key={l.name}
              aria-label={l.name}
              className={cn('size-3 rounded-full', l.className)}
            />
          ))}
        </div>
        {title ? (
          <p className="pointer-events-none absolute inset-x-0 mx-auto w-max font-rd-sans text-[12px] font-medium leading-4 tracking-[0.18px] text-ink-subtle">
            {title}
          </p>
        ) : null}
      </div>
    );
  }
);
TitleBar.displayName = 'TitleBar';
