/**
 * Backend Sync Service
 *
 * Dual-write bridge from the local-first desktop app to the shared org backend.
 * After a meeting is saved locally (SQLite), we best-effort push its transcript
 * segments to the backend so the meeting becomes visible/shareable across the org.
 *
 * The local copy remains the capture buffer; the backend is the source of truth
 * for org-wide reads and sharing. A failed push never breaks the local flow.
 *
 * Backend contract: POST /api/meetings/ingest (see backend/app/main.py
 * IngestMeetingRequest / IngestSegment). Auth is a Bearer session JWT, supplied
 * by AuthContext.authFetch.
 */

import { Transcript } from '@/types';

/** Mirrors backend IngestSegment. */
interface IngestSegment {
  text: string;
  timestamp?: string;
  audio_start_time?: number;
  audio_end_time?: number;
  duration?: number;
}

/** Mirrors backend IngestMeetingRequest. */
interface IngestMeetingRequest {
  title: string;
  started_at?: string;
  source: string;
  segments: IngestSegment[];
  summarize: boolean;
  custom_prompt?: string;
}

export interface IngestResult {
  meeting_id: string;
  status: 'processing' | 'ready';
}

type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** Map local transcript segments to the backend ingest shape, dropping empties. */
function toIngestSegments(transcripts: Transcript[]): IngestSegment[] {
  return transcripts
    .filter((t) => t.text && t.text.trim().length > 0)
    .map((t) => ({
      text: t.text,
      timestamp: t.timestamp,
      audio_start_time: t.audio_start_time,
      audio_end_time: t.audio_end_time,
      duration: t.duration,
    }));
}

/**
 * Push a locally-saved meeting to the shared backend.
 *
 * @param authFetch  AuthContext.authFetch (adds Bearer token + backend base URL)
 * @param title      Meeting title
 * @param transcripts Local transcript segments
 * @param opts.startedAt ISO start time (optional)
 * @param opts.summarize Ask the server to summarize with the org's model (default true)
 * @returns The backend meeting id + status.
 * @throws If the request fails or the backend returns a non-2xx status.
 */
export async function ingestMeetingToBackend(
  authFetch: AuthFetch,
  title: string,
  transcripts: Transcript[],
  opts: { startedAt?: string; summarize?: boolean } = {}
): Promise<IngestResult> {
  const segments = toIngestSegments(transcripts);

  const body: IngestMeetingRequest = {
    title,
    started_at: opts.startedAt,
    source: 'desktop',
    segments,
    summarize: opts.summarize ?? true,
  };

  const res = await authFetch('/api/meetings/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Ingest failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`
    );
  }

  return (await res.json()) as IngestResult;
}
