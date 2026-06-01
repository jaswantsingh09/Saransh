# backend

FastAPI app that owns meeting state and orchestrates the bot. Runs on `:5168` to avoid colliding with Meetily's backend on `:5167`.

**Status: scaffold only.** No code yet — wired up in milestone M2.

## Planned endpoints

| Method | Path | Body | Behaviour |
|---|---|---|---|
| `POST` | `/meetings` | `{meet_url, name?}` | Create a job, spawn the bot container, return `{id, status: "pending"}`. |
| `GET` | `/meetings` | — | List meetings (newest first). |
| `GET` | `/meetings/{id}` | — | Return job state, audio path, transcript, summary. |
| `POST` | `/meetings/{id}/cancel` | — | Stop the bot container. |

## State machine

`pending → joining → recording → transcribing → summarising → done`
                                                          ↓
                                                     `error`

State transitions happen in `app/jobs.py`. The bot lifecycle is owned by the backend: `docker run --rm meetbot-bot …` is started in a background task, then the audio file path is handed to the transcription step.

## Storage

SQLite (`meetbot.db`) with tables:
- `meetings(id, meet_url, name, status, created_at, updated_at, audio_path, error)`
- `transcripts(meeting_id, text, segments_json)`
- `summaries(meeting_id, summary_md, action_items_md, model)`

Audio files land in `recordings/{id}.wav` next to the DB. Volume-mounted into the bot container at `/out`.

## Reused services

The transcription and summarisation steps call services already running from Meetily:
- whisper-server at `127.0.0.1:8178` — POST audio, get segments.
- Meetily FastAPI at `127.0.0.1:5167` — summary endpoint (TBD on which one to use).

We do not re-host whisper or LLMs here; meetbot is a thin orchestrator over those.
