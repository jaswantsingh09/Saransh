'use client';

import * as React from 'react';
import { Folder, SquarePen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectAvatarStack } from './ProjectAvatarStack';
import type { LibraryProject } from './data';

export interface ProjectsTableProps {
  projects: LibraryProject[];
  className?: string;
}

/**
 * Projects list / table view — Figma node 139:20173.
 * Orange-50 header row (rounded top) + white rows with orange-100 dividers.
 */
export function ProjectsTable({ projects, className }: ProjectsTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-[10px] border border-orange-100',
        className
      )}
    >
      {/* Header */}
      <div className="flex w-full items-start border-b border-orange-100 bg-orange-50 px-8 py-2 font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-subtle">
        <p className="w-[400px] shrink-0">Project Name</p>
        <p className="min-w-px flex-1">Members</p>
        <p className="min-w-px flex-1">Meetings</p>
        <p className="w-[151px] shrink-0 text-center">Actions</p>
      </div>

      {/* Rows */}
      <div className="flex w-full flex-col">
        {projects.map((p) => (
          <a
            key={p.id}
            href="/preview/project-detail"
            className="flex w-full cursor-pointer items-center border-b border-orange-100 bg-surface-card p-4 transition-colors last:border-b-0 hover:bg-orange-50/40"
          >
            {/* Name */}
            <div className="flex w-[400px] shrink-0 items-center gap-2">
              <span className="flex size-12 items-center justify-center rounded-rd-lg border border-orange-100 bg-orange-50">
                <Folder className="size-[16.25px] text-orange-700" strokeWidth={2} />
              </span>
              <p className="font-rd-sans text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-ink-primary">
                {p.name}
              </p>
            </div>

            {/* Members */}
            <div className="min-w-px flex-1">
              <ProjectAvatarStack members={p.members} total={p.memberCount} />
            </div>

            {/* Meetings */}
            <div className="min-w-px flex-1">
              <span className="inline-flex px-3 py-1 font-rd-sans text-[12px] font-semibold leading-4 tracking-[0.18px] text-ink-secondary">
                {p.meetingCount}
              </span>
            </div>

            {/* Actions */}
            <div className="flex w-[151px] shrink-0 items-center justify-center gap-2">
              <button
                type="button"
                aria-label="Edit project"
                onClick={(e) => e.preventDefault()}
                className="flex size-9 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted"
              >
                <SquarePen className="size-[16.25px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Delete project"
                onClick={(e) => e.preventDefault()}
                className="flex size-9 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-status-error"
              >
                <Trash2 className="size-[16.25px]" strokeWidth={2} />
              </button>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
