use std::env;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

/// Default org domain users must belong to. Override with GOOGLE_OAUTH_ALLOWED_DOMAIN.
pub const DEFAULT_ALLOWED_DOMAIN: &str = "intelligaia.com";

/// How long a local session stays valid before re-login is required.
pub const SESSION_TTL_DAYS: i64 = 30;

/// OAuth scopes: identity + read-only access to the user's calendar events.
pub const OAUTH_SCOPE: &str =
    "openid email profile https://www.googleapis.com/auth/calendar.events.readonly";

#[derive(Clone)]
pub struct OAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub allowed_domain: String,
}

pub fn allowed_domain() -> String {
    env::var("GOOGLE_OAUTH_ALLOWED_DOMAIN")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_ALLOWED_DOMAIN.to_string())
}

fn env_creds() -> Option<(String, String)> {
    let id = env::var("GOOGLE_OAUTH_CLIENT_ID").ok().filter(|s| !s.trim().is_empty())?;
    let secret = env::var("GOOGLE_OAUTH_CLIENT_SECRET").ok().filter(|s| !s.trim().is_empty())?;
    Some((id, secret))
}

/// Load OAuth client credentials. Prefers env vars (set when launching the app);
/// falls back to an `oauth.json` store file in the app config dir so installed
/// builds can be configured without env vars.
pub fn load<R: Runtime>(app: &AppHandle<R>) -> Option<OAuthConfig> {
    if let Some((client_id, client_secret)) = env_creds() {
        return Some(OAuthConfig { client_id, client_secret, allowed_domain: allowed_domain() });
    }

    let store = app.store("oauth.json").ok()?;
    let client_id = store
        .get("client_id")
        .and_then(|v| v.as_str().map(str::to_string))
        .filter(|s| !s.trim().is_empty())?;
    let client_secret = store
        .get("client_secret")
        .and_then(|v| v.as_str().map(str::to_string))
        .filter(|s| !s.trim().is_empty())?;
    Some(OAuthConfig { client_id, client_secret, allowed_domain: allowed_domain() })
}

pub fn is_configured<R: Runtime>(app: &AppHandle<R>) -> bool {
    load(app).is_some()
}
