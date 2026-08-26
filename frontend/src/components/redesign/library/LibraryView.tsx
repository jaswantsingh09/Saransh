'use client';

import * as React from 'react';
import { Search, LayoutGrid, List, Plus, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/redesign';
import { ProjectCard } from './ProjectCard';
import { ProjectsTable } from './ProjectsTable';
import { UnassignedPanel } from './UnassignedPanel';
import { LIBRARY_PROJECTS } from './data';

export type LibraryViewMode = 'grid' | 'list';
export type LibraryState = 'default' | 'empty' | 'loading';

export interface LibraryViewProps {
  viewMode?: LibraryViewMode;
  state?: LibraryState;
}

const CARD_W = 287.583;

/** Chunk projects into rows of 3, padding short rows so justify-between holds. */
function rowsOf3<T>(items: T[]): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    const row: (T | null)[] = items.slice(i, i + 3);
    while (row.length < 3) row.push(null);
    rows.push(row);
  }
  return rows;
}

/** Grid/list view toggle (Figma node 433:4157). */
function ViewToggle({
  value,
  onChange,
}: {
  value: LibraryViewMode;
  onChange: (v: LibraryViewMode) => void;
}) {
  const base =
    'flex min-h-9 min-w-9 items-center justify-center rounded-rd-lg transition-colors';
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        onClick={() => onChange('grid')}
        className={cn(
          base,
          value === 'grid'
            ? 'bg-[#171717] text-white'
            : 'border border-orange-100 bg-surface-card text-ink-muted hover:bg-surface-muted'
        )}
      >
        <LayoutGrid className="size-[16.25px]" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          base,
          value === 'list'
            ? 'bg-[#171717] text-white'
            : 'border border-orange-100 bg-surface-card text-ink-muted hover:bg-surface-muted'
        )}
      >
        <List className="size-[16.25px]" strokeWidth={2} />
      </button>
    </div>
  );
}

function SearchInput() {
  return (
    <div className="flex min-h-8 w-[320px] items-center gap-1.5 rounded-rd-lg border border-edge-default bg-surface-card px-2 py-[5.5px] shadow-rd-xs">
      <Search className="size-5 shrink-0 text-ink-subtle" strokeWidth={2} />
      <span className="font-rd-sans text-[14px] font-normal leading-[21px] tracking-[0.07px] text-ink-subtle">
        Search projects...
      </span>
    </div>
  );
}

/** Skeleton project card for the loading state (Figma node 335:4767). */
function ProjectCardSkeleton() {
  return (
    <div
      className="flex shrink-0 flex-col gap-4 rounded-rd-xl border border-edge-default bg-surface-card p-5"
      style={{ width: CARD_W }}
    >
      <div className="flex items-center justify-between">
        <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
        <div className="size-6 animate-pulse rounded-full bg-neutral-200" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-neutral-200" />
        <div className="flex items-center gap-2">
          <div className="flex">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-[30px] animate-pulse rounded-full border-2 border-white bg-neutral-200"
                style={{ marginRight: i === 2 ? 0 : -8 }}
              />
            ))}
          </div>
          <div className="h-3 w-6 animate-pulse rounded-full bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center gap-4 pt-2 text-center">
      <div className="mb-1 flex size-24 items-center justify-center rounded-rd-2xl bg-orange-50">
        <Folder className="size-10 text-orange-700" strokeWidth={1.75} />
      </div>
      <p className="font-rd-sans text-[16px] font-semibold leading-6 text-ink-secondary">
        No projects yet
      </p>
      <p className="max-w-none font-rd-sans text-[16px] font-normal leading-6 text-ink-muted">
        Create a project to start summarizing your client and internal meetings
      </p>
      <Button variant="primary" className="mt-2 min-h-9 px-4" leadingIcon={<Plus />}>
        Create Project
      </Button>
    </div>
  );
}

export function LibraryView({ viewMode = 'grid', state = 'default' }: LibraryViewProps) {
  const [mode, setMode] = React.useState<LibraryViewMode>(viewMode);
  const isEmpty = state === 'empty';
  const isLoading = state === 'loading';

  return (
    <div className="flex h-full min-h-0 w-full">
      {/* Left zone */}
      <div className="flex min-w-px flex-1 flex-col gap-6 overflow-y-auto p-8">
        {/* Page header */}
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-px flex-1 flex-col gap-4">
            <h1 className="font-rd-sans text-[30px] font-semibold leading-[30px] tracking-[-1px] text-ink-primary">
              Projects
            </h1>
            <p className="font-rd-sans text-[16px] font-normal leading-6 text-ink-muted">
              All your meeting workspaces in one place
            </p>
          </div>
          {!isEmpty ? (
            <Button variant="primary" className="min-h-9 px-4" leadingIcon={<Plus />}>
              New Project
            </Button>
          ) : null}
        </div>

        {/* Filters */}
        <div className="flex w-full items-center justify-between">
          <SearchInput />
          <ViewToggle value={mode} onChange={setMode} />
        </div>

        {/* Content */}
        {isEmpty ? (
          <EmptyProjects />
        ) : isLoading ? (
          <div className="flex flex-col gap-4">
            {rowsOf3(Array.from({ length: 6 })).map((row, r) => (
              <div key={r} className="flex w-full justify-between">
                {row.map((_, c) =>
                  row[c] !== null ? (
                    <ProjectCardSkeleton key={c} />
                  ) : (
                    <div key={c} style={{ width: CARD_W }} />
                  )
                )}
              </div>
            ))}
          </div>
        ) : mode === 'grid' ? (
          <div className="flex flex-col gap-4">
            {rowsOf3(LIBRARY_PROJECTS).map((row, r) => (
              <div key={r} className="flex w-full justify-between">
                {row.map((p, c) =>
                  p ? (
                    <ProjectCard key={p.id} project={p} />
                  ) : (
                    <div key={c} style={{ width: CARD_W }} />
                  )
                )}
              </div>
            ))}
          </div>
        ) : (
          <ProjectsTable projects={LIBRARY_PROJECTS} />
        )}
      </div>

      {/* Right zone */}
      <UnassignedPanel state={isLoading ? 'loading' : isEmpty ? 'empty' : 'default'} />
    </div>
  );
}
