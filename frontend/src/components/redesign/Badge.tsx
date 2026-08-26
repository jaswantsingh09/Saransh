'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge / Pill — time pills and tags.
 * `muted` matches the Figma time-pill (bg #f5f5f4, text #52525b, 12px, pill radius).
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 font-rd-sans whitespace-nowrap',
  {
    variants: {
      variant: {
        muted: 'bg-surface-muted text-ink-subtle',
        accent: 'bg-surface-accent text-ink-brand',
        brand: 'bg-orange-700 text-white',
        outline: 'bg-transparent text-ink-body border border-edge-default',
        success: 'bg-[#dcfce7] text-ink-success',
        error: 'bg-[#fee2e2] text-ink-error',
      },
      size: {
        sm: 'px-2 py-0.5 text-[12px] leading-[16px] tracking-[0.18px] font-medium',
        md: 'px-3 py-1 text-[12px] leading-[16px] tracking-[0.18px] font-medium',
      },
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded-rd-md',
      },
    },
    defaultVariants: {
      variant: 'muted',
      size: 'md',
      shape: 'pill',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, shape, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, shape }), className)} {...props}>
      {children}
    </span>
  );
}

export { badgeVariants };
