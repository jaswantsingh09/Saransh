'use client';

import * as React from 'react';
import { Video, Users } from 'lucide-react';
import type { MeetingPlatform } from '@/components/redesign/mock';
import { cn } from '@/lib/utils';

/**
 * VendorMark — the meeting-platform logo shown in a ScheduleCard's right actions.
 * Figma (node 584:21617): google-meet 19.42×16, microsoft-teams 17.14×16.
 * Brand marks have no lucide equivalent, so they render from exported SVG assets
 * committed under /public/redesign/. Non-branded platforms fall back to lucide.
 */
export interface VendorMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  platform: MeetingPlatform;
}

const BRAND: Partial<Record<MeetingPlatform, { src: string; w: number; h: number; label: string }>> = {
  'google-meet': { src: '/redesign/vendor-google-meet.svg', w: 19.42, h: 16, label: 'Google Meet' },
  'microsoft-teams': { src: '/redesign/vendor-microsoft-teams.svg', w: 17.14, h: 16, label: 'Microsoft Teams' },
};

export function VendorMark({ platform, className, ...props }: VendorMarkProps) {
  const brand = BRAND[platform];

  return (
    <span
      className={cn('flex shrink-0 items-center justify-center', className)}
      aria-hidden="true"
      {...props}
    >
      {brand ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.src}
          alt={brand.label}
          width={brand.w}
          height={brand.h}
          style={{ width: brand.w, height: brand.h }}
          className="block"
        />
      ) : platform === 'zoom' ? (
        <Video className="size-4 text-[#2d8cff]" strokeWidth={2} />
      ) : (
        <Users className="size-4 text-ink-muted" strokeWidth={2} />
      )}
    </span>
  );
}
