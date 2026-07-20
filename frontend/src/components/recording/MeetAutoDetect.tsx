'use client'

import { useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useRecordingState, RecordingStatus } from '@/contexts/RecordingStateContext'
import { useConfig } from '@/contexts/ConfigContext'

/** Mirror of the Rust `MeetWindow` returned by `meet_detect_scan`. */
interface MeetWindow {
  code: string
  title: string
}

// How often to scan open windows for a Google Meet.
const POLL_MS = 3000
// How long the "start recording?" prompt stays up before auto-dismissing.
const PROMPT_DURATION_MS = 12000
// Consecutive empty scans before we forget a meeting (so re-joining re-prompts).
// Guards against a single flickery title read wiping our "already asked" state.
const CLEAR_AFTER_EMPTY = 2
// Consecutive empty scans before we auto-stop a meeting-initiated recording.
// Higher than CLEAR_AFTER_EMPTY so a brief title flicker never ends a recording.
const STOP_AFTER_EMPTY = 3
// If the user confirms but recording never actually starts (e.g. model missing),
// give up waiting after this long and go back to watching.
const ARM_TIMEOUT_MS = 30000

type Mode =
  | 'watch' // not recording — look for a Meet and prompt
  | 'armed' // user confirmed — waiting for the recording to actually start
  | 'active' // meeting-initiated recording running — watch for the Meet to end

/**
 * Watches for the user being in a Google Meet and drives the auto-transcribe loop:
 *   - prompts to start transcription when a Meet is detected,
 *   - and auto-stops the recording when that Meet's window closes.
 *
 * Detection is passive window-title polling (see `meet_detect.rs`), so we always
 * *prompt* to start (never silently record) and only auto-stop recordings we
 * started ourselves. Start/stop reuse the home page's existing, tested flows
 * (audio + live transcript, no screen video). Gated by the `autoDetectMeet`
 * beta setting. Renders nothing; mounted once globally.
 */
export function MeetAutoDetect() {
  const { isRecording, status } = useRecordingState()
  const { betaFeatures } = useConfig()
  const enabled = betaFeatures.autoDetectMeet
  const router = useRouter()
  const pathname = usePathname()

  // Latest render state, read inside the interval without re-arming it.
  const live = useRef({ isRecording, status, pathname })
  live.current = { isRecording, status, pathname }

  // Mutable loop state, kept in a ref so the polling interval is armed once.
  const st = useRef({
    mode: 'watch' as Mode,
    handled: new Set<string>(), // codes we've already prompted for
    emptyStreak: 0, // consecutive scans with no Meet window
    armedAt: 0, // when the user last confirmed (for the arm timeout)
    code: '', // the meeting we're recording
  })

  const startRecording = useCallback(
    (code: string) => {
      const s = st.current
      s.mode = 'armed'
      s.armedAt = Date.now()
      s.code = code
      // Reuse the home page's auto-start machinery (model check, device
      // selection, transcript clearing) rather than duplicating it here.
      if (live.current.pathname === '/') {
        // Home is mounted → its window-event listener starts recording now.
        window.dispatchEvent(new CustomEvent('start-recording-from-sidebar'))
      } else {
        // Navigate home; its mount effect consumes this flag and auto-starts.
        sessionStorage.setItem('autoStartRecording', 'true')
        router.push('/')
      }
    },
    [router],
  )

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
        const { isRecording, status } = live.current

        switch (s.mode) {
          case 'watch': {
            // A recording started that we didn't initiate (manual/tray). Stay
            // out of the way — we only manage recordings we started.
            if (isRecording || status !== RecordingStatus.IDLE) return

            const meet = await scan()
            if (cancelled) return
            if (!meet) {
              if (++s.emptyStreak >= CLEAR_AFTER_EMPTY) s.handled.clear()
              return
            }
            s.emptyStreak = 0
            if (s.handled.has(meet.code)) return
            s.handled.add(meet.code)

            toast('Google Meet detected', {
              description: `Start transcribing "${meet.code}"?`,
              duration: PROMPT_DURATION_MS,
              action: { label: 'Record', onClick: () => startRecording(meet.code) },
              cancel: { label: 'Ignore', onClick: () => {} },
            })
            return
          }

          case 'armed': {
            // Recording has actually begun — switch to watching for it to end.
            if (isRecording) {
              s.mode = 'active'
              s.emptyStreak = 0
              return
            }
            // Never started (model missing, user bailed) — resume watching.
            if (Date.now() - s.armedAt > ARM_TIMEOUT_MS) {
              s.mode = 'watch'
              s.emptyStreak = 0
            }
            return
          }

          case 'active': {
            // Recording ended (auto-stop landed, or the user stopped manually).
            if (!isRecording) {
              s.mode = 'watch'
              s.emptyStreak = 0
              s.handled.clear()
              return
            }
            const meet = await scan()
            if (cancelled) return
            if (meet) {
              s.emptyStreak = 0
              return
            }
            // The Meet window is gone. After a few confirming scans, stop.
            // Dispatch every tick until the recording actually ends, so a
            // momentarily-unmounted listener (user off the home page) still
            // gets the stop once they return.
            if (++s.emptyStreak >= STOP_AFTER_EMPTY) {
              window.dispatchEvent(new CustomEvent('stop-recording-from-meet'))
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
  }, [enabled, startRecording])

  return null
}
