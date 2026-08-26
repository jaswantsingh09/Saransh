import * as React from 'react';
import {
  Plus,
  Search,
  Layers,
  AtSign,
  Mic,
  Send,
  ListChecks,
  Sparkles,
  MessageCircleQuestion,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AskSaranshChat — the "Ask Saransh" AI-chat empty state (Figma node 133:13676).
 *
 * Presentational only. Renders inside the (redesign) layout <main>, which already
 * supplies the TitleBar and the SidebarRail (active = "ask"). This component covers
 * the two-column body: a 260px "Recent Panel" and the centered onboarding content
 * with the composer, disclaimer and suggestion chips.
 */

interface SuggestionChip {
  label: string;
  icon: LucideIcon;
}

/** Suggestion chips — labels + icons taken verbatim from the Figma design. */
const SUGGESTION_CHIPS: SuggestionChip[] = [
  { label: 'Summarize the meeting', icon: ListChecks },
  { label: 'Extract action items', icon: Sparkles },
  { label: 'List key decisions', icon: MessageCircleQuestion },
  { label: 'Draft a follow-up email', icon: NotebookPen },
];

export type AskSaranshChatProps = React.HTMLAttributes<HTMLDivElement>

export function AskSaranshChat({ className, ...props }: AskSaranshChatProps) {
  return (
    <div className={cn('flex h-full min-h-[600px] w-full', className)} {...props}>
      {/* ── Recent Panel ─────────────────────────────────────────────── */}
      <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#dbe3ef] bg-white p-6">
        {/* Actions */}
        <div className="flex h-[132px] w-full flex-col gap-4 overflow-hidden p-5">
          {/* New chat */}
          <button
            type="button"
            className="flex h-6 items-center gap-2 overflow-hidden text-left"
          >
            <Plus className="size-4 shrink-0 text-[#c2410c]" strokeWidth={2} />
            <span className="whitespace-nowrap text-[14px] font-medium leading-[21px] tracking-[0.07px] text-[#52525b]">
              New Chat
            </span>
          </button>

          {/* Search */}
          <button
            type="button"
            className="flex h-6 items-center gap-2 overflow-hidden text-left"
          >
            <Search className="size-4 shrink-0 text-[#c2410c]" strokeWidth={2} />
            <span className="whitespace-nowrap text-[14px] font-medium leading-[21px] tracking-[0.07px] text-[#52525b]">
              Search
            </span>
          </button>

          {/* Connectors (coming soon) */}
          <div className="flex h-6 w-[192px] items-center gap-2 overflow-hidden">
            <Layers className="size-4 shrink-0 text-[#edc6b7]" strokeWidth={2} />
            <span className="whitespace-nowrap text-[14px] font-medium leading-[21px] tracking-[0.07px] text-[#8c8c99]">
              Connectors
            </span>
            <span className="flex items-center justify-center whitespace-nowrap rounded bg-[#e5e5eb] px-1.5 py-0.5 text-[10px] font-medium leading-[14px] text-[#8c8c99]">
              Coming soon
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full shrink-0 bg-[#e2e8f0]" />

        {/* Empty state */}
        <div className="flex h-[300px] w-full flex-col items-center overflow-hidden px-5 pt-5">
          <div className="flex h-[78px] w-full flex-col items-center gap-4 overflow-hidden">
            <p className="whitespace-nowrap text-[14px] font-medium leading-[21px] tracking-[0.07px] text-[#0f172a]">
              No chats yet
            </p>
            <p className="w-[172px] text-center text-[14px] font-normal leading-[21px] tracking-[0.07px] text-[#737373]">
              Your chats will appear here once you start one.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Centered content ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col items-center overflow-auto p-8">
        <div className="flex w-full flex-col items-center gap-6 py-8">
          {/* Heading */}
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <p className="whitespace-nowrap text-[20px] font-semibold leading-6 text-[#c2410c]">
              Meeting intelligence, always on
            </p>
            <p className="max-w-full whitespace-nowrap text-[16px] font-normal leading-6 text-[#737373]">
              Ask Saransh anything about any meeting. Get answers grounded in your actual transcripts and recordings.
            </p>
          </div>

          {/* Composer — orange "liquid flow" glow wrapper */}
          <div className="flex w-[929px] max-w-full flex-col items-start justify-center overflow-hidden rounded-xl p-5">
            <div className="flex w-full flex-col items-start rounded-xl border-2 border-[#f0a461]">
              <div className="flex w-full flex-col items-center gap-8 overflow-hidden">
                <div className="flex w-full flex-col items-start gap-4">
                  <div className="flex w-full flex-col items-start gap-2 rounded-2xl bg-white px-6 py-3">
                    {/* File attachment scope */}
                    <div className="flex w-full items-center gap-2 py-0.5">
                      <div className="flex max-w-[120px] items-center justify-center gap-2 rounded bg-[#ffedd5] px-2 py-0.5">
                        <AtSign className="size-3 shrink-0 text-[#c2410c]" strokeWidth={2} />
                        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-normal leading-4 tracking-[0.18px] text-[#c2410c]">
                          All Meetings
                        </span>
                      </div>
                    </div>

                    {/* Prompt row */}
                    <div className="flex w-full items-center justify-between rounded-2xl">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
                        <Plus className="size-5 shrink-0 text-[#64748b]" strokeWidth={2} />
                        <span className="min-w-0 flex-1 text-[14px] font-normal leading-[21px] tracking-[0.07px] text-[#64748b]">
                          Ask me Anything
                        </span>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-4">
                          <Mic className="size-5 shrink-0 text-[#64748b]" strokeWidth={2} />
                          <Send className="size-5 shrink-0 text-[#64748b]" strokeWidth={2} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="w-[720px] max-w-full text-center text-[12px] font-normal leading-4 tracking-[0.18px] text-[#737373]">
            AI insights are for informational purposes and may contain inaccuracies. Please review critical information.
          </p>

          {/* Suggested options */}
          <div className="flex w-full flex-col items-center gap-0.5 pt-5">
            <p className="whitespace-nowrap text-center text-[16px] font-normal leading-6 text-[#737373]">
              Try asking
            </p>
            <div className="flex w-[983px] max-w-full flex-wrap items-center justify-center gap-x-6 gap-y-2.5 py-4">
              {SUGGESTION_CHIPS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-4 py-[7.5px] shadow transition-colors hover:border-[#cbd5e1]"
                >
                  <Icon className="size-[13.25px] shrink-0 text-[#020617]" strokeWidth={2} />
                  <span className="whitespace-nowrap text-center text-[14px] font-semibold leading-[21px] tracking-[0.07px] text-[#020617]">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
