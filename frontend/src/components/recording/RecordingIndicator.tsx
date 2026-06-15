'use client'

import { Loader2, Square } from 'lucide-react'
import { useMeetingRecording } from '@/contexts/MeetingRecordingContext'

/**
 * Floating "● Recording — Stop" pill shown whenever a meeting recording (started
 * from the calendar Join action) is active. Rendered globally in the layout.
 */
export function RecordingIndicator() {
  const { active, processing, title, stop } = useMeetingRecording()

  if (!active && !processing) return null

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-full border border-red-200 bg-white px-4 py-2 shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span className="max-w-[220px] truncate text-sm font-medium text-gray-800">
        {!active && processing ? 'Saving recording…' : `Recording${title ? ` · ${title}` : ''}`}
      </span>
      {active && (
        <button
          onClick={() => stop()}
          disabled={processing}
          className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
          Stop
        </button>
      )}
    </div>
  )
}
