'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { invoke } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import { toast } from 'sonner'
import { useConfig } from '@/contexts/ConfigContext'
import { useTranscripts } from '@/contexts/TranscriptContext'
import { recordingService } from '@/services/recordingService'

interface Paths {
  audio: string
  screen: string
  merged: string
}

interface WindowRegion {
  x: number
  y: number
  w: number
  h: number
  title: string
}

interface MeetingRecordingValue {
  active: boolean
  processing: boolean
  title: string | null
  /** Open the Meet link and auto-start screen + audio recording. */
  start: (title: string, meetLink?: string, endIso?: string) => Promise<void>
  /** Stop both captures and merge into one MP4. */
  stop: () => Promise<void>
}

const Ctx = createContext<MeetingRecordingValue | undefined>(undefined)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
// Don't auto-stop for events that end absurdly far out (e.g. all-day/multi-day).
const AUTO_STOP_CAP_MS = 6 * 60 * 60 * 1000

export function MeetingRecordingProvider({ children }: { children: ReactNode }) {
  const { selectedDevices } = useConfig()
  const { setMeetingTitle, clearTranscripts } = useTranscripts()
  const [active, setActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [title, setTitle] = useState<string | null>(null)
  const paths = useRef<Paths | null>(null)
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest stop() — so the auto-stop timer never calls a stale closure.
  const stopRef = useRef<() => Promise<void>>(async () => {})

  const start = useCallback(
    async (meetingTitle: string, meetLink?: string, endIso?: string) => {
      if (active || processing) {
        toast.info('A recording is already running.')
        return
      }
      setProcessing(true)
      try {
        // 1. open the meeting in the browser
        if (meetLink) {
          await invoke('open_external_url', { url: meetLink }).catch(() => {})
        }

        // 2. try to locate the meeting window so we can crop the capture to it.
        //    Poll briefly — the browser tab needs a moment to load + set its title.
        let region: WindowRegion | null = null
        if (meetLink) {
          for (let i = 0; i < 8; i++) {
            region = await invoke<WindowRegion | null>('screen_find_window_region', {
              hint: 'Meet',
            }).catch(() => null)
            if (region) break
            await sleep(700)
          }
        }

        // 3. paths in the app data dir
        const dir = await appDataDir()
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        const p: Paths = {
          audio: await join(dir, `meeting-${ts}-audio.mp4`),
          screen: await join(dir, `meeting-${ts}-screen.mp4`),
          merged: await join(dir, `meeting-${ts}.mp4`),
        }
        paths.current = p

        // 4. start Saransh's audio recording + transcription (existing flow)
        setMeetingTitle(meetingTitle)
        clearTranscripts()
        await recordingService.startRecordingWithDevices(
          selectedDevices?.micDevice || null,
          selectedDevices?.systemDevice || null,
          meetingTitle,
        )

        // 5. start the screen (video) capture — just the meeting window if found
        //    (Windows Graphics Capture follows the window & ignores occlusion),
        //    otherwise the full screen.
        await invoke('screen_record_start', {
          outPath: p.screen,
          windowHint: region ? 'Meet' : null,
        })

        setTitle(meetingTitle)
        setActive(true)

        // 6. schedule an automatic stop at the meeting's end time (if known)
        if (autoStopTimer.current) clearTimeout(autoStopTimer.current)
        autoStopTimer.current = null
        let autoStopNote = ''
        if (endIso) {
          const endMs = new Date(endIso).getTime()
          const delay = endMs - Date.now()
          if (!isNaN(endMs) && delay > 0 && delay <= AUTO_STOP_CAP_MS) {
            autoStopTimer.current = setTimeout(() => {
              toast.message('Meeting ended — stopping recording')
              void stopRef.current()
            }, delay)
            autoStopNote = ` · auto-stops at ${new Date(endMs).toLocaleTimeString(
              [],
              { hour: 'numeric', minute: '2-digit' },
            )}`
          }
        }

        toast.success('Recording started', {
          description:
            (region ? 'Recording the meeting window' : 'Recording full screen') +
            ' + audio' +
            autoStopNote,
        })
      } catch (e) {
        // best-effort cleanup so we never leave half-started captures
        await invoke('screen_record_stop').catch(() => {})
        await recordingService.stopRecording('').catch(() => {})
        toast.error('Could not start recording', {
          description: typeof e === 'string' ? e : (e as Error)?.message,
        })
      } finally {
        setProcessing(false)
      }
    },
    [active, processing, selectedDevices, setMeetingTitle, clearTranscripts],
  )

  const stop = useCallback(async () => {
    if (!active || processing) return
    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current)
      autoStopTimer.current = null
    }
    const p = paths.current
    setProcessing(true)
    try {
      // The recorder saves the audio into a meeting folder it picks itself and
      // tells us the path via the `recording-stopped` event — capture it so we
      // can merge against the *real* audio file (it ignores any save_path arg).
      let folderPath: string | null = null
      const folderReady = new Promise<void>((resolve) => {
        recordingService
          .onRecordingStopped((payload) => {
            folderPath = payload.folder_path ?? null
            resolve()
          })
          .then((un) => {
            // auto-unlisten after we resolve or time out
            setTimeout(un, 8000)
          })
      })

      // 1. stop audio recording (the audio file is written asynchronously after)
      if (p) await recordingService.stopRecording(p.audio).catch(() => {})
      // 2. stop the screen capture (finalizes p.screen synchronously)
      await invoke('screen_record_stop').catch(() => {})

      // 3. wait (briefly) for the recorder to report its meeting folder
      await Promise.race([folderReady, new Promise<void>((r) => setTimeout(r, 6000))])

      // 4. merge the screen video with the meeting audio into one MP4, saved in
      //    the meeting folder alongside the transcript (falls back to app dir).
      if (p) {
        const audioPath = folderPath ? await join(folderPath, 'audio.mp4') : p.audio
        const mergedOut = folderPath ? await join(folderPath, 'meeting.mp4') : p.merged
        try {
          await invoke('mux_recording', {
            videoPath: p.screen,
            audioPath,
            outPath: mergedOut,
          })
          toast.success('Meeting recording saved', { description: mergedOut })

          // If a voiceprint is enrolled, diarize + name speakers in the
          // background (it's slow on long files — don't block the save flow).
          void (async () => {
            try {
              const enrolled = await invoke('voice_status')
              if (!enrolled) return
              const segs = await invoke<Array<{ name: string }>>('voice_diarize_label', {
                audioPath: mergedOut,
              })
              const names = Array.from(new Set(segs.map((s) => s.name)))
              if (names.length) {
                toast.success('Speakers identified', { description: names.join(', ') })
              }
            } catch {
              /* non-fatal — recognition is best-effort */
            }
          })()
        } catch (e) {
          toast.message('Saved screen video (audio merge skipped)', {
            description: typeof e === 'string' ? e : p.screen,
          })
        }
      }
    } finally {
      setActive(false)
      setTitle(null)
      paths.current = null
      setProcessing(false)
    }
  }, [active, processing])

  // Keep the ref pointing at the latest stop() for the auto-stop timer.
  stopRef.current = stop

  return (
    <Ctx.Provider value={{ active, processing, title, start, stop }}>
      {children}
    </Ctx.Provider>
  )
}

export function useMeetingRecording(): MeetingRecordingValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMeetingRecording must be used within MeetingRecordingProvider')
  return v
}
