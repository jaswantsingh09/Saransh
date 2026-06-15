import { invoke } from '@tauri-apps/api/core'

export interface UpcomingMeeting {
  id: string
  title: string
  start: string // RFC3339
  end: string
  meet_link: string
  html_link: string
  location: string
  organizer: string
  attendee_count: number
}

export const calendarService = {
  getUpcomingMeetings(): Promise<UpcomingMeeting[]> {
    return invoke<UpcomingMeeting[]>('calendar_get_upcoming_meetings')
  },
}
