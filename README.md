<div align="center">
  <h1>Saransh</h1>
  <p><b>Privacy-first AI meeting assistant</b> — captures, transcribes, and summarizes meetings entirely on your own infrastructure.</p>
  <p>An internal tool by <b>Intelligaia</b>. Access restricted to <code>@intelligaia.com</code> Google accounts.</p>
</div>

---

## What it is

Saransh is a desktop app (Tauri + Next.js + Rust) that records a meeting, transcribes it locally with Whisper/Parakeet, and generates summaries with a local or self-hosted LLM. Nothing leaves your machine unless you choose a cloud model.

- **Local-first** — audio capture, transcription, and (optionally) summarization run on-device.
- **Org-gated** — mandatory Google sign-in; only `@intelligaia.com` accounts can use the app.
- **Flexible models** — built-in on-device models, Ollama (local), or your own OpenAI-compatible / Claude / Groq endpoint.

## Architecture

```
frontend/                 Tauri desktop app
  src/                    Next.js + React UI (port 3118 in dev)
  src-tauri/              Rust core: audio capture, whisper/parakeet, llama-helper sidecar, auth
backend/                  Optional FastAPI server (whisper-server :8178, API :5167)
```

## Sign-in gate

The whole app is behind a Google login restricted to `@intelligaia.com`:

- OAuth runs in Rust via a loopback + PKCE flow (system browser, no secrets in the webview).
- Configure the OAuth client via env (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`) or an `oauth.json` in the app config dir.
- The domain is verified server-side (the `hd` claim + email domain); a 30-day local session avoids re-login.

## Development (Windows)

Prereqs (already set up on the build box): Rust stable, CMake, **libclang 17** (`C:\libclang17` — newer LLVM breaks whisper-rs bindgen), Vulkan SDK, Node + pnpm.

```powershell
# toolchain env
$env:Path = "C:\Users\<you>\.cargo\bin;C:\Program Files\CMake\bin;C:\VulkanSDK\1.4.350.0\Bin;$env:Path"
$env:LIBCLANG_PATH = "C:\libclang17\clang\native"
$env:VULKAN_SDK    = "C:\VulkanSDK\1.4.350.0"
# OAuth client (or put these in oauth.json under %APPDATA%\com.saransh.ai\)
$env:GOOGLE_OAUTH_CLIENT_ID     = "...apps.googleusercontent.com"
$env:GOOGLE_OAUTH_CLIENT_SECRET = "GOCSPX-..."

cd frontend
pnpm install
pnpm run tauri:dev
```

First launch shows the **Sign in to Saransh** gate. After signing in with an `@intelligaia.com` account, onboarding downloads the on-device models, then the app is ready.

## License

MIT.
