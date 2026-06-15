'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Users,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMeetingRecording } from '@/contexts/MeetingRecordingContext'
import { calendarService, type UpcomingMeeting } from '@/services/calendarService'

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Scheduled'
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export function UpcomingMeetings() {
  const { login } = useAuth()
  const recording = useMeetingRecording()
  const [events, setEvents] = useState<UpcomingMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await calendarService.getUpcomingMeetings())
    } catch (e) {
      setError(typeof e === 'string' ? e : (e as Error)?.message ?? 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const needsReauth = error === 'CALENDAR_REAUTH' || error === 'NOT_AUTHENTICATED'

  // group by day, preserving start order
  const groups: { label: string; items: UpcomingMeeting[] }[] = []
  for (const ev of events) {
    const label = dayLabel(ev.start)
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(ev)
    else groups.push({ label, items: [ev] })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Upcoming meetings</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : needsReauth ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <CalendarIcon className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            Saransh needs permission to read your Google Calendar.
          </p>
          <Button className="mt-4" onClick={() => login()}>
            Connect Google Calendar
          </Button>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <Video className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm">No upcoming video meetings in the next 7 days.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {g.label}
              </h2>
              <div className="space-y-2">
                {g.items.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-900">{m.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {fmtTime(m.start)}
                            {m.end && ` – ${fmtTime(m.end)}`}
                          </span>
                          {m.attendee_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {m.attendee_count}
                            </span>
                          )}
                          {m.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3.5 w-3.5" />
                              {m.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => recording.start(m.title, m.meet_link, m.end)}
                          disabled={recording.active || recording.processing}
                        >
                          <Video className="h-4 w-4" />
                          Join &amp; record
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
