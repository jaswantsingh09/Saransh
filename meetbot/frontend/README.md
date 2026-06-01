# frontend

Next.js 14 web UI, Otter-style layout. Runs on `:3119` to avoid colliding with Meetily's `:3118`.

**Status: scaffold only.** No code yet — wired up in milestone M4.

## Planned UI

Otter-style two-pane:

```
┌──────────────────────────────────────────────────────────────────┐
│ meetbot                                          [+ New meeting] │
├────────────────────┬─────────────────────────────────────────────┤
│ Conversations      │ Q2 Standup · Today                          │
│ ──────────────     │ ───────────────                             │
│ ● Q2 Standup       │  Summary                                    │
│   Today · 32 min   │  • Team blocked on auth flow                │
│                    │  • Demo Friday                              │
│ ○ Roadmap review   │                                             │
│   Yesterday · 51m  │  Action items                               │
│                    │  □ @raj: ship the migration by Thu          │
│ ○ Onboarding       │  □ @sara: file ADR on storage layer         │
│   May 28 · 18m     │                                             │
│                    │  Transcript                                 │
│                    │  ▸ 00:00  [Bot joined]                      │
│                    │  ▸ 00:08  alright, let's start with Sara…   │
│                    │  ▸ 00:24  yeah so I've been heads-down on…  │
└────────────────────┴─────────────────────────────────────────────┘
```

Routes:
- `/` — conversations list (left pane visible, detail pane empty until a row is selected).
- `/m/[id]` — detail view; transcript + summary panels.

Build will be a standard `pnpm create next-app` scaffold with Tailwind, shadcn/ui, and SWR for the polling. No Tauri.

## Reference: Otter

This is intentionally modelled on otter.ai's "Conversations" page. Same affordances, same vocabulary:
- "Conversations" (not "meetings") in the sidebar.
- "Summary", "Action items", "Outline" panels above the transcript.
- Transcript rendered as speaker bubbles with timecodes.

We will not clone Otter's branding or assets. The Otter parity is structural, not visual.
