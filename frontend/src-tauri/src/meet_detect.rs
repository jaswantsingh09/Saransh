//! Passive Google Meet detection.
//!
//! The frontend polls [`meet_detect_scan`] every few seconds. When the user is
//! in a Google Meet, one of the browser windows carries a tell-tale title — a
//! meeting code (`abc-defg-hij`) or a named meeting (`Meet - Team Standup`).
//! We surface that so the UI can offer to start transcription automatically.
//!
//! This is title-based heuristics only: it can't perfectly tell the green-room
//! lobby from an active call, which is why the frontend *prompts* rather than
//! silently recording. Windows-only (matches screen-capture / Voice ID); other
//! platforms return `None`.

use serde::{Deserialize, Serialize};

/// A detected Google Meet window.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetWindow {
    /// The meeting code (`abc-defg-hij`) or meeting name we parsed from the
    /// window title. Used both as a stable key (so we prompt once per meeting)
    /// and as the human-facing label.
    pub code: String,
    /// The raw window title the match came from (for logging/diagnostics).
    pub title: String,
}

/// Browser window-title suffixes to strip before parsing a meeting name.
const BROWSER_SUFFIXES: &[&str] = &[
    " - Google Chrome",
    " - Chromium",
    " - Microsoft\u{200b} Edge", // Edge injects a zero-width space
    " - Microsoft Edge",
    " - Brave",
    " \u{2014} Mozilla Firefox",
    " - Mozilla Firefox",
    " - Opera",
];

/// Strip a trailing browser identifier from a window title, if present.
fn strip_browser_suffix(title: &str) -> &str {
    for suffix in BROWSER_SUFFIXES {
        if let Some(head) = title.strip_suffix(suffix) {
            return head.trim_end();
        }
    }
    title.trim_end()
}

/// Find a Google Meet code (`xxx-yyyy-zzz`, all lowercase ASCII letters)
/// anywhere in `title`, bounded so it isn't part of a longer token.
///
/// Works on raw bytes: meeting codes are ASCII, and any multi-byte UTF-8 byte
/// is `>= 0x80`, so it never matches a letter or `-`.
fn find_meet_code(title: &str) -> Option<String> {
    let b = title.as_bytes();
    let n = b.len();
    let is_l = |c: u8| c.is_ascii_lowercase();
    let mut i = 0usize;
    while i + 12 <= n {
        let w = &b[i..i + 12];
        let shaped = is_l(w[0])
            && is_l(w[1])
            && is_l(w[2])
            && w[3] == b'-'
            && is_l(w[4])
            && is_l(w[5])
            && is_l(w[6])
            && is_l(w[7])
            && w[8] == b'-'
            && is_l(w[9])
            && is_l(w[10])
            && is_l(w[11]);
        if shaped {
            let before_ok = i == 0 || !b[i - 1].is_ascii_alphanumeric() && b[i - 1] != b'-';
            let after_ok =
                i + 12 == n || !b[i + 12].is_ascii_alphanumeric() && b[i + 12] != b'-';
            if before_ok && after_ok {
                return Some(String::from_utf8_lossy(w).into_owned());
            }
        }
        i += 1;
    }
    None
}

/// Extract a Meet identifier from a window title, or `None` if the title isn't
/// an in-meeting Google Meet window.
///
/// Two shapes are accepted:
///   1. A meeting code anywhere in the title (highest confidence).
///   2. `Meet - <name>` / `Meet – <name>` for named meetings — but not the bare
///      "Google Meet" landing page, which has no name after "Meet".
fn parse_meet(title: &str) -> Option<String> {
    if let Some(code) = find_meet_code(title) {
        return Some(code);
    }

    let t = strip_browser_suffix(title);
    // A Meet tab title is "Meet<sep><name>"; the sep is a hyphen/en/em dash.
    // Also tolerate a leading unread-count badge like "(3) Meet - ...".
    let head = t.trim_start_matches(|c: char| c == '(' || c.is_ascii_digit() || c == ')' || c == ' ');
    for sep in [" - ", " \u{2013} ", " \u{2014} "] {
        if let Some(rest) = head.strip_prefix("Meet") {
            if let Some(name) = rest.strip_prefix(sep) {
                let name = name.trim();
                // Reject the landing page ("Google Meet") and empty names.
                if !name.is_empty() && !name.eq_ignore_ascii_case("Google") {
                    return Some(name.to_string());
                }
            }
        }
    }
    None
}

/// Scan open windows for a Google Meet the user appears to be in.
///
/// Returns the first match (there is rarely more than one). `None` means no
/// Meet window is currently open, or the only Meet tab is the landing page.
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn meet_detect_scan() -> Option<MeetWindow> {
    use windows_capture::window::Window;

    let wins = Window::enumerate().unwrap_or_default();
    for w in wins {
        if !w.is_valid() {
            continue;
        }
        let Ok(title) = w.title() else { continue };
        if let Some(code) = parse_meet(&title) {
            return Some(MeetWindow { code, title });
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn meet_detect_scan() -> Option<MeetWindow> {
    // Window-title detection is Windows-only for now.
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_meeting_code() {
        assert_eq!(
            parse_meet("Meet - abc-defg-hij - Google Chrome").as_deref(),
            Some("abc-defg-hij")
        );
        assert_eq!(
            parse_meet("abc-defg-hij").as_deref(),
            Some("abc-defg-hij")
        );
    }

    #[test]
    fn detects_named_meeting() {
        assert_eq!(
            parse_meet("Meet - Team Standup - Google Chrome").as_deref(),
            Some("Team Standup")
        );
        assert_eq!(
            parse_meet("(3) Meet \u{2013} Team Standup \u{2014} Mozilla Firefox").as_deref(),
            Some("Team Standup")
        );
    }

    #[test]
    fn ignores_landing_page_and_unrelated() {
        assert_eq!(parse_meet("Google Meet - Google Chrome"), None);
        assert_eq!(parse_meet("Meet - Google Chrome"), None);
        assert_eq!(parse_meet("Inbox (12) - Gmail - Google Chrome"), None);
        assert_eq!(parse_meet("some-random-word here"), None);
    }
}
