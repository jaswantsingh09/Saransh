//! Speaker voiceprint enrollment + identification (local, on-device).
//!
//! At onboarding the user records a short sample; we compute a speaker
//! embedding (a "voiceprint") with sherpa-onnx and store it locally. Later we
//! can compare meeting-speaker embeddings against enrolled voiceprints to label
//! the owner's speech by name. Voiceprints are biometric data — enrollment is
//! consent-gated and stored only on this device for Phase 1.

pub mod commands;
