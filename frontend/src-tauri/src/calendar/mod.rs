// Google Calendar integration — lists the signed-in user's upcoming video
// meetings (events with a Google Meet / conference link). Read-only; uses the
// access token persisted by the auth module (auth/oauth.rs).

pub mod commands;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start: String, // RFC3339
    pub end: String,   // RFC3339
    pub meet_link: String,
    pub html_link: String,
    pub location: String,
    pub organizer: String,
    pub attendee_count: u32,
}
