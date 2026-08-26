'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizePx: Record<AvatarSize, number> = {
  xs: 23, // matches Figma stacked avatar (22.842px)
  sm: 28,
  md: 32, // matches Figma top-bar avatar
  lg: 40,
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL. Falls back to initials if absent or fails to load. */
  src?: string | null;
  /** Full name — used for initials fallback and alt text. */
  name: string;
  size?: AvatarSize;
  /** Force initials style even when `src` is provided. */
  forceInitials?: boolean;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, name, size = 'md', forceInitials = false, className, style, ...props }, ref) => {
    const [errored, setErrored] = React.useState(false);
    const px = sizePx[size];
    const showImage = !!src && !forceInitials && !errored;
    const fontPx = Math.max(10, Math.round(px * 0.375));

    return (
      <span
        ref={ref}
        title={name}
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
          'border border-orange-100 bg-orange-700 font-rd-sans font-semibold text-white',
          className
        )}
        style={{ width: px, height: px, fontSize: fontPx, lineHeight: `${px}px`, ...style }}
        {...props}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src!}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          initialsFrom(name)
        )}
      </span>
    );
  }
);
Avatar.displayName = 'Avatar';

export interface AvatarGroupMember {
  name: string;
  src?: string | null;
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  members: AvatarGroupMember[];
  /** Max avatars shown before collapsing into "+N". */
  max?: number;
  size?: AvatarSize;
}

/**
 * Stacked avatar group with an overflow "+N" label — matches the Figma
 * schedule-card attendee row (overlapping orange circles + "+N" muted text).
 */
export function AvatarGroup({ members, max = 5, size = 'xs', className, ...props }: AvatarGroupProps) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const px = sizePx[size];
  const overlap = Math.round(px * 0.33);

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <div className="flex items-center">
        {shown.map((m, i) => (
          <Avatar
            key={`${m.name}-${i}`}
            name={m.name}
            src={m.src}
            size={size}
            className="border-[1.7px] border-white"
            style={{ marginRight: i === shown.length - 1 ? 0 : -overlap, zIndex: shown.length - i }}
          />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="font-rd-sans text-[12px] leading-4 tracking-[0.18px] text-ink-subtle">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
