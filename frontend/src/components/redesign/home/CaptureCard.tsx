'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * CaptureCard — a quick-action tile in the Home "Capture Section".
 * Figma (nodes 584:21584 / 584:21589):
 *  - tone="record": bg orange-700, white icon-button + white text, colored drop-shadow.
 *  - tone="upload": bg orange-50, warm border, orange icon-button + subtle text.
 * Both are 180px tall, p-20, rounded-12, with a 40px icon button (16.25px glyph).
 */
export interface CaptureCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone: 'record' | 'upload';
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const CaptureCard = React.forwardRef<HTMLButtonElement, CaptureCardProps>(
  ({ tone, icon, title, description, className, type = 'button', ...props }, ref) => {
    const isRecord = tone === 'record';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'flex h-full min-w-0 flex-1 flex-col items-start justify-between rounded-rd-xl p-5 text-left transition-transform',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus focus-visible:ring-offset-2',
          isRecord
            ? 'bg-orange-700 shadow-[0px_8px_6.2px_0px_rgba(193,92,61,0.2)] hover:brightness-105'
            : 'border border-edge-warm bg-orange-50 hover:bg-orange-100',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'flex min-h-10 min-w-10 items-center justify-center rounded-rd-lg p-[10px]',
            isRecord ? 'bg-white/15 text-white' : 'bg-orange-700 text-white'
          )}
        >
          <span className="flex size-[16.25px] items-center justify-center [&_svg]:size-[16.25px]">
            {icon}
          </span>
        </span>

        <span className="flex flex-col gap-1.5">
          <span
            className={cn(
              'font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px]',
              isRecord ? 'text-white' : 'text-ink-subtle'
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              'font-rd-sans text-[12px] font-normal leading-4 tracking-[0.18px]',
              isRecord ? 'text-white' : 'text-ink-subtle'
            )}
          >
            {description}
          </span>
        </span>
      </button>
    );
  }
);
CaptureCard.displayName = 'CaptureCard';
