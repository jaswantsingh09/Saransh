# bot

Linux container that joins one Google Meet URL, records the meeting's audio to a WAV file, and exits when the meeting ends.

## What's inside

- `Dockerfile` — Playwright Python base + PulseAudio + ffmpeg.
- `entrypoint.sh` — boots PulseAudio in the container, then runs the joiner.
- `join_meet.py` — opens Chromium via Playwright, joins the meeting as a guest, records audio with ffmpeg from PulseAudio monitor source.
- `requirements.txt` — pinned Python deps.

## Usage (manual, for dev)

```bash
docker build -t meetbot-bot .
docker run --rm \
  -e MEET_URL="https://meet.google.com/abc-defg-hij" \
  -e BOT_NAME="Meeting Bot" \
  -e MEETING_ID="2026-06-01-standup" \
  -e MAX_DURATION_MIN=90 \
  -v "$PWD/recordings:/out" \
  meetbot-bot
```

Output: `recordings/2026-06-01-standup.wav` (16 kHz mono).

## Env vars

| Name | Required | Default | Notes |
|---|---|---|---|
| `MEET_URL` | yes | — | Full Meet URL `https://meet.google.com/xxx-xxxx-xxx`. |
| `MEETING_ID` | yes | — | Output filename stem and ID surfaced in backend logs. |
| `BOT_NAME` | no | `Meeting Bot` | Display name shown in the participant list. |
| `MAX_DURATION_MIN` | no | `90` | Hard upper bound on recording length. |
| `ADMISSION_TIMEOUT_MIN` | no | `10` | How long to wait at "Asking to join" before giving up. |

## v0 limits

- **Guest join only.** No Google sign-in flow yet. If the meeting blocks guests, the bot fails fast.
- **No video.** Records meeting *audio* (incoming voice from other participants) only.
- **No bot speech.** The bot never plays anything into the meeting — Chromium's mic is a fake muted source.
- **Selectors are best-effort.** Meet's DOM changes; if join/leave detection breaks, adjust the locators in `join_meet.py`.
