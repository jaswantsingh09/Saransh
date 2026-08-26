'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Redesign Button.
 * Variants pulled from the Figma "Button Variants" component:
 *  - primary : orange #c2410c fill, white text (e.g. "Ask Saransh")
 *  - dark    : #0f172a fill, light text, pill radius (e.g. "Record")
 *  - secondary/outline : warm-bordered light surface
 *  - ghost   : transparent, body text
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-rd-sans font-semibold ' +
    'transition-colors select-none focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-edge-focus focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-orange-700 text-white border border-[#fcbc5b] hover:bg-brand-dark rounded-rd-lg',
        dark:
          'bg-[#0f172a] text-[#f8fafc] hover:bg-[#1e293b] rounded-full',
        secondary:
          'bg-surface-app text-ink-body border border-edge-warm-light hover:bg-surface-muted rounded-rd-lg shadow-rd-xs',
        outline:
          'bg-transparent text-ink-body border border-edge-strong hover:bg-surface-muted rounded-rd-lg',
        ghost:
          'bg-transparent text-ink-body hover:bg-surface-muted rounded-rd-lg',
      },
      size: {
        sm: 'min-h-[32px] px-3 py-[5.5px] text-[14px] leading-[21px] tracking-[0.07px]',
        md: 'min-h-[40px] px-6 py-[9.5px] text-[14px] leading-[21px] tracking-[0.07px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Icon rendered before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  trailingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, leadingIcon, trailingIcon, children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {leadingIcon ? <span className="shrink-0 [&_svg]:size-[14px]">{leadingIcon}</span> : null}
        {children}
        {trailingIcon ? <span className="shrink-0 [&_svg]:size-[14px]">{trailingIcon}</span> : null}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
