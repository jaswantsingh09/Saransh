use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;

use crate::audio::ffmpeg::find_ffmpeg_path;

#[cfg(target_os = "windows")]
use windows_capture::{
    capture::{CaptureControl, Context, GraphicsCaptureApiHandler},
    encoder::{AudioSettingsBuilder, ContainerSettingsBuilder, VideoEncoder, VideoSettingsBuilder},
    frame::Frame,
    graphics_capture_api::InternalCaptureControl,
    monitor::Monitor,
    settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
    },
    window::Window,
};

/// A window's on-screen rectangle, returned to the frontend so it can tell
/// whether the meeting window is up yet (and show "window" vs "full screen").
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowRegion {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    #[serde(default)]
    pub title: String,
}

#[cfg(target_os = "windows")]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}
#[cfg(not(target_os = "windows"))]
fn no_window(_cmd: &mut Command) {}

// ===========================================================================
// Window detection (used by the frontend to poll for the Meet window)
// ===========================================================================

/// Candidate capturable windows whose title contains `hint`, largest first.
///
/// `Window::from_contains_name` returns the *first* enumerated match regardless
/// of whether it can actually be captured — and browsers keep hidden/cloaked
/// helper windows that share the page title but fail WGC conversion. We filter
/// to valid (visible, top-level, non-tool, not our own process) windows and
/// sort biggest-first so the real browser frame is tried before any phantoms.
#[cfg(target_os = "windows")]
fn meet_windows(hint: &str) -> Vec<Window> {
    let mut wins: Vec<Window> = Window::enumerate()
        .unwrap_or_default()
        .into_iter()
        .filter(|w| w.is_valid())
        .filter(|w| w.title().map(|t| t.contains(hint)).unwrap_or(false))
        .collect();
    wins.sort_by_key(|w| {
        let area = w
            .rect()
            .map(|r| i64::from(r.right - r.left) * i64::from(r.bottom - r.top))
            .unwrap_or(0);
        std::cmp::Reverse(area)
    });
    wins
}

/// Find the on-screen rectangle of the (largest valid) window whose title
/// contains `hint` (e.g. "Meet"). Returns `None` if no such window exists yet.
/// The frontend polls this right after opening the Meet so capture starts in sync.
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn screen_find_window_region(hint: String) -> Option<WindowRegion> {
    if hint.is_empty() {
        return None;
    }
    let win = meet_windows(&hint).into_iter().next()?;
    let r = win.rect().ok()?;
    let (w, h) = (r.right - r.left, r.bottom - r.top);
    if w <= 0 || h <= 0 {
        return None;
    }
    Some(WindowRegion {
        x: r.left,
        y: r.top,
        w,
        h,
        title: win.title().unwrap_or_default(),
    })
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn screen_find_window_region(_hint: String) -> Option<WindowRegion> {
    // Per-window detection is only implemented on Windows; other platforms
    // fall back to full-screen capture.
    None
}

// ===========================================================================
// Windows: Windows Graphics Capture (compositor-based, occlusion-proof)
// ===========================================================================

#[cfg(target_os = "windows")]
struct Capture {
    encoder: Option<VideoEncoder>,
}

#[cfg(target_os = "windows")]
impl GraphicsCaptureApiHandler for Capture {
    // width, height, output path — passed through Settings::flags.
    type Flags = (u32, u32, String);
    type Error = Box<dyn std::error::Error + Send + Sync>;

    fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
        let (w, h, path) = ctx.flags;
        let encoder = VideoEncoder::new(
            VideoSettingsBuilder::new(w, h).frame_rate(30),
            AudioSettingsBuilder::default().disabled(true),
            ContainerSettingsBuilder::default(),
            &path,
        )?;
        Ok(Self {
            encoder: Some(encoder),
        })
    }

    fn on_frame_arrived(
        &mut self,
        frame: &mut Frame,
        _capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        if let Some(enc) = self.encoder.as_mut() {
            enc.send_frame(frame)?;
        }
        Ok(())
    }

    fn on_closed(&mut self) -> Result<(), Self::Error> {
        // The captured window was closed by the user — finalize the file so we
        // still get a playable MP4 even if stop() never runs.
        if let Some(enc) = self.encoder.take() {
            enc.finish()?;
        }
        Ok(())
    }
}

#[cfg(target_os = "windows")]
type WgcControl = CaptureControl<Capture, Box<dyn std::error::Error + Send + Sync>>;

/// The running WGC capture session (one at a time), Windows only.
#[cfg(target_os = "windows")]
static WGC: Lazy<Mutex<Option<WgcControl>>> = Lazy::new(|| Mutex::new(None));

#[cfg(target_os = "windows")]
fn even(v: i32) -> u32 {
    (v.max(2) as u32) & !1
}

// ~15 fps: plenty for a meeting recording, far lighter on CPU/disk than 60.
#[cfg(target_os = "windows")]
const WGC_MIN_INTERVAL: std::time::Duration = std::time::Duration::from_millis(66);

#[cfg(target_os = "windows")]
fn start_wgc_window(win: Window, out_path: &str) -> Result<WgcControl, String> {
    let r = win.rect().map_err(|e| e.to_string())?;
    let settings = Settings::new(
        win,
        CursorCaptureSettings::WithoutCursor,
        DrawBorderSettings::WithoutBorder,
        SecondaryWindowSettings::Default,
        MinimumUpdateIntervalSettings::Custom(WGC_MIN_INTERVAL),
        DirtyRegionSettings::Default,
        ColorFormat::Rgba8,
        (even(r.right - r.left), even(r.bottom - r.top), out_path.to_string()),
    );
    Capture::start_free_threaded(settings).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn start_wgc_monitor(out_path: &str) -> Result<WgcControl, String> {
    let mon = Monitor::primary().map_err(|e| e.to_string())?;
    let w = mon.width().map_err(|e| e.to_string())? as i32;
    let h = mon.height().map_err(|e| e.to_string())? as i32;
    let settings = Settings::new(
        mon,
        CursorCaptureSettings::WithCursor,
        DrawBorderSettings::WithoutBorder,
        SecondaryWindowSettings::Default,
        MinimumUpdateIntervalSettings::Custom(WGC_MIN_INTERVAL),
        DirtyRegionSettings::Default,
        ColorFormat::Rgba8,
        (even(w), even(h), out_path.to_string()),
    );
    Capture::start_free_threaded(settings).map_err(|e| e.to_string())
}

// ===========================================================================
// Commands
// ===========================================================================

/// Start recording (video only) to `out_path` (an .mp4). On Windows, if
/// `window_hint` matches a window it records just that window via Windows
/// Graphics Capture (follows the window, ignores occlusion); otherwise it
/// records the primary monitor.
#[tauri::command]
pub fn screen_record_start(
    out_path: String,
    window_hint: Option<String>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if WGC.lock().unwrap().is_some() {
            return Err("A screen recording is already in progress.".to_string());
        }
        if let Some(parent) = Path::new(&out_path).parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        // Prefer capturing just the meeting window; fall back to full screen.
        // Some title matches (cloaked browser helper windows) fail WGC
        // conversion, so try each valid candidate until one starts.
        let mut control: Option<WgcControl> = None;
        let mut mode = "monitor";
        if let Some(hint) = window_hint.as_deref().filter(|s| !s.is_empty()) {
            for win in meet_windows(hint) {
                let title = win.title().unwrap_or_default();
                match start_wgc_window(win, &out_path) {
                    Ok(c) => {
                        control = Some(c);
                        mode = "window";
                        log::info!("WGC capturing window: \"{}\"", title);
                        break;
                    }
                    Err(e) => log::warn!(
                        "WGC window \"{}\" failed ({}); trying next candidate",
                        title, e
                    ),
                }
            }
        }
        if control.is_none() {
            control = Some(start_wgc_monitor(&out_path)?);
        }

        *WGC.lock().unwrap() = control;
        log::info!("WGC screen recording started ({}) -> {}", mode, out_path);
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = &window_hint; // window capture not implemented off Windows
        screen_record_start_ffmpeg(out_path)
    }
}

/// Is a screen recording currently running?
#[tauri::command]
pub fn screen_record_active() -> bool {
    #[cfg(target_os = "windows")]
    {
        let mut g = WGC.lock().unwrap();
        match g.as_ref() {
            Some(c) if c.is_finished() => {
                *g = None;
                false
            }
            Some(_) => true,
            None => false,
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        screen_record_active_ffmpeg()
    }
}

/// Stop the screen recording and finalize the MP4.
#[tauri::command]
pub fn screen_record_stop() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let control = WGC.lock().unwrap().take();
        if let Some(control) = control {
            // Hold a handle to the encoder so we can finalize after the capture
            // thread is joined (stop() posts WM_QUIT and waits for it).
            let cb = control.callback();
            let _ = control.stop();
            let mut handler = cb.lock();
            if let Some(enc) = handler.encoder.take() {
                enc.finish().map_err(|e| e.to_string())?;
            }
        }
        log::info!("WGC screen recording stopped");
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        screen_record_stop_ffmpeg()
    }
}

/// Merge a (video-only) screen MP4 with an audio file into one MP4.
#[tauri::command]
pub fn mux_recording(
    video_path: String,
    audio_path: String,
    out_path: String,
) -> Result<(), String> {
    let ffmpeg = find_ffmpeg_path().ok_or_else(|| "FFmpeg not found.".to_string())?;
    if !Path::new(&video_path).exists() {
        return Err(format!("Video file not found: {}", video_path));
    }
    // The audio file is finalized asynchronously a few seconds after recording
    // stops (the incremental saver merges checkpoints), so wait for it to appear.
    {
        let audio = Path::new(&audio_path);
        let started = std::time::Instant::now();
        while !audio.exists() && started.elapsed().as_secs() < 30 {
            std::thread::sleep(std::time::Duration::from_millis(300));
        }
        if !audio.exists() {
            return Err(format!("Audio file not found: {}", audio_path));
        }
        // Give the writer a moment to finish flushing the file.
        std::thread::sleep(std::time::Duration::from_millis(400));
    }

    let mut cmd = Command::new(&ffmpeg);
    cmd.args([
        "-y",
        "-i",
        &video_path,
        "-i",
        &audio_path,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        &out_path,
    ]);
    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    no_window(&mut cmd);

    let out = cmd
        .output()
        .map_err(|e| format!("Merge failed to start: {}", e))?;
    if !out.status.success() {
        return Err(format!(
            "Merge failed: {}",
            String::from_utf8_lossy(&out.stderr)
        ));
    }
    log::info!("Merged recording -> {}", out_path);
    Ok(())
}

// ===========================================================================
// Non-Windows: ffmpeg full-screen capture (gdigrab/x11grab/avfoundation)
// ===========================================================================

#[cfg(not(target_os = "windows"))]
static SCREEN_PROC: Lazy<Mutex<Option<std::process::Child>>> = Lazy::new(|| Mutex::new(None));

#[cfg(target_os = "macos")]
const SCREEN_INPUT: [&str; 4] = ["-f", "avfoundation", "-i", "1:none"];
#[cfg(target_os = "linux")]
const SCREEN_INPUT: [&str; 4] = ["-f", "x11grab", "-i", ":0.0"];

/// Pick the best available H.264 encoder (hardware if present, else libx264).
#[cfg(not(target_os = "windows"))]
fn video_encoder_args(ffmpeg: &Path) -> Vec<String> {
    let mut probe = Command::new(ffmpeg);
    probe.args(["-hide_banner", "-encoders"]);
    probe.stdout(Stdio::piped()).stderr(Stdio::null());
    no_window(&mut probe);
    let list = probe
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();
    let has = |name: &str| list.contains(name);

    let args: &[&str] = if has("h264_videotoolbox") {
        &["-c:v", "h264_videotoolbox", "-b:v", "4M"]
    } else if has("h264_nvenc") {
        &["-c:v", "h264_nvenc", "-preset", "p4", "-rc", "vbr", "-cq", "28"]
    } else {
        &["-c:v", "libx264", "-preset", "veryfast", "-crf", "28"]
    };
    args.iter().map(|s| s.to_string()).collect()
}

#[cfg(not(target_os = "windows"))]
fn screen_record_start_ffmpeg(out_path: String) -> Result<(), String> {
    let ffmpeg =
        find_ffmpeg_path().ok_or_else(|| "FFmpeg not found — cannot record video.".to_string())?;

    if SCREEN_PROC.lock().unwrap().is_some() {
        return Err("A screen recording is already in progress.".to_string());
    }
    if let Some(parent) = Path::new(&out_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut cmd = Command::new(&ffmpeg);
    cmd.args(["-y", "-framerate", "15"]);
    cmd.args(SCREEN_INPUT);
    for a in video_encoder_args(&ffmpeg) {
        cmd.arg(a);
    }
    cmd.args(["-pix_fmt", "yuv420p", "-movflags", "+faststart"]);
    cmd.arg(&out_path);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    no_window(&mut cmd);

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start screen recording: {}", e))?;
    *SCREEN_PROC.lock().unwrap() = Some(child);
    log::info!("Screen recording started -> {}", out_path);
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn screen_record_active_ffmpeg() -> bool {
    let mut guard = SCREEN_PROC.lock().unwrap();
    match guard.as_mut() {
        Some(child) => match child.try_wait() {
            Ok(Some(_)) => {
                *guard = None;
                false
            }
            _ => true,
        },
        None => false,
    }
}

#[cfg(not(target_os = "windows"))]
fn screen_record_stop_ffmpeg() -> Result<(), String> {
    use std::io::Write as _;
    let child = SCREEN_PROC.lock().unwrap().take();
    let Some(mut child) = child else {
        return Ok(());
    };

    if let Some(stdin) = child.stdin.as_mut() {
        let _ = stdin.write_all(b"q\n");
        let _ = stdin.flush();
    }

    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed().as_secs() > 8 {
                    let _ = child.kill();
                    let _ = child.wait();
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(150));
            }
            Err(_) => {
                let _ = child.kill();
                break;
            }
        }
    }
    log::info!("Screen recording stopped");
    Ok(())
}
