'use client';

import * as React from 'react';
import { Home, Sparkles, Folder, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SidebarRail — 68px icon navigation.
 * Figma (node 360:15713): 68px wide (16px padding + 36px items), border-right
 * #ffedd5, brand "S" logo top, nav items Home/Ask/Library, Settings pinned bottom.
 * Active item = filled orange #c2410c rounded square with white icon.
 */
export type NavKey = 'home' | 'ask' | 'library' | 'settings';

interface NavDef {
  key: NavKey;
  label: string;
  icon: LucideIcon;
}

const TOP_NAV: NavDef[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'ask', label: 'Ask', icon: Sparkles },
  { key: 'library', label: 'Library', icon: Folder },
];

const SETTINGS_NAV: NavDef = { key: 'settings', label: 'Settings', icon: Settings };

export interface SidebarRailProps {
  /** Currently active nav item. */
  active: NavKey;
  /** Optional per-item hrefs; when given the item renders as a link. */
  hrefs?: Partial<Record<NavKey, string>>;
  /** Called when an item without an href is clicked. */
  onNavigate?: (key: NavKey) => void;
  className?: string;
}

function NavButton({
  def,
  active,
  href,
  onNavigate,
}: {
  def: NavDef;
  active: boolean;
  href?: string;
  onNavigate?: (key: NavKey) => void;
}) {
  const Icon = def.icon;
  const inner = (
    <Icon
      className="size-6"
      strokeWidth={active ? 2.25 : 2}
      fill={active ? 'currentColor' : 'none'}
    />
  );
  const cls = cn(
    'flex size-9 items-center justify-center rounded-rd-lg transition-colors',
    active
      ? 'bg-orange-700 text-white'
      : 'text-ink-muted hover:bg-orange-50 hover:text-ink-brand'
  );

  if (href) {
    return (
      <a href={href} aria-label={def.label} aria-current={active ? 'page' : undefined} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={def.label}
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate?.(def.key)}
      className={cls}
    >
      {inner}
    </button>
  );
}

export function SidebarRail({ active, hrefs, onNavigate, className }: SidebarRailProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full w-[68px] shrink-0 flex-col items-center gap-4 border-r border-orange-100 bg-surface-app p-4',
        className
      )}
    >
      {/* Brand mark */}
      <div className="flex size-9 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/redesign/brand-logo.svg" alt="Saransh" className="h-[25px] w-[23px]" />
      </div>

      <Separator />

      {/* Primary nav */}
      <div className="flex flex-1 flex-col items-center gap-2">
        {TOP_NAV.map((def) => (
          <NavButton
            key={def.key}
            def={def}
            active={active === def.key}
            href={hrefs?.[def.key]}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* Settings pinned bottom */}
      <NavButton
        def={SETTINGS_NAV}
        active={active === 'settings'}
        href={hrefs?.settings}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

function Separator() {
  return (
    <div className="flex h-[5px] w-9 items-center">
      <div className="h-px w-full bg-orange-100" />
    </div>
  );
}
