'use client';

import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SpeakerSegment } from '@/types';

// Tailwind-ish palette used to give each distinct speaker a stable accent color.
const SPEAKER_COLORS = [
  { text: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  { text: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  { text: 'text-pink-700', bg: 'bg-pink-50', dot: 'bg-pink-500' },
  { text: 'text-cyan-700', bg: 'bg-cyan-50', dot: 'bg-cyan-500' },
] as const;

export type SpeakerColor = (typeof SPEAKER_COLORS)[number];

export interface SpeakerLabels {
  /** True while the labels are being loaded. */
  loading: boolean;
  /** Distinct speaker names in first-appearance order. */
  names: string[];
  /** Whether any diarized speaker labels exist for this meeting. */
  hasSpeakers: boolean;
  /** Resolve the speaker name active at a given recording-relative time (seconds). */
  labelForTime: (seconds: number | undefined) => string | undefined;
  /** Stable accent color for a speaker name. */
  colorForName: (name: string) => SpeakerColor;
}

// Slack allowed between a transcript timestamp and the nearest diarized turn (seconds).
// Whisper segment starts and diarization boundaries rarely align exactly.
const MATCH_TOLERANCE = 2.0;

/**
 * Load persisted diarization labels (speakers.json) for a meeting folder and
 * expose a timestamp → speaker resolver. Returns empty/no-op behavior when the
 * folder has no labels (diarization never ran or Voice ID disabled).
 */
export function useSpeakerLabels(folderPath?: string | null): SpeakerLabels {
  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!folderPath) {
      setSegments([]);
      return;
    }
    setLoading(true);
    invoke<SpeakerSegment[]>('voice_load_speakers', { folderPath })
      .then((segs) => {
        if (!cancelled) setSegments(Array.isArray(segs) ? segs : []);
      })
      .catch(() => {
        if (!cancelled) setSegments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folderPath]);

  // Segments sorted by start time for a stable nearest-match search.
  const sorted = useMemo(
    () => [...segments].sort((a, b) => a.start - b.start),
    [segments],
  );

  const names = useMemo(() => {
    const seen: string[] = [];
    for (const s of sorted) {
      if (!seen.includes(s.name)) seen.push(s.name);
    }
    return seen;
  }, [sorted]);

  const colorMap = useMemo(() => {
    const map = new Map<string, SpeakerColor>();
    names.forEach((name, i) => map.set(name, SPEAKER_COLORS[i % SPEAKER_COLORS.length]));
    return map;
  }, [names]);

  const labelForTime = useMemo(() => {
    return (seconds: number | undefined): string | undefined => {
      if (seconds === undefined || sorted.length === 0) return undefined;
      let nearest: SpeakerSegment | undefined;
      let nearestGap = Infinity;
      for (const seg of sorted) {
        if (seconds >= seg.start && seconds < seg.end) return seg.name;
        // Track the closest turn in case no range strictly contains the time.
        const gap = seconds < seg.start ? seg.start - seconds : seconds - seg.end;
        if (gap < nearestGap) {
          nearestGap = gap;
          nearest = seg;
        }
      }
      return nearestGap <= MATCH_TOLERANCE ? nearest?.name : undefined;
    };
  }, [sorted]);

  const colorForName = useMemo(() => {
    return (name: string): SpeakerColor =>
      colorMap.get(name) ?? SPEAKER_COLORS[0];
  }, [colorMap]);

  return {
    loading,
    names,
    hasSpeakers: names.length > 0,
    labelForTime,
    colorForName,
  };
}
