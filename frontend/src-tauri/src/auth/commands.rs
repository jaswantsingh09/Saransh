use tauri::{AppHandle, Runtime};

use super::{clear_session, config, load_session, oauth, save_session, PublicSession};

/// Whether Google OAuth client credentials are present (env or oauth.json).
/// The login screen uses this to show a helpful message when unconfigured.
#[tauri::command]
pub async fn auth_is_configured<R: Runtime>(app: AppHandle<R>) -> bool {
    config::is_configured(&app)
}

/// Return the current valid session (token-free), or null if none / expired.
#[tauri::command]
pub async fn auth_get_session<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Option<PublicSession>, String> {
    let Some(session) = load_session(&app) else {
        return Ok(None);
    };
    if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(&session.expires_at) {
        if exp.with_timezone(&chrono::Utc) < chrono::Utc::now() {
            log::info!("Auth session expired for {}", session.email);
            clear_session(&app);
            return Ok(None);
        }
    }
    Ok(Some(session.public()))
}

/// Run the interactive Google sign-in and, on success, persist the session.
#[tauri::command]
pub async fn auth_start_login<R: Runtime>(app: AppHandle<R>) -> Result<PublicSession, String> {
    let cfg = config::load(&app).ok_or_else(|| {
        "Google sign-in is not configured (missing client credentials).".to_string()
    })?;

    let session = oauth::run_login(&cfg).await.map_err(|e| e.to_string())?;
    save_session(&app, &session)?;
    log::info!("Auth session granted for {}", session.email);
    Ok(session.public())
}

/// Clear the local session (sign out).
#[tauri::command]
pub async fn auth_logout<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    clear_session(&app);
    Ok(())
}
