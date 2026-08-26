'use client';

import * as React from 'react';
import { Folder, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectAvatarStack } from './ProjectAvatarStack';
import type { LibraryProject } from './data';

export interface ProjectCardProps {
  project: LibraryProject;
  className?: string;
}

/**
 * Folder / project card (grid view) — Figma node 433:4425.
 * White surface, hairline border, 12px radius, 20px padding, 16px gaps.
 */
export function ProjectCard({ project, className }: ProjectCardProps) {
  return (
    <a
      href="/preview/project-detail"
      className={cn(
        'group flex w-[287.583px] shrink-0 cursor-pointer flex-col gap-4 rounded-rd-xl',
        'border border-edge-default bg-surface-card p-5 shadow-rd-sm transition-shadow hover:shadow-rd-md',
        className
      )}
    >
      {/* Top: folder icon + kebab */}
      <div className="flex w-full items-center justify-between">
        <span className="flex size-12 items-center justify-center rounded-rd-lg border border-orange-100 bg-orange-50">
          <Folder className="size-[16.25px] text-orange-700" strokeWidth={2} />
        </span>
        <button
          type="button"
          aria-label="Project options"
          onClick={(e) => e.preventDefault()}
          className="flex size-9 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted"
        >
          <MoreVertical className="size-[16.25px]" strokeWidth={2} />
        </button>
      </div>

      {/* Content: name + members */}
      <div className="flex w-full flex-col gap-4">
        <p className="font-rd-sans text-[20px] font-semibold leading-6 text-ink-secondary">
          {project.name}
        </p>
        <ProjectAvatarStack members={project.members} total={project.memberCount} />
      </div>
    </a>
  );
}
