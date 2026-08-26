'use client'

import { useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useRecordingState, RecordingStatus } from '@/contexts/RecordingStateContext'
import { useConfig } from '@/contexts/ConfigContext'
import { useMeetingRecording } from '@/contexts/MeetingRecordingContext'

/** Mirror of the Rust `MeetWindow` returned by `meet_detect_scan`. */
interface MeetWindow {
  code: string
  title: string
}

// How often to scan open windows for a Google Meet.
const POLL_MS = 3000
// Consecutive empty scans before we forget a meeting (so re-joining re-records).
// Guards against a single flickery title read wiping our "already handled" state.
const CLEAR_AFTER_EMPTY = 2
// Consecutive empty scans before we auto-stop a meeting-initiated recording.
// Higher than CLEAR_AFTER_EMPTY so a brief title flicker never ends a recording.
const STOP_AFTER_EMPTY = 3
// If we auto-start but the recording never actually begins (e.g. model missing,
// or the user hit Undo), give up waiting after this long and go back to watching.
const ARM_TIMEOUT_MS = 30000

type Mode =
  | 'watch' // idle — look for a Meet and auto-start on the first new one
  | 'armed' // start() dispatched — waiting for the recording to actually begin
  | 'active' // meeting-initiated recording running — watch for the Meet to end

/** Readable label for a meeting: bare codes (`abc-defg-hij`) are cryptic, so
 *  prefix them; named meetings pass through as-is. */
function meetLabel(code: string): string {
  return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(code) ? `Google Meet (${code})` : code
}

/**
 * Watches for the user being in a Google Meet and drives the auto-record loop:
 *   - the moment a *new* Meet is detected, auto-starts an audio **+ video**
 *     recording of that meeting's window (no prompt — see the Undo toast), and
 *   - auto-stops + merges the recording when that meeting's window closes.
 *
 * Detection is passive window-title polling (see `meet_detect.rs`) and works
 * across any browser (Chrome/Edge/Brave/Firefox/Opera). Recording reuses the
 * shared `MeetingRecordingContext` flow (screen capture via Windows Graphics
 * Capture + audio + transcript, muxed into one MP4). Gated by the
 * `autoDetectMeet` beta setting. Renders nothing; mounted once globally.
 *
 * We only ever manage recordings we started ourselves: if a manual, tray, or
 * calendar recording is already running we stay out of the way.
 */
export function MeetAutoDetect() {
  const { isRecording, status } = useRecordingState()
  const { betaFeatures } = useConfig()
  const { active, processing, start, stop } = useMeetingRecording()
  const enabled = betaFeatures.autoDetectMeet

  // Latest render state, read inside the interval without re-arming it.
  const live = useRef({ isRecording, status, active, processing, start, stop })
  live.current = { isRecording, status, active, processing, start, stop }

  // Mutable loop state, kept in a ref so the polling interval is armed once.
  const st = useRef({
    mode: 'watch' as Mode,
    handled: new Set<string>(), // meeting codes we've already acted on
    emptyStreak: 0, // consecutive scans with no Meet window
    armedAt: 0, // when we last auto-started (for the arm timeout)
    code: '', // the meeting we're recording
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let inFlight = false

    const scan = async (): Promise<MeetWindow | null> => {
      try {
        return await invoke<MeetWindow | null>('meet_detect_scan')
      } catch {
        // Detection is best-effort (non-Windows / no Tauri) — treat as "none".
        return null
      }
    }

    const tick = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const s = st.current
        const { isRecording, status, active, processing } = live.current

        switch (s.mode) {
          case 'watch': {
            // Some other recording is running (manual, tray, or a calendar
            // meeting). Stay out of the way — we only manage our own.
            if (isRecording || active || processing || status !== RecordingStatus.IDLE) return

            const meet = await scan()
            if (cancelled) return
            if (!meet) {
              if (++s.emptyStreak >= CLEAR_AFTER_EMPTY) s.handled.clear()
              return
            }
            s.emptyStreak = 0
            if (s.handled.has(meet.code)) return
            s.handled.add(meet.code)
            s.code = meet.code
            s.mode = 'armed'
            s.armedAt = Date.now()

            // Auto-start audio + video, cropping the capture to just this
            // meeting's window (WGC follows the window & ignores occlusion).
            // Fire-and-forget: the loop watches `active` for it to take hold.
            void live.current.start(meetLabel(meet.code), undefined, undefined, {
              windowHint: meet.code,
              undoable: true,
            })
            return
          }

          case 'armed': {
            // Recording has actually begun — switch to watching for it to end.
            if (active) {
              s.mode = 'active'
              s.emptyStreak = 0
              return
            }
            // Never started (model missing, Undo, error) — resume watching.
            // The code stays in `handled`, so we don't immediately re-trigger on
            // the still-open window; a fresh meeting re-arms once this window
            // closes (the empty-streak below clears `handled`).
            if (Date.now() - s.armedAt > ARM_TIMEOUT_MS) {
              s.mode = 'watch'
              s.emptyStreak = 0
            }
            return
          }

          case 'active': {
            // Recording ended (auto-stop landed, or the user stopped/undid it).
            // Back to watching — but keep `handled` so we never restart a Meet
            // whose window is still open (respects a manual stop mid-meeting).
            if (!active && !processing) {
              s.mode = 'watch'
              s.emptyStreak = 0
              return
            }
            const meet = await scan()
            if (cancelled) return
            if (meet) {
              s.emptyStreak = 0
              return
            }
            // The Meet window is gone. After a few confirming scans, stop and
            // merge. stop() is idempotent, so re-issuing while it finalizes is
            // harmless.
            if (++s.emptyStreak >= STOP_AFTER_EMPTY) {
              void live.current.stop()
            }
            return
          }
        }
      } finally {
        inFlight = false
      }
    }

    const id = setInterval(tick, POLL_MS)
    void tick()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled])

  return null
}
