// audio/transcription/yantra_stt.rs
//
// Batch speech-to-text via Yantra (intelligaia's hosted, OpenAI-compatible
// `/v1/audio/transcriptions` endpoint). Used by the retranscribe/import flow:
// the finished audio file is uploaded once and transcribed server-side, so no
// local STT model is needed. Real-time transcription still uses the local
// Parakeet/Whisper engines — Yantra is a batch-only provider.

use anyhow::{anyhow, Result};
use serde::Deserialize;
use std::path::Path;

/// Fixed hosted endpoint (same service/host/key as the Yantra summary provider).
const YANTRA_STT_URL: &str = "https://yantra-be.intelligaia.com/v1/audio/transcriptions";

/// Default model exposed by the Yantra deployment. `whisper-hinglish-preview` is
/// a Trelis fine-tune of whisper-large-v3 for Hinglish (Hindi-English
/// code-switching); it shares the same multipart request shape as whisper-medium.
pub const DEFAULT_YANTRA_STT_MODEL: &str = "whisper-hinglish-preview";

/// Encode 16 kHz mono f32 samples ([-1,1]) as an in-memory 16-bit PCM WAV.
fn encode_wav_16k_mono(samples: &[f32]) -> Vec<u8> {
    const SR: u32 = 16_000;
    let data_len = (samples.len() * 2) as u32;
    let mut buf = Vec::with_capacity(44 + samples.len() * 2);
    buf.extend_from_slice(b"RIFF");
    buf.extend_from_slice(&(36 + data_len).to_le_bytes());
    buf.extend_from_slice(b"WAVE");
    buf.extend_from_slice(b"fmt ");
    buf.extend_from_slice(&16u32.to_le_bytes()); // PCM fmt chunk size
    buf.extend_from_slice(&1u16.to_le_bytes()); // audio format = PCM
    buf.extend_from_slice(&1u16.to_le_bytes()); // channels = mono
    buf.extend_from_slice(&SR.to_le_bytes());
    buf.extend_from_slice(&(SR * 2).to_le_bytes()); // byte rate (sr * blockalign)
    buf.extend_from_slice(&2u16.to_le_bytes()); // block align (mono * 2 bytes)
    buf.extend_from_slice(&16u16.to_le_bytes()); // bits per sample
    buf.extend_from_slice(b"data");
    buf.extend_from_slice(&data_len.to_le_bytes());
    for &s in samples {
        let v = (s.clamp(-1.0, 1.0) * 32767.0) as i16;
        buf.extend_from_slice(&v.to_le_bytes());
    }
    buf
}

#[derive(Deserialize)]
struct PlainResponse {
    #[serde(default)]
    text: String,
}

/// Collapse Whisper repetition loops: runs of the same word (kept to at most 2),
/// then consecutively-repeated short phrases (2..=6 words) reduced to one copy.
/// Natural speech rarely repeats like this, so it's safe and de-loops noisy tails.
fn clean_repetitions(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.len() < 4 {
        return text.trim().to_string();
    }
    // 1) drop any token that would be the 3rd+ identical in a row
    let mut out: Vec<&str> = Vec::with_capacity(words.len());
    for w in words {
        let n = out.len();
        if n >= 2 && out[n - 1] == w && out[n - 2] == w {
            continue;
        }
        out.push(w);
    }
    // 2) collapse immediately-repeated phrases (longer phrases first)
    for plen in (2..=6).rev() {
        if out.len() < plen * 2 {
            continue;
        }
        let mut res: Vec<&str> = Vec::with_capacity(out.len());
        let mut i = 0;
        while i < out.len() {
            if i + 2 * plen <= out.len() && out[i..i + plen] == out[i + plen..i + 2 * plen] {
                res.extend_from_slice(&out[i..i + plen]); // keep one copy
                let mut j = i + plen;
                while j + plen <= out.len() && out[j..j + plen] == out[i..i + plen] {
                    j += plen; // skip further repeats
                }
                i = j;
            } else {
                res.push(out[i]);
                i += 1;
            }
        }
        out = res;
    }
    out.join(" ")
}

/// Transcribe a single VAD-bounded speech chunk (16 kHz mono f32) via Yantra.
/// Bounded chunks avoid the repetition loops the hosted Whisper model hits on
/// long, continuous whole-file uploads. Returns the chunk's text (may be empty).
pub async fn transcribe_samples(
    samples: &[f32],
    api_key: &str,
    model: &str,
    language: Option<&str>,
) -> Result<String> {
    if api_key.trim().is_empty() {
        return Err(anyhow!(
            "Yantra API key is not set. Add it in Settings → AI/Summary provider (Yantra); the same key is used for transcription."
        ));
    }
    let wav = encode_wav_16k_mono(samples);
    let part = reqwest::multipart::Part::bytes(wav)
        .file_name("chunk.wav")
        .mime_str("audio/wav")
        .map_err(|e| anyhow!("Failed to build upload part: {}", e))?;
    let mut form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .text("response_format", "json")
        .part("file", part);
    if let Some(lang) = language.map(str::trim).filter(|l| !l.is_empty() && *l != "auto") {
        form = form.text("language", lang.to_string());
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(YANTRA_STT_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| anyhow!("Yantra STT request failed: {}", e))?;
    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| anyhow!("Failed to read Yantra STT response: {}", e))?;
    if !status.is_success() {
        let snippet: String = body.chars().take(300).collect();
        return Err(anyhow!("Yantra STT returned HTTP {}: {}", status, snippet));
    }
    let parsed: PlainResponse = serde_json::from_str(&body).map_err(|e| {
        let snippet: String = body.chars().take(200).collect();
        anyhow!("Failed to parse Yantra STT response: {} — body: {}", e, snippet)
    })?;
    Ok(clean_repetitions(&parsed.text))
}

#[derive(Deserialize)]
struct VerboseSegment {
    #[serde(default)]
    start: f64,
    #[serde(default)]
    end: f64,
    #[serde(default)]
    text: String,
}

#[derive(Deserialize)]
struct VerboseResponse {
    #[serde(default)]
    duration: f64,
    #[serde(default)]
    segments: Vec<VerboseSegment>,
    #[serde(default)]
    text: String,
}

/// Upload `audio_path` to Yantra and return `(duration_seconds, segments)` where
/// each segment is `(text, start_ms, end_ms)` — the shape the retranscription
/// finalizer expects. Whisper accepts common container formats directly, so the
/// file is sent as-is (no local decode/re-encode).
pub async fn transcribe_file(
    audio_path: &Path,
    api_key: &str,
    model: &str,
    language: Option<&str>,
) -> Result<(f64, Vec<(String, f64, f64)>)> {
    if api_key.trim().is_empty() {
        return Err(anyhow!(
            "Yantra API key is not set. Add it in Settings → AI/Summary provider (Yantra); the same key is used for transcription."
        ));
    }

    let bytes = tokio::fs::read(audio_path)
        .await
        .map_err(|e| anyhow!("Failed to read audio file {}: {}", audio_path.display(), e))?;
    let file_name = audio_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.mp4")
        .to_string();

    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(file_name)
        .mime_str("application/octet-stream")
        .map_err(|e| anyhow!("Failed to build upload part: {}", e))?;
    let mut form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .text("response_format", "verbose_json")
        .part("file", part);
    // Forward an explicit language (ISO-639-1) when the user picked one; otherwise
    // let Whisper auto-detect. "auto" is treated as no hint.
    if let Some(lang) = language.map(str::trim).filter(|l| !l.is_empty() && *l != "auto") {
        form = form.text("language", lang.to_string());
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(YANTRA_STT_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| anyhow!("Yantra STT request failed: {}", e))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| anyhow!("Failed to read Yantra STT response: {}", e))?;
    if !status.is_success() {
        let snippet: String = body.chars().take(300).collect();
        return Err(anyhow!("Yantra STT returned HTTP {}: {}", status, snippet));
    }

    let parsed: VerboseResponse = serde_json::from_str(&body).map_err(|e| {
        let snippet: String = body.chars().take(200).collect();
        anyhow!("Failed to parse Yantra STT response: {} — body: {}", e, snippet)
    })?;

    let mut out: Vec<(String, f64, f64)> = Vec::new();
    if !parsed.segments.is_empty() {
        for s in parsed.segments {
            let t = s.text.trim();
            if !t.is_empty() {
                // Whisper timestamps are seconds; the finalizer wants milliseconds.
                out.push((t.to_string(), s.start * 1000.0, s.end * 1000.0));
            }
        }
    } else if !parsed.text.trim().is_empty() {
        // Server returned no segments — keep the text as one block spanning the clip.
        out.push((parsed.text.trim().to_string(), 0.0, parsed.duration * 1000.0));
    }

    Ok((parsed.duration, out))
}
