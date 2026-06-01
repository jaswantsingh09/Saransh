#!/usr/bin/env bash
# Bring PulseAudio up inside the container, then run the joiner.
# Playwright's base image starts Xvfb automatically when Chromium launches
# in headed mode, so we do not need to manage it here.

set -euo pipefail

# Run PulseAudio in user mode, no exit-on-idle, with a null sink that
# Chromium will use for playback. ffmpeg later captures null.monitor.
pulseaudio --start --exit-idle-time=-1 --disallow-exit
pactl load-module module-null-sink sink_name=meet_sink sink_properties=device.description="meet_sink" >/dev/null
pactl set-default-sink meet_sink

# Quick sanity check; surfaces a clear error in the bot log if Pulse failed.
pactl info | head -3

exec python /app/join_meet.py
