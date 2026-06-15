use serde::Deserialize;
use tauri::{AppHandle, Runtime};

use super::CalendarEvent;
use crate::auth::oauth;

const EVENTS_URL: &str = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

#[derive(Deserialize)]
struct EventsResponse {
    #[serde(default)]
    items: Vec<GEvent>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GEvent {
    #[serde(default)]
    id: String,
    summary: Option<String>,
    start: Option<TimePoint>,
    end: Option<TimePoint>,
    hangout_link: Option<String>,
    html_link: Option<String>,
    location: Option<String>,
    organizer: Option<Person>,
    attendees: Option<Vec<Person>>,
    conference_data: Option<ConferenceData>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TimePoint {
    date_time: Option<String>, // timed events
    date: Option<String>,      // all-day events
}

#[derive(Deserialize)]
struct Person {
    email: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConferenceData {
    entry_points: Option<Vec<EntryPoint>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntryPoint {
    entry_point_type: Option<String>, // "video" | "phone" | ...
    uri: Option<String>,
}

/// List upcoming video meetings (next 7 days) from the user's primary calendar.
/// Errors with "CALENDAR_REAUTH" / "NOT_AUTHENTICATED" so the UI can prompt sign-in.
#[tauri::command]
pub async fn calendar_get_upcoming_meetings<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Vec<CalendarEvent>, String> {
    let token = oauth::valid_access_token(&app).await.map_err(|e| {
        let m = e.to_string();
        if m.contains("CALENDAR_REAUTH") {
            "CALENDAR_REAUTH".to_string()
        } else if m.contains("NOT_AUTHENTICATED") {
            "NOT_AUTHENTICATED".to_string()
        } else {
            m
        }
    })?;

    let now = chrono::Utc::now();
    let time_min = now.to_rfc3339();
    let time_max = (now + chrono::Duration::days(7)).to_rfc3339();

    let resp = reqwest::Client::new()
        .get(EVENTS_URL)
        .bearer_auth(&token)
        .query(&[
            ("timeMin", time_min.as_str()),
            ("timeMax", time_max.as_str()),
            ("singleEvents", "true"),
            ("orderBy", "startTime"),
            ("maxResults", "25"),
        ])
        .send()
        .await
        .map_err(|e| format!("Calendar request failed: {}", e))?;

    let status = resp.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err("CALENDAR_REAUTH".to_string());
    }
    if !status.is_success() {
        return Err(format!(
            "Calendar API {}: {}",
            status,
            resp.text().await.unwrap_or_default()
        ));
    }

    let data: EventsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Could not parse calendar response: {}", e))?;

    let pick_time = |t: &Option<TimePoint>| -> String {
        t.as_ref()
            .and_then(|tp| tp.date_time.clone().or_else(|| tp.date.clone()))
            .unwrap_or_default()
    };

    let mut events = Vec::new();
    for ev in data.items {
        // Only video meetings: a Meet hangoutLink or a "video" conference entry point.
        let meet_link = ev.hangout_link.clone().or_else(|| {
            ev.conference_data.as_ref().and_then(|cd| {
                cd.entry_points.as_ref().and_then(|eps| {
                    eps.iter()
                        .find(|e| e.entry_point_type.as_deref() == Some("video"))
                        .and_then(|e| e.uri.clone())
                })
            })
        });
        let Some(meet_link) = meet_link else {
            continue;
        };

        events.push(CalendarEvent {
            id: ev.id,
            title: ev.summary.unwrap_or_else(|| "(no title)".to_string()),
            start: pick_time(&ev.start),
            end: pick_time(&ev.end),
            meet_link,
            html_link: ev.html_link.unwrap_or_default(),
            location: ev.location.unwrap_or_default(),
            organizer: ev.organizer.and_then(|p| p.email).unwrap_or_default(),
            attendee_count: ev.attendees.map(|a| a.len() as u32).unwrap_or(0),
        });
    }

    Ok(events)
}
