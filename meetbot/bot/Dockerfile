# Playwright's image already ships Chromium + the X server + glibc deps it needs.
FROM mcr.microsoft.com/playwright/python:v1.50.0-jammy

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# PulseAudio gives us a per-container sound server; ffmpeg captures the monitor
# of Chromium's playback sink. dbus-x11 keeps PulseAudio happy when running
# under Xvfb without a real session bus.
RUN apt-get update && apt-get install -y --no-install-recommends \
        pulseaudio \
        pulseaudio-utils \
        ffmpeg \
        dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY join_meet.py entrypoint.sh ./
RUN chmod +x entrypoint.sh \
    && mkdir -p /out \
    && mkdir -p /root/.config/pulse

VOLUME /out

ENTRYPOINT ["/app/entrypoint.sh"]
