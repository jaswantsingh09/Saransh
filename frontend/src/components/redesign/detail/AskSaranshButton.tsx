'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/redesign/Button';

/**
 * Floating "Ask Saransh" action, pinned bottom-right of the detail viewport.
 * Figma node 228:29228.
 */
export function AskSaranshButton() {
  return (
    <Button
      variant="primary"
      size="md"
      leadingIcon={<Sparkles strokeWidth={2} />}
      className="fixed bottom-6 right-8 z-20 shadow-rd-lg"
    >
      Ask Saransh
    </Button>
  );
}
