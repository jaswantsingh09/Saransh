use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// A stored voiceprint: an enrolled person's speaker embedding + metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Voiceprint {
    pub name: String,
    pub embedding: Vec<f32>,
    pub model_id: String,
    pub enrolled_at: String,
    /// Explicit consent captured at enrollment (biometric data).
    pub consent: bool,
}

#[derive(Debug, Serialize)]
pub struct IdentifyMatch {
    pub name: String,
    pub score: f32,
}

#[derive(Debug, Serialize)]
pub struct EnrollmentInfo {
    pub name: String,
    pub enrolled_at: String,
    pub model_id: String,
}

const STORE_FILE: &str = "voiceprints.json";
/// Speaker-embedding model, resolved under <app_data>/models/voice/.
const MODEL_FILE: &str = "speaker-embedding.onnx";
/// WeSpeaker CAM++ (VoxCeleb) speaker-embedding model, ~28 MB. Speaker
/// embeddings model voice timbre (not language), so this works multilingually.
const MODEL_URL: &str = "https://huggingface.co/csukuangfj/speaker-embedding-models/resolve/main/wespeaker_en_voxceleb_CAM++.onnx";
/// Pyannote speaker-segmentation model (~6 MB), used for diarization.
const SEG_FILE: &str = "segmentation.onnx";
const SEG_URL: &str =
    "https://huggingface.co/csukuangfj/sherpa-onnx-pyannote-segmentation-3-0/resolve/main/model.onnx";
/// Cosine similarity at/above which two voiceprints are the same speaker.
const SIMILARITY_THRESHOLD: f32 = 0.5;

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.join(STORE_FILE))
}

fn voice_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.join("models").join("voice"))
}

fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    let p = voice_dir(app)?.join(MODEL_FILE);
    if !p.exists() {
        return Err(format!(
            "Voice model not found at {} — it needs to be downloaded first.",
            p.display()
        ));
    }
    Ok(p)
}

fn seg_model_path(app: &AppHandle) -> Result<PathBuf, String> {
    let p = voice_dir(app)?.join(SEG_FILE);
    if !p.exists() {
        return Err(format!(
            "Segmentation model not found at {} — it needs to be downloaded first.",
            p.display()
        ));
    }
    Ok(p)
}

fn load_prints(app: &AppHandle) -> Vec<Voiceprint> {
    let Ok(path) = store_path(app) else {
        return Vec::new();
    };
    let Ok(bytes) = std::fs::read(&path) else {
        return Vec::new();
    };
    serde_json::from_slice(&bytes).unwrap_or_default()
}

fn save_prints(app: &AppHandle, prints: &[Voiceprint]) -> Result<(), String> {
    let path = store_path(app)?;
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let json = serde_json::to_vec_pretty(prints).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

fn cosine(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mut dot = 0.0f32;
    let mut na = 0.0f32;
    let mut nb = 0.0f32;
    for i in 0..a.len() {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if na == 0.0 || nb == 0.0 {
        return 0.0;
    }
    dot / (na.sqrt() * nb.sqrt())
}

/// Compute a speaker embedding from raw mono f32 samples via sherpa-onnx.
#[cfg(target_os = "windows")]
fn compute_embedding(
    app: &AppHandle,
    samples: Vec<f32>,
    sample_rate: u32,
) -> Result<Vec<f32>, String> {
    use sherpa_rs::speaker_id::{EmbeddingExtractor, ExtractorConfig};

    let model = model_path(app)?;
    let config = ExtractorConfig {
        model: model.to_string_lossy().to_string(),
        provider: None,
        num_threads: Some(1),
        debug: false,
    };
    let mut extractor = EmbeddingExtractor::new(config).map_err(|e| e.to_string())?;
    extractor
        .compute_speaker_embedding(samples, sample_rate)
        .map_err(|e| e.to_string())
}

#[cfg(not(target_os = "windows"))]
fn compute_embedding(
    _app: &AppHandle,
    _samples: Vec<f32>,
    _sample_rate: u32,
) -> Result<Vec<f32>, String> {
    Err("Voice enrollment is currently only available on Windows.".to_string())
}

/// Enroll (or re-enroll) the owner's voice. `consent` must be true.
#[tauri::command]
pub async fn voice_enroll(
    app: AppHandle,
    name: String,
    samples: Vec<f32>,
    sample_rate: u32,
    consent: bool,
) -> Result<(), String> {
    if !consent {
        return Err("Voice enrollment requires consent.".to_string());
    }
    if samples.len() < sample_rate as usize {
        return Err("Not enough audio to enroll (need at least ~1s of speech).".to_string());
    }
    let embedding = compute_embedding(&app, samples, sample_rate)?;

    let print = Voiceprint {
        name,
        embedding,
        model_id: MODEL_FILE.to_string(),
        enrolled_at: chrono::Utc::now().to_rfc3339(),
        consent: true,
    };
    // Phase 1: single local owner — replace any existing enrollment.
    save_prints(&app, std::slice::from_ref(&print))?;
    log::info!("Voice enrolled for \"{}\"", print.name);
    Ok(())
}

/// Identify the speaker of `samples` against enrolled voiceprints.
#[tauri::command]
pub async fn voice_identify(
    app: AppHandle,
    samples: Vec<f32>,
    sample_rate: u32,
) -> Result<Option<IdentifyMatch>, String> {
    let prints = load_prints(&app);
    if prints.is_empty() {
        return Ok(None);
    }
    let embedding = compute_embedding(&app, samples, sample_rate)?;

    let mut best: Option<IdentifyMatch> = None;
    for p in &prints {
        let score = cosine(&embedding, &p.embedding);
        if score >= SIMILARITY_THRESHOLD
            && best.as_ref().map(|b| score > b.score).unwrap_or(true)
        {
            best = Some(IdentifyMatch {
                name: p.name.clone(),
                score,
            });
        }
    }
    Ok(best)
}

/// Is the owner enrolled? Returns their enrollment info if so.
#[tauri::command]
pub async fn voice_status(app: AppHandle) -> Result<Option<EnrollmentInfo>, String> {
    Ok(load_prints(&app).into_iter().next().map(|p| EnrollmentInfo {
        name: p.name,
        enrolled_at: p.enrolled_at,
        model_id: p.model_id,
    }))
}

/// Whether both voice models (embedding + segmentation) are present locally.
#[tauri::command]
pub async fn voice_model_ready(app: AppHandle) -> Result<bool, String> {
    Ok(model_path(&app).is_ok() && seg_model_path(&app).is_ok())
}

fn download_file(url: &str, dest: &std::path::Path) -> Result<(), String> {
    if dest.exists() {
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    log::info!("Downloading voice model from {}…", url);
    let resp = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?
        .get(url)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Model download failed: HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().map_err(|e| e.to_string())?;
    if bytes.len() < 1_000_000 {
        return Err("Downloaded model is too small — likely an error page.".to_string());
    }
    let tmp = dest.with_extension("part");
    std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, dest).map_err(|e| e.to_string())?;
    log::info!("Voice model saved -> {} ({} bytes)", dest.display(), bytes.len());
    Ok(())
}

/// Download the speaker-embedding + segmentation models if not already present.
#[tauri::command]
pub async fn voice_ensure_model(app: AppHandle) -> Result<(), String> {
    let dir = voice_dir(&app)?;
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        download_file(MODEL_URL, &dir.join(MODEL_FILE))?;
        download_file(SEG_URL, &dir.join(SEG_FILE))?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// A diarized speaker turn, named if it matches an enrolled voiceprint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabeledSegment {
    pub start: f32,
    pub end: f32,
    /// Cluster id from diarization (0-based).
    pub speaker: i32,
    /// Enrolled person's name, or "Speaker N" if unknown.
    pub name: String,
}

/// Diarization results are persisted next to the recording as `speakers.json`
/// so the meeting-review UI can label transcript segments by speaker.
const SPEAKERS_FILE: &str = "speakers.json";

/// Write labeled segments to `speakers.json` in the same folder as `audio_path`.
fn save_speakers(audio_path: &str, segments: &[LabeledSegment]) {
    let Some(dir) = std::path::Path::new(audio_path).parent() else {
        return;
    };
    let path = dir.join(SPEAKERS_FILE);
    match serde_json::to_vec_pretty(segments) {
        Ok(json) => {
            if let Err(e) = std::fs::write(&path, json) {
                log::warn!("Failed to persist speakers.json: {}", e);
            } else {
                log::info!("Persisted {} labeled segment(s) -> {}", segments.len(), path.display());
            }
        }
        Err(e) => log::warn!("Failed to serialize speakers: {}", e),
    }
}

/// Load persisted speaker labels for a meeting folder. Returns an empty vec if
/// diarization never ran (no `speakers.json`) — callers treat that as "no labels".
#[tauri::command]
pub async fn voice_load_speakers(folder_path: String) -> Result<Vec<LabeledSegment>, String> {
    let path = std::path::Path::new(&folder_path).join(SPEAKERS_FILE);
    match std::fs::read(&path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        Err(_) => Ok(Vec::new()),
    }
}

/// Diarize a recording and label each speaker — naming any cluster that matches
/// an enrolled voiceprint, otherwise "Speaker N". Runs offline on the saved file.
#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn voice_diarize_label(
    app: AppHandle,
    audio_path: String,
) -> Result<Vec<LabeledSegment>, String> {
    use sherpa_rs::diarize::{Diarize, DiarizeConfig};
    use sherpa_rs::speaker_id::{EmbeddingExtractor, ExtractorConfig};
    use std::collections::BTreeMap;

    let seg = seg_model_path(&app)?;
    let emb = model_path(&app)?;
    let prints = load_prints(&app);

    tokio::task::spawn_blocking(move || -> Result<Vec<LabeledSegment>, String> {
        let out_path = audio_path.clone();
        // Decode to 16 kHz mono — what the diarizer expects.
        let decoded = crate::audio::decoder::decode_audio_file(std::path::Path::new(&audio_path))
            .map_err(|e| format!("Failed to decode audio: {}", e))?;
        let samples = decoded.to_whisper_format();
        if samples.is_empty() {
            return Ok(Vec::new());
        }

        // Diarize: num_clusters = -1 lets the threshold decide the speaker count.
        let mut diar = Diarize::new(
            seg.as_path(),
            emb.as_path(),
            DiarizeConfig {
                // num_clusters = -1 → let the threshold decide the speaker count.
                num_clusters: Some(-1),
                threshold: Some(0.5),
                ..Default::default()
            },
        )
        .map_err(|e| e.to_string())?;
        let segments = diar.compute(samples.clone(), None).map_err(|e| e.to_string())?;
        if segments.is_empty() {
            return Ok(Vec::new());
        }

        // Group segment time-ranges per cluster.
        let mut ranges: BTreeMap<i32, Vec<(f32, f32)>> = BTreeMap::new();
        for s in &segments {
            ranges.entry(s.speaker).or_default().push((s.start, s.end));
        }

        // Name each cluster by matching a representative embedding (up to ~10s of
        // its speech) against enrolled voiceprints.
        let mut names: BTreeMap<i32, String> = BTreeMap::new();
        if !prints.is_empty() {
            let mut extractor = EmbeddingExtractor::new(ExtractorConfig {
                model: emb.to_string_lossy().to_string(),
                provider: None,
                num_threads: Some(1),
                debug: false,
            })
            .map_err(|e| e.to_string())?;

            for (spk, segs) in &ranges {
                let mut buf: Vec<f32> = Vec::new();
                for (st, en) in segs {
                    let a = (*st * 16000.0) as usize;
                    let b = ((*en * 16000.0) as usize).min(samples.len());
                    if a < b {
                        buf.extend_from_slice(&samples[a..b]);
                    }
                    if buf.len() >= 16000 * 10 {
                        break;
                    }
                }
                if buf.len() < 16000 / 2 {
                    continue; // too little speech to identify
                }
                if let Ok(embedding) = extractor.compute_speaker_embedding(buf, 16000) {
                    let mut best: Option<(f32, String)> = None;
                    for p in &prints {
                        let score = cosine(&embedding, &p.embedding);
                        if score >= SIMILARITY_THRESHOLD
                            && best.as_ref().map(|b| score > b.0).unwrap_or(true)
                        {
                            best = Some((score, p.name.clone()));
                        }
                    }
                    if let Some((_, name)) = best {
                        names.insert(*spk, name);
                    }
                }
            }
        }

        let labeled: Vec<LabeledSegment> = segments
            .into_iter()
            .map(|s| LabeledSegment {
                start: s.start,
                end: s.end,
                speaker: s.speaker,
                name: names
                    .get(&s.speaker)
                    .cloned()
                    .unwrap_or_else(|| format!("Speaker {}", s.speaker + 1)),
            })
            .collect();
        // Persist next to the recording so the review UI can label transcripts.
        save_speakers(&out_path, &labeled);
        Ok(labeled)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn voice_diarize_label(
    _app: AppHandle,
    _audio_path: String,
) -> Result<Vec<LabeledSegment>, String> {
    Err("Diarization is currently only available on Windows.".to_string())
}

/// Delete all enrolled voiceprints (right-to-be-forgotten).
#[tauri::command]
pub async fn voice_clear(app: AppHandle) -> Result<(), String> {
    let path = store_path(&app)?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
