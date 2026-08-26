'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Generating-summary loading panel. Figma node 333:4850.
 * Centered sparkles badge, headline, and an animated progress bar.
 */
export function GeneratingPanel() {
  return (
    <div className="flex min-h-[600px] w-full flex-1 flex-col items-center justify-center gap-6 rounded-rd-xl border border-orange-100 bg-surface-card p-6 shadow-rd-sm">
      <div className="flex size-20 items-center justify-center rounded-full bg-orange-50">
        <Sparkles className="size-8 text-orange-700" strokeWidth={2} />
      </div>

      <div className="flex flex-col items-center gap-2 whitespace-nowrap">
        <h2 className="text-rd-h3 text-ink-secondary">Generating summary...</h2>
        <p className="text-rd-body text-ink-muted">This usually takes a minute or two.</p>
      </div>

      <div className="h-1.5 w-60 overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className="h-full rounded-full bg-orange-700"
          initial={{ width: '20%' }}
          animate={{ width: ['20%', '85%', '58%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
