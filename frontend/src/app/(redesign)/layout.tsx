'use client';

import './redesign-tokens.css';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { TitleBar } from '@/components/redesign/TitleBar';
import { SidebarRail, type NavKey } from '@/components/redesign/SidebarRail';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

/** Preview routes the rail links to. */
const NAV_HREFS: Record<NavKey, string> = {
  home: '/preview/home',
  ask: '/preview/ask',
  library: '/preview/library-grid',
  settings: '/preview/settings',
};

/** Derive the active rail item from the current pathname. */
function activeFromPath(pathname: string | null): NavKey {
  const p = pathname ?? '';
  if (p.includes('/ask')) return 'ask';
  if (p.includes('/library') || p.includes('/project')) return 'library';
  if (p.includes('/settings')) return 'settings';
  return 'home';
}

export default function RedesignLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = activeFromPath(pathname);

  return (
    <div
      className={cn(
        inter.variable,
        'redesign-scope font-rd-sans',
        'flex h-screen w-full flex-col overflow-hidden bg-surface-app text-ink-body'
      )}
    >
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <SidebarRail active={active} hrefs={NAV_HREFS} />
        <main className="min-w-0 flex-1 overflow-auto bg-surface-app">{children}</main>
      </div>
    </div>
  );
}
