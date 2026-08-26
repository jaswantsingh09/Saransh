'use client';

import * as React from 'react';
import { Sparkles, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast — the progress "dock" card (e.g. "Transcribing audio").
 * Figma (node 408:41263): 320px white card, border #ffedd5, rounded 12px, shadow,
 * sparkles icon, title + subtitle, collapse chevron + close, progress bar
 * (track #ffedd5, fill #c2410c).
 */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  /** Progress 0–100. Omit to hide the bar (indeterminate/plain toast). */
  progress?: number;
  icon?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    { title, subtitle, progress, icon, collapsed = false, onToggle, onClose, className, ...props },
    ref
  ) => {
    const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          'w-80 overflow-hidden rounded-rd-xl border border-edge-accent bg-surface-card shadow-rd-lg',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 py-3 pl-4 pr-3">
          <span className="flex size-[18px] shrink-0 items-center justify-center text-ink-brand">
            {icon ?? <Sparkles className="size-[18px]" strokeWidth={2} />}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-secondary">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate font-rd-sans text-[12px] leading-4 tracking-[0.18px] text-ink-muted">
                {subtitle}
              </p>
            ) : null}
          </div>

          {onToggle ? (
            <button
              type="button"
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              onClick={onToggle}
              className="flex size-7 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted"
            >
              <ChevronDown
                className={cn('size-4 transition-transform', collapsed ? '' : 'rotate-180')}
              />
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {pct != null ? (
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-orange-100">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </div>
    );
  }
);
Toast.displayName = 'Toast';
