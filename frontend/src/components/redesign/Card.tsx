'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — white surface, hairline border, radius-xl, soft shadow.
 * Matches the Figma schedule/list cards (bg #ffffff, border #e2e8f0,
 * rounded 12px, drop-shadow 0 2px 6px rgba(0,0,0,0.05)).
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render an <button>-like interactive card (adds hover affordance). */
  interactive?: boolean;
  /** Padding preset. Default `md` = 20px (Figma card padding). */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface-card border border-edge-default rounded-rd-xl shadow-rd-xs',
          paddingMap[padding],
          interactive && 'cursor-pointer transition-shadow hover:shadow-rd-md',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
