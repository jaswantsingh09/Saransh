'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { Loader2, Mic, Square, Trash2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EnrollmentInfo {
  name: string
  enrolled_at: string
  model_id: string
}

const MIN_SECONDS = 12
const MAX_SECONDS = 30
const TARGET_SAMPLE_RATE = 16000

const PROMPT =
  '"The quick brown fox jumps over the lazy dog. I am enrolling my voice so Saransh can label my speech in meeting transcripts."'

/**
 * Records ~12–30s of the user's voice in-app (16 kHz mono), computes a
 * voiceprint via the on-device model, and stores it locally. Consent-gated —
 * voiceprints are biometric data.
 */
export function VoiceEnrollment({ defaultName = '', onDone }: { defaultName?: string; onDone?: () => void }) {
  const [name, setName] = useState(defaultName)
  const [consent, setConsent] = useState(false)
  const [enrolled, setEnrolled] = useState<EnrollmentInfo | null>(null)
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const [downloadingModel, setDownloadingModel] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)

  // capture plumbing
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const procRef = useRef<ScriptProcessorNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sampleRateRef = useRef<number>(TARGET_SAMPLE_RATE)

  const refreshStatus = useCallback(async () => {
    try {
      setEnrolled(await invoke<EnrollmentInfo | null>('voice_status'))
    } catch {
      /* ignore */
    }
    try {
      setModelReady(await invoke<boolean>('voice_model_ready'))
    } catch {
      setModelReady(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    if (!name && defaultName) setName(defaultName)
  }, [defaultName, name])

  const cleanupCapture = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    procRef.current?.disconnect()
    procRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
  }, [])

  useEffect(() => cleanupCapture, [cleanupCapture])

  const ensureModel = useCallback(async (): Promise<boolean> => {
    if (modelReady) return true
    setDownloadingModel(true)
    try {
      await invoke('voice_ensure_model')
      setModelReady(true)
      return true
    } catch (e) {
      toast.error('Could not download the voice model', {
        description: typeof e === 'string' ? e : (e as Error)?.message,
      })
      return false
    } finally {
      setDownloadingModel(false)
    }
  }, [modelReady])

  const startRecording = useCallback(async () => {
    if (!(await ensureModel())) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      // Try to capture directly at 16 kHz; fall back to native rate.
      let ctx: AudioContext
      try {
        ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
      } catch {
        ctx = new AudioContext()
      }
      ctxRef.current = ctx
      sampleRateRef.current = ctx.sampleRate
      chunksRef.current = []

      const source = ctx.createMediaStreamSource(stream)
      const proc = ctx.createScriptProcessor(4096, 1, 1)
      procRef.current = proc
      proc.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(input))
      }
      source.connect(proc)
      proc.connect(ctx.destination)

      setSeconds(0)
      setRecording(true)
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1
          if (next >= MAX_SECONDS) void finishRecording()
          return next
        })
      }, 1000)
    } catch (e) {
      toast.error('Microphone access failed', {
        description: typeof e === 'string' ? e : (e as Error)?.message ?? 'Could not open the microphone.',
      })
      cleanupCapture()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureModel, cleanupCapture])

  const finishRecording = useCallback(async () => {
    if (!recording) return
    setRecording(false)

    // merge captured chunks
    const chunks = chunksRef.current
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const sampleRate = sampleRateRef.current
    cleanupCapture()

    if (total < sampleRate * MIN_SECONDS) {
      toast.error('Recording too short', {
        description: `Please record at least ${MIN_SECONDS}s of speech.`,
      })
      return
    }

    const merged = new Float32Array(total)
    let off = 0
    for (const c of chunks) {
      merged.set(c, off)
      off += c.length
    }

    setBusy(true)
    try {
      await invoke('voice_enroll', {
        name: name.trim() || 'Me',
        samples: Array.from(merged),
        sampleRate: Math.round(sampleRate),
        consent: true,
      })
      toast.success('Voice enrolled', { description: 'Saransh can now recognize your voice.' })
      await refreshStatus()
      onDone?.()
    } catch (e) {
      toast.error('Enrollment failed', {
        description: typeof e === 'string' ? e : (e as Error)?.message,
      })
    } finally {
      setBusy(false)
    }
  }, [recording, name, cleanupCapture, refreshStatus, onDone])

  const clearEnrollment = useCallback(async () => {
    setBusy(true)
    try {
      await invoke('voice_clear')
      toast.message('Voiceprint deleted')
      await refreshStatus()
    } catch (e) {
      toast.error('Could not delete voiceprint', {
        description: typeof e === 'string' ? e : (e as Error)?.message,
      })
    } finally {
      setBusy(false)
    }
  }, [refreshStatus])

  const canRecord = consent && !busy && !downloadingModel && !recording

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Enroll your voice</h2>
      </div>

      {enrolled ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Enrolled as <strong>{enrolled.name}</strong> ·{' '}
          {new Date(enrolled.enrolled_at).toLocaleDateString()}
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-600">
          Record a short sample so Saransh can label your speech by name in meeting transcripts.
          Your voiceprint is stored only on this device.
        </p>
      )}

      <label className="mb-1 block text-xs font-medium text-gray-500">Your name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Jaswant Singh"
        disabled={recording || busy}
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
      />

      <label className="mb-4 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={recording || busy}
          className="mt-0.5"
        />
        <span>
          I consent to Saransh creating and storing a voiceprint of my voice (biometric data) on
          this device to label my speech. I can delete it at any time.
        </span>
      </label>

      {recording && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-600">Read aloud:</p>
          <p className="mt-1 text-sm italic text-gray-800">{PROMPT}</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-gray-900">
            {seconds}s <span className="text-sm font-normal text-gray-400">/ {MAX_SECONDS}s</span>
          </p>
          {seconds < MIN_SECONDS && (
            <p className="text-xs text-gray-400">keep going to at least {MIN_SECONDS}s…</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button onClick={startRecording} disabled={!canRecord}>
            {downloadingModel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Downloading model…
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> {enrolled ? 'Re-enroll' : 'Start recording'}
              </>
            )}
          </Button>
        ) : (
          <Button onClick={finishRecording} disabled={seconds < MIN_SECONDS || busy} variant="default">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            Finish &amp; enroll
          </Button>
        )}

        {enrolled && !recording && (
          <Button variant="outline" onClick={clearEnrollment} disabled={busy}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}

        {modelReady === false && !downloadingModel && !recording && (
          <span className="text-xs text-gray-400">Model (~28 MB) downloads on first use.</span>
        )}
      </div>
    </div>
  )
}
