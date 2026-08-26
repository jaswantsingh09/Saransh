'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AskRailHandle — the floating "Ask Saransh" assistant handle pinned to the
 * right edge of the workspace.
 * Figma (nodes 584:21694 / 584:21695): 8px warm rail (bg #ead4c9, border-l
 * #c4b2a6) with a protruding 28×56 accent-mid (#c15c3d) tab, rounded on the
 * left (28px), soft shadow, 20px white sparkles glyph.
 */
export interface AskRailHandleProps {
  onClick?: () => void;
  className?: string;
}

export function AskRailHandle({ onClick, className }: AskRailHandleProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-y-0 right-0 z-20', className)}
      aria-hidden={false}
    >
      {/* Thin warm rail along the edge */}
      <div className="absolute inset-y-0 right-0 w-2 border-l border-[#c4b2a6] bg-edge-warm" />

      {/* Protruding handle */}
      <button
        type="button"
        aria-label="Ask Saransh"
        onClick={onClick}
        className={cn(
          'pointer-events-auto absolute right-2 top-[45%] flex h-14 w-7 -translate-y-1/2 items-center justify-center',
          'rounded-l-[28px] bg-brand-accent-mid pl-[2px] pr-[6px] text-white',
          'shadow-[0px_1px_2px_0px_rgba(26,15,8,0.1),-4px_2px_12px_0px_rgba(115,51,26,0.28)]',
          'transition-transform hover:-translate-y-1/2 hover:-translate-x-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus'
        )}
      >
        <Sparkles className="size-5" strokeWidth={2} />
      </button>
    </div>
  );
}
