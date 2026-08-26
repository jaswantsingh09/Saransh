'use client';

import * as React from 'react';
import {
  ChevronRight,
  Sparkles,
  Plus,
  MoreVertical,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MeetingThumbCard } from './MeetingThumbCard';
import {
  MOCK_PROJECT_DETAIL,
  type ProjectDetailData,
} from '@/components/redesign/mock/projectDetail';

export interface ProjectDetailScreenProps {
  data?: ProjectDetailData;
}

/** First initial for the member avatar stack. */
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function MemberStack({ members }: { members: ProjectDetailData['members'] }) {
  return (
    <div className="flex items-center">
      {members.map((m, i) => (
        <span
          key={`${m.name}-${i}`}
          title={m.name}
          className={cn(
            'flex items-center justify-center rounded-full border-[2.278px] border-white bg-orange-700',
            'font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-white'
          )}
          style={{
            width: 30.374,
            height: 30.374,
            marginRight: i === members.length - 1 ? -6 : -10,
            zIndex: members.length - i,
          }}
        >
          {initial(m.name)}
        </span>
      ))}
    </div>
  );
}

/** Square 36px icon button used in the header (add member / share). */
function HeaderIconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg text-neutral-800 transition-colors hover:bg-stone-100"
    >
      {children}
    </button>
  );
}

export function ProjectDetailScreen({ data = MOCK_PROJECT_DETAIL }: ProjectDetailScreenProps) {
  const [tab, setTab] = React.useState<'meetings' | 'analysis'>('meetings');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');

  return (
    <div className="relative min-h-full w-full bg-stone-50">
      <div className="flex flex-col gap-6 p-8">
        {/* ── Detail header ─────────────────────────────────────────── */}
        <header className="flex items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex h-9 items-center gap-2 px-3 text-neutral-500"
            >
              {data.breadcrumb.map((crumb, i) => (
                <React.Fragment key={crumb}>
                  {i > 0 ? (
                    <ChevronRight className="size-4 shrink-0 text-neutral-500" strokeWidth={2} />
                  ) : null}
                  <span className="font-rd-sans text-[14px] leading-[21px] tracking-[0.07px]">
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </nav>
            {/* Title */}
            <h1 className="font-rd-sans text-[30px] font-semibold leading-[30px] tracking-[-1px] text-slate-950">
              {data.name}
            </h1>
          </div>

          {/* Members + actions */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center">
              <MemberStack members={data.members} />
              <button
                type="button"
                aria-label="Add member"
                className="ml-1 flex size-8 items-center justify-center rounded-lg text-neutral-800 transition-colors hover:bg-stone-100"
              >
                <Plus className="size-[15px]" strokeWidth={2} />
              </button>
            </div>
            <HeaderIconButton label="More options">
              <MoreVertical className="size-4" strokeWidth={2} />
            </HeaderIconButton>
          </div>
        </header>

        {/* ── AI Summary card ───────────────────────────────────────── */}
        <section className="flex flex-col gap-4 rounded-xl border border-orange-100 bg-orange-50 p-5">
          <div className="flex items-center gap-4">
            <span className="flex size-8 items-center justify-center rounded-xl bg-orange-100">
              <Sparkles className="size-4 text-orange-700" strokeWidth={2} />
            </span>
            <span className="font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-orange-700">
              AI Summary
            </span>
          </div>

          <p className="font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-slate-700">
            {data.summary}
          </p>

          {/* Stat strip */}
          <div className="flex items-center gap-6 pt-4">
            {data.stats.map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 ? <span className="h-[30px] w-px bg-edge-default" /> : null}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-rd-sans text-[20px] font-semibold leading-6',
                        stat.emphasised ? 'text-orange-700' : 'text-slate-950'
                      )}
                    >
                      {stat.value}
                    </span>
                    {stat.pill ? (
                      <span className="flex items-center rounded-xl bg-orange-700 px-2 py-1 font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px] text-white">
                        {stat.pill}
                      </span>
                    ) : null}
                  </div>
                  <span className="font-rd-sans text-[12px] font-medium leading-4 tracking-[0.18px] text-zinc-600">
                    {stat.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* ── Filters + grid ────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-6">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="View"
              className="flex items-center rounded-xl border border-[#ead4c9] bg-orange-50 p-1"
            >
              {(['meetings', 'analysis'] as const).map((key) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(key)}
                    className={cn(
                      'flex min-h-[29px] items-center justify-center rounded-[10px] px-2 py-1',
                      'font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] capitalize',
                      active
                        ? 'bg-white text-slate-950 shadow'
                        : 'text-neutral-800'
                    )}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex min-w-0 flex-1 items-center">
              <div className="flex min-h-9 w-80 items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-[7.5px] shadow-sm">
                <Search className="size-5 shrink-0 text-zinc-600" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  className="min-w-0 flex-1 bg-transparent font-rd-sans text-[14px] leading-[21px] tracking-[0.07px] text-slate-700 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* View toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg transition-colors',
                  view === 'grid'
                    ? 'bg-[#171717] text-white'
                    : 'border border-orange-100 bg-transparent text-neutral-800 hover:bg-stone-100'
                )}
              >
                <LayoutGrid className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg transition-colors',
                  view === 'list'
                    ? 'bg-[#171717] text-white'
                    : 'border border-orange-100 bg-transparent text-neutral-800 hover:bg-stone-100'
                )}
              >
                <List className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Meeting grid */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.meetings.map((m) => (
              <MeetingThumbCard key={m.id} meeting={m} />
            ))}
          </div>
        </section>
      </div>

      {/* ── Floating Ask Saransh button ───────────────────────────── */}
      <button
        type="button"
        className={cn(
          'sticky bottom-8 z-10 ml-auto mr-8 flex w-fit min-h-10 items-center gap-2 rounded-lg',
          'border border-[#fcbc5b] bg-orange-700 px-6 py-[9.5px] text-white shadow-lg',
          'transition-colors hover:bg-[#bb4d00]'
        )}
      >
        <Sparkles className="size-[13px]" strokeWidth={2} />
        <span className="font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px]">
          Ask Saransh
        </span>
      </button>
    </div>
  );
}
