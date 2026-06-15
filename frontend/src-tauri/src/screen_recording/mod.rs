// Screen + video recording of the meeting using the bundled ffmpeg.
// Captures the desktop (gdigrab on Windows) to an H.264 MP4 (video only); the
// meeting audio comes from Saransh's own system+mic pipeline and is merged in
// afterward (mux_recording). See the MeetingRecording flow on the frontend.

pub mod commands;
