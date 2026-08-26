'use client';

import * as React from 'react';
import { Search, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';

/**
 * TopBar — global content-area header.
 * Figma (node 238:29313): 64px tall, 32px horizontal padding. Left: 288px search
 * input (bg #fafaf9, border #eadcc9, rounded 8, shadow-xs) with a ⌘K chip.
 * Right: notification bell (40px, red dot) + user avatar (32px).
 */
export interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchPlaceholder?: string;
  /** Keyboard hint shown in the search field. Set null to hide. */
  shortcutHint?: string | null;
  user?: { name: string; avatarUrl?: string | null };
  hasNotification?: boolean;
  onSearchClick?: () => void;
  onBellClick?: () => void;
  onAvatarClick?: () => void;
}

export const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  (
    {
      searchPlaceholder = 'Ask or search…',
      shortcutHint = '⌘K',
      user = { name: 'Eric Anderson' },
      hasNotification = true,
      onSearchClick,
      onBellClick,
      onAvatarClick,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex h-16 w-full shrink-0 items-center gap-4 px-8', className)}
        {...props}
      >
        {/* Search */}
        <div className="flex flex-1">
          <button
            type="button"
            onClick={onSearchClick}
            className={cn(
              'flex min-h-9 w-72 items-center gap-2 rounded-rd-lg px-3 py-[7.5px]',
              'border border-edge-warm-light bg-surface-app shadow-rd-xs',
              'text-left transition-colors hover:border-edge-strong'
            )}
          >
            <Search className="size-5 shrink-0 text-ink-muted" strokeWidth={2} />
            <span className="flex-1 truncate font-rd-sans text-[14px] leading-[21px] tracking-[0.07px] text-ink-muted">
              {searchPlaceholder}
            </span>
            {shortcutHint ? (
              <kbd className="shrink-0 rounded-rd-sm border border-edge-default bg-white px-1.5 py-0.5 font-rd-sans text-[11px] font-medium text-ink-tertiary">
                {shortcutHint}
              </kbd>
            ) : null}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            onClick={onBellClick}
            className="relative flex size-10 items-center justify-center rounded-rd-lg text-ink-secondary transition-colors hover:bg-surface-muted"
          >
            <Bell className="size-6" strokeWidth={2} />
            {hasNotification ? (
              <span className="absolute right-[6px] top-[6px] size-2 rounded-full bg-status-error ring-2 ring-surface-app" />
            ) : null}
          </button>

          <button
            type="button"
            aria-label="Account"
            onClick={onAvatarClick}
            className="flex size-10 items-center justify-center rounded-full"
          >
            <Avatar name={user.name} src={user.avatarUrl} size="md" />
          </button>
        </div>
      </div>
    );
  }
);
TopBar.displayName = 'TopBar';
