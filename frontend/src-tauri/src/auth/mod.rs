// Google OAuth login gate — restricts the app to @intelligaia.com accounts.
// The OAuth flow runs entirely in Rust + the system browser (loopback + PKCE),
// so nothing touches the webview and no CSP changes are needed.
//
// We also keep the Google access/refresh tokens so features like the Calendar
// integration can call Google APIs on the user's behalf. Tokens live in
// auth.json and are never sent to the webview (see PublicSession).

pub mod commands;
pub mod config;
pub mod oauth;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

pub const STORE_FILE: &str = "auth.json";

/// A locally-granted session after a domain-verified Google sign-in, including
/// the Google tokens used for Calendar API access. Token fields default to empty
/// so sessions written before the calendar feature still deserialize.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub email: String,
    pub name: String,
    pub picture: String,
    pub authorized_at: String, // RFC3339
    pub expires_at: String,    // RFC3339 — local session validity
    #[serde(default)]
    pub access_token: String,
    #[serde(default)]
    pub refresh_token: String,
    #[serde(default)]
    pub token_expiry: String, // RFC3339 — Google access-token expiry
}

/// What the webview is allowed to see — no tokens.
#[derive(Debug, Clone, Serialize)]
pub struct PublicSession {
    pub email: String,
    pub name: String,
    pub picture: String,
    pub authorized_at: String,
    pub expires_at: String,
}

impl Session {
    pub fn public(&self) -> PublicSession {
        PublicSession {
            email: self.email.clone(),
            name: self.name.clone(),
            picture: self.picture.clone(),
            authorized_at: self.authorized_at.clone(),
            expires_at: self.expires_at.clone(),
        }
    }
}

pub fn load_session<R: Runtime>(app: &AppHandle<R>) -> Option<Session> {
    let store = app.store(STORE_FILE).ok()?;
    let value = store.get("session")?;
    serde_json::from_value(value.clone()).ok()
}

pub fn save_session<R: Runtime>(app: &AppHandle<R>, session: &Session) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(
        "session",
        serde_json::to_value(session).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())
}

pub fn clear_session<R: Runtime>(app: &AppHandle<R>) {
    if let Ok(store) = app.store(STORE_FILE) {
        store.delete("session");
        let _ = store.save();
    }
}
