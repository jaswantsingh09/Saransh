# meetbot

A server-hosted web app that joins Google Meet sessions, records the audio, transcribes it, and produces an Otter-style summary. Web app, not desktop. Team-shared.

This lives in a `meetbot/v0` branch alongside Meetily; it does not replace Meetily and does not depend on the Tauri frontend.

## v0 scope

One meeting at a time. No queue, no multi-tenant, no calendar integration, no live transcript. Submit a Meet URL → bot joins as a guest → host admits → bot records → backend transcribes + summarises → web UI displays.

Out of scope for v0: calendar/Slack integration, OtterPilot chatbot, speaker diarisation, highlights/comments, sharing, multi-user auth, parallel meetings.

## Architecture

```
┌────────────────┐  POST /meetings    ┌──────────────────┐
│  Next.js UI    │ ─────────────────▶ │  FastAPI backend │
│  (frontend/)   │                    │  (backend/)      │
│                │ ◀─── poll /:id ──── │  - jobs DB       │
└────────────────┘                    │  - spawns bot    │
                                      └────────┬─────────┘
                                               │ docker run
                                               ▼
                                      ┌──────────────────┐
                                      │  bot container   │
                                      │  (bot/)          │
                                      │  Xvfb + Pulse    │
                                      │  + Chrome (PW)   │
                                      │  + ffmpeg        │
                                      └────────┬─────────┘
                                               │ wav on shared volume
                                               ▼
                                      ┌──────────────────┐
                                      │ whisper-server   │
                                      │ (Meetily, :8178) │
                                      └────────┬─────────┘
                                               │ transcript JSON
                                               ▼
                                      ┌──────────────────┐
                                      │ summary endpoint │
                                      │ (Meetily, :5167) │
                                      └──────────────────┘
```

Reuses two services already running from Meetily:
- `whisper-server` on `127.0.0.1:8178` for STT
- Meetily FastAPI on `127.0.0.1:5167` for LLM summary

## Folder layout

```
meetbot/
├── backend/                FastAPI: meetings CRUD, job state, transcribe + summarise
├── bot/                    Linux container: Playwright joins Meet, ffmpeg records audio
├── frontend/               Next.js web UI (Otter-style: list + detail with transcript & summary)
└── docker-compose.yml      Local dev orchestration
```

## Milestones

- [ ] **M1 — Bot container.** Dockerfile + `bot/join_meet.py`. Joins a Meet URL as a guest, waits for admission, records audio via PulseAudio→ffmpeg, exits when meeting ends.
- [ ] **M2 — Backend.** FastAPI on `:5168`. `POST /meetings` spawns a bot container, `GET /meetings/:id` returns job + asset paths. SQLite via aiosqlite.
- [ ] **M3 — Transcription + summary.** On bot exit, backend POSTs the WAV to whisper-server (`:8178`), then calls the Meetily summary endpoint (`:5167`), persists both.
- [ ] **M4 — Frontend.** Next.js. Otter-style 2-pane layout. Form to submit a Meet URL, conversation list, detail page with transcript bubbles + summary panel.

## Known fragility

- The bot joins via the Meet **guest pre-join screen**. If the host has disabled guest join, this fails.
- Meet's DOM changes regularly. Selectors will need maintenance.
- Smart App Control on this Windows machine does *not* affect Docker/Playwright — only Rust build scripts. We're clear of that wall here.

## What's required of the operator

- Docker Desktop on the host (installing now).
- The host of each Meet must click "Admit" to let the bot in.
- An LLM provider configured in the Meetily backend (Ollama local or Anthropic/Groq/OpenAI key in `backend/.env`).

See `bot/README.md`, `backend/README.md`, `frontend/README.md` for component-specific docs.
