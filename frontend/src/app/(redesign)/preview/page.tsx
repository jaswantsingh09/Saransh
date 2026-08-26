import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/redesign/Card';
import { Badge } from '@/components/redesign/Badge';

/**
 * Preview index — hub linking to every redesign screen route.
 * Individual /preview/* screens are added by other agents; this page lists the
 * expected routes and doubles as a smoke test that the foundation imports resolve.
 */
interface PreviewRoute {
  slug: string;
  label: string;
  note: string;
  status: 'ready' | 'planned';
}

const GROUPS: { title: string; routes: PreviewRoute[] }[] = [
  {
    title: 'Home',
    routes: [
      { slug: 'home', label: 'Home — Dashboard', note: 'Has meetings + schedule', status: 'planned' },
      { slug: 'home-empty', label: 'Home — Empty', note: 'First-run, no meetings', status: 'planned' },
      { slug: 'home-loading', label: 'Home — Loading', note: 'Skeletons', status: 'planned' },
      { slug: 'home-no-results', label: 'Home — No results', note: 'Empty search', status: 'planned' },
    ],
  },
  {
    title: 'Meeting',
    routes: [
      { slug: 'meeting-summary', label: 'Meeting — Summary', note: 'AI summary view', status: 'planned' },
      { slug: 'meeting-transcript', label: 'Meeting — Transcript', note: 'Diarized transcript', status: 'planned' },
      { slug: 'meeting-generating', label: 'Meeting — Generating', note: 'Summary in progress', status: 'planned' },
    ],
  },
  {
    title: 'Ask',
    routes: [{ slug: 'ask', label: 'Ask Saransh', note: 'Chat over meetings', status: 'planned' }],
  },
  {
    title: 'Library',
    routes: [
      { slug: 'library-grid', label: 'Library — Grid', note: 'Project cards', status: 'planned' },
      { slug: 'library-list', label: 'Library — List', note: 'Dense list', status: 'planned' },
      { slug: 'project-detail', label: 'Project — Detail', note: 'Single project', status: 'planned' },
      { slug: 'library-empty', label: 'Library — Empty', note: 'No projects yet', status: 'planned' },
      { slug: 'library-loading', label: 'Library — Loading', note: 'Skeletons', status: 'planned' },
    ],
  },
];

export default function PreviewIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-rd-sans text-rd-h2 text-ink-heading">Redesign Preview</h1>
        <p className="mt-2 font-rd-sans text-rd-body text-ink-muted">
          Static, Figma-driven screens on the shared app shell. Pick a route below.
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 font-rd-sans text-rd-h4 text-ink-heading">{group.title}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.routes.map((r) => (
                <Link key={r.slug} href={`/preview/${r.slug}`} className="group">
                  <Card interactive className="flex h-full flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-rd-sans text-rd-small font-semibold text-ink-secondary">
                        {r.label}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink-brand" />
                    </div>
                    <p className="font-rd-sans text-[12px] leading-4 text-ink-muted">{r.note}</p>
                    <div className="mt-1">
                      <Badge
                        variant={r.status === 'ready' ? 'success' : 'muted'}
                        size="sm"
                        shape="rounded"
                      >
                        {r.status === 'ready' ? 'Ready' : 'Planned'}
                      </Badge>
                    </div>
                    <code className="mt-auto pt-1 font-mono text-[11px] text-ink-tertiary">
                      /preview/{r.slug}
                    </code>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
