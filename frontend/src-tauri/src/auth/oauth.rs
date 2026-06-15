use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::Rng;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use tauri::{AppHandle, Runtime};

use super::config::{OAuthConfig, OAUTH_SCOPE, SESSION_TTL_DAYS};
use super::Session;

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const TOKENINFO_URL: &str = "https://oauth2.googleapis.com/tokeninfo";

// PKCE / state use the unreserved URL-safe alphabet.
const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

fn random_string(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char)
        .collect()
}

fn pkce_challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

#[derive(Deserialize)]
struct TokenResponse {
    id_token: String,
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(default)]
    expires_in: i64,
}

#[derive(Deserialize)]
struct TokenInfo {
    aud: String,
    email: Option<String>,
    email_verified: Option<String>, // tokeninfo returns "true"/"false" as a string
    hd: Option<String>,
    name: Option<String>,
    picture: Option<String>,
}

/// Run the full interactive login: open browser → loopback capture → token
/// exchange → validate → domain check. Returns a verified Session or an error
/// (the error string is shown to the user).
pub async fn run_login(cfg: &OAuthConfig) -> Result<Session> {
    let verifier = random_string(64);
    let challenge = pkce_challenge(&verifier);
    let state = random_string(32);

    // One-shot loopback listener on an ephemeral port (allowed for Desktop OAuth clients).
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| anyhow!("Failed to start local listener: {}", e))?;
    let port = listener.local_addr()?.port();
    let redirect_uri = format!("http://127.0.0.1:{}", port);

    let mut auth_url = url::Url::parse(AUTH_URL)?;
    auth_url
        .query_pairs_mut()
        .append_pair("client_id", &cfg.client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", OAUTH_SCOPE)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state)
        .append_pair("hd", &cfg.allowed_domain)
        .append_pair("access_type", "offline") // request a refresh token
        .append_pair("prompt", "consent"); // ensure refresh token is returned

    open::that(auth_url.as_str()).map_err(|e| anyhow!("Failed to open browser: {}", e))?;

    let (code, got_state) = tokio::time::timeout(Duration::from_secs(300), accept_redirect(listener))
        .await
        .map_err(|_| anyhow!("Login timed out — please try again."))??;

    if got_state != state {
        return Err(anyhow!("State mismatch — sign-in aborted for safety."));
    }

    let client = reqwest::Client::new();
    let token: TokenResponse = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", cfg.client_id.as_str()),
            ("client_secret", cfg.client_secret.as_str()),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .await
        .map_err(|e| anyhow!("Token request failed: {}", e))?
        .error_for_status()
        .map_err(|e| anyhow!("Token exchange failed: {}", e))?
        .json()
        .await
        .map_err(|e| anyhow!("Could not parse token response: {}", e))?;

    let info: TokenInfo = client
        .get(TOKENINFO_URL)
        .query(&[("id_token", token.id_token.as_str())])
        .send()
        .await
        .map_err(|e| anyhow!("Token validation request failed: {}", e))?
        .error_for_status()
        .map_err(|e| anyhow!("Token validation failed: {}", e))?
        .json()
        .await
        .map_err(|e| anyhow!("Could not parse token info: {}", e))?;

    // Authoritative verification (the `hd` request param is only a hint).
    if info.aud != cfg.client_id {
        return Err(anyhow!("Token audience mismatch."));
    }
    let email = info.email.clone().ok_or_else(|| anyhow!("No email returned by Google."))?;
    if info.email_verified.as_deref() != Some("true") {
        return Err(anyhow!("Your Google email is not verified."));
    }
    let domain = cfg.allowed_domain.to_lowercase();
    let domain_ok = info.hd.as_deref().map(str::to_lowercase) == Some(domain.clone())
        || email.to_lowercase().ends_with(&format!("@{}", domain));
    if !domain_ok {
        return Err(anyhow!("Only @{} accounts can sign in.", cfg.allowed_domain));
    }

    let now = chrono::Utc::now();
    let expires = now + chrono::Duration::days(SESSION_TTL_DAYS);
    let token_expiry = now + chrono::Duration::seconds(token.expires_in.max(0));
    Ok(Session {
        email,
        name: info.name.unwrap_or_default(),
        picture: info.picture.unwrap_or_default(),
        authorized_at: now.to_rfc3339(),
        expires_at: expires.to_rfc3339(),
        access_token: token.access_token,
        refresh_token: token.refresh_token.unwrap_or_default(),
        token_expiry: token_expiry.to_rfc3339(),
    })
}

/// Return a currently-valid Google access token, refreshing it via the stored
/// refresh token if expired. Errors with "CALENDAR_REAUTH" when re-consent is
/// required (no/invalid refresh token), and "NOT_AUTHENTICATED" when no session.
pub async fn valid_access_token<R: Runtime>(app: &AppHandle<R>) -> Result<String> {
    let mut session = super::load_session(app).ok_or_else(|| anyhow!("NOT_AUTHENTICATED"))?;

    // Still valid (with a 60s safety margin)?
    if !session.access_token.is_empty() {
        if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(&session.token_expiry) {
            if exp.with_timezone(&chrono::Utc) > chrono::Utc::now() + chrono::Duration::seconds(60) {
                return Ok(session.access_token.clone());
            }
        }
    }

    if session.refresh_token.is_empty() {
        return Err(anyhow!("CALENDAR_REAUTH"));
    }

    let cfg = super::config::load(app).ok_or_else(|| anyhow!("OAuth is not configured"))?;
    let client = reqwest::Client::new();
    let resp = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", cfg.client_id.as_str()),
            ("client_secret", cfg.client_secret.as_str()),
            ("refresh_token", session.refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| anyhow!("Token refresh request failed: {}", e))?;

    if !resp.status().is_success() {
        // refresh token revoked/expired → user must sign in again
        return Err(anyhow!("CALENDAR_REAUTH"));
    }

    #[derive(Deserialize)]
    struct Refresh {
        access_token: String,
        #[serde(default)]
        expires_in: i64,
    }
    let r: Refresh = resp
        .json()
        .await
        .map_err(|e| anyhow!("Could not parse refresh response: {}", e))?;

    session.access_token = r.access_token.clone();
    session.token_expiry =
        (chrono::Utc::now() + chrono::Duration::seconds(r.expires_in.max(0))).to_rfc3339();
    super::save_session(app, &session).map_err(|e| anyhow!("{}", e))?;
    Ok(r.access_token)
}

/// Accept connections until we get the OAuth redirect carrying `code`+`state`
/// (ignoring favicon/preflight hits). Replies with a friendly close-tab page.
async fn accept_redirect(listener: TcpListener) -> Result<(String, String)> {
    loop {
        let (mut socket, _) = listener.accept().await?;
        let mut buf = vec![0u8; 8192];
        let n = socket.read(&mut buf).await?;
        let req = String::from_utf8_lossy(&buf[..n]);
        let path = req
            .lines()
            .next()
            .and_then(|l| l.split_whitespace().nth(1))
            .unwrap_or("");

        let query = path.split_once('?').map(|(_, q)| q.to_string());
        if let Some(query) = query {
            let mut code = None;
            let mut state = None;
            let mut err = None;
            for (k, v) in url::form_urlencoded::parse(query.as_bytes()) {
                match k.as_ref() {
                    "code" => code = Some(v.into_owned()),
                    "state" => state = Some(v.into_owned()),
                    "error" => err = Some(v.into_owned()),
                    _ => {}
                }
            }
            write_page(&mut socket, err.is_none()).await;
            if let Some(e) = err {
                return Err(anyhow!("Authorization denied: {}", e));
            }
            if let (Some(c), Some(s)) = (code, state) {
                return Ok((c, s));
            }
        } else {
            let _ = socket
                .write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                .await;
        }
    }
}

async fn write_page<W: AsyncWriteExt + Unpin>(socket: &mut W, ok: bool) {
    let msg = if ok {
        "Sign-in complete. You can close this tab and return to Saransh."
    } else {
        "Sign-in failed. You can close this tab and try again in Saransh."
    };
    let body = format!(
        "<!doctype html><html><body style=\"font-family:system-ui,sans-serif;text-align:center;padding-top:80px;color:#222\"><h2>Saransh</h2><p>{}</p></body></html>",
        msg
    );
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = socket.write_all(resp.as_bytes()).await;
    let _ = socket.flush().await;
}
