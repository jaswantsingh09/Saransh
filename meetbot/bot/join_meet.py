"""
Joins one Google Meet URL as a guest, waits for the host to admit the bot,
records meeting audio via ffmpeg pulling from PulseAudio's monitor source,
and exits when the meeting ends or the max duration is reached.

This script is intentionally narrow — single meeting, guest auth, no retries.
Robustness comes later. See README.md for the v0 contract.

Output: $OUTPUT_DIR/$MEETING_ID.wav (16 kHz mono)
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import signal
import sys
from pathlib import Path

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PWTimeout,
    async_playwright,
)

# ---------------------------------------------------------------------------
# Config from env

MEET_URL = os.environ["MEET_URL"]
MEETING_ID = os.environ["MEETING_ID"]
BOT_NAME = os.environ.get("BOT_NAME", "Meeting Bot")
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/out"))
MAX_DURATION_MIN = int(os.environ.get("MAX_DURATION_MIN", "90"))
ADMISSION_TIMEOUT_MIN = int(os.environ.get("ADMISSION_TIMEOUT_MIN", "10"))

OUTPUT_PATH = OUTPUT_DIR / f"{MEETING_ID}.wav"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("bot")


# ---------------------------------------------------------------------------
# Audio capture

async def start_recorder() -> asyncio.subprocess.Process:
    """Start ffmpeg recording the PulseAudio monitor of meet_sink to a WAV."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    log.info("recording to %s", OUTPUT_PATH)
    return await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-loglevel", "warning",
        "-y",
        "-f", "pulse",
        "-i", "meet_sink.monitor",
        "-ac", "1",
        "-ar", "16000",
        "-acodec", "pcm_s16le",
        str(OUTPUT_PATH),
        stdin=asyncio.subprocess.PIPE,
    )


async def stop_recorder(proc: asyncio.subprocess.Process) -> None:
    """Ask ffmpeg to finalise the file gracefully."""
    if proc.returncode is not None:
        return
    log.info("stopping ffmpeg")
    try:
        proc.send_signal(signal.SIGINT)
        await asyncio.wait_for(proc.wait(), timeout=10)
    except asyncio.TimeoutError:
        log.warning("ffmpeg did not exit on SIGINT, killing")
        proc.kill()
        await proc.wait()


# ---------------------------------------------------------------------------
# Meet UI navigation
#
# Meet's DOM is unstable, so we lean on aria roles / visible text rather than
# CSS classes. Each helper returns silently when nothing matches; the caller
# decides whether that's fatal.

async def dismiss_intro_dialogs(page: Page) -> None:
    """Click through any pre-meeting interstitials ('Got it', 'Continue without …')."""
    for label in ("Got it", "Continue without microphone and camera", "Continue without microphone"):
        try:
            btn = page.get_by_role("button", name=label)
            if await btn.is_visible(timeout=2_000):
                log.info("dismissing dialog: %s", label)
                await btn.click()
        except (PWTimeout, Exception):
            pass


async def fill_guest_name(page: Page, name: str) -> None:
    """If the guest-name input is shown, type the bot's display name."""
    try:
        name_input = page.locator('input[aria-label*="name" i]').first
        await name_input.wait_for(state="visible", timeout=8_000)
        await name_input.fill(name)
        log.info("filled guest name: %s", name)
    except PWTimeout:
        log.info("no guest-name input (probably signed in or single-step join)")


async def click_join_button(page: Page) -> None:
    """Click 'Ask to join' or 'Join now' — whichever Meet shows."""
    join_pattern = re.compile(r"(Ask to join|Join now)", re.I)
    btn = page.get_by_role("button", name=join_pattern).first
    await btn.wait_for(state="visible", timeout=30_000)
    label = await btn.inner_text()
    log.info("clicking join button: %s", label.strip())
    await btn.click()


async def wait_for_admission(page: Page, timeout_min: int) -> None:
    """Block until the in-meeting UI appears (Leave-call button visible)."""
    leave = page.get_by_role("button", name=re.compile("Leave call", re.I)).first
    log.info("waiting up to %d min for host to admit", timeout_min)
    await leave.wait_for(state="visible", timeout=timeout_min * 60_000)
    log.info("admitted to meeting")


async def is_still_in_meeting(page: Page) -> bool:
    """Best-effort: are we still seeing the in-meeting chrome?"""
    leave = page.get_by_role("button", name=re.compile("Leave call", re.I)).first
    try:
        return await leave.is_visible(timeout=1_000)
    except (PWTimeout, Exception):
        return False


# ---------------------------------------------------------------------------
# Orchestration

async def run() -> int:
    async with async_playwright() as pw:
        browser: Browser = await pw.chromium.launch(
            headless=False,  # need a real display so Meet thinks we have a camera/mic
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--autoplay-policy=no-user-gesture-required",
                # Route Chromium audio into the PulseAudio sink we created in entrypoint.sh.
                "--alsa-output-device=pulse",
            ],
        )
        context: BrowserContext = await browser.new_context(
            permissions=["microphone", "camera"],
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )
        page = await context.new_page()

        log.info("navigating to %s", MEET_URL)
        await page.goto(MEET_URL, wait_until="domcontentloaded")

        await dismiss_intro_dialogs(page)
        await fill_guest_name(page, BOT_NAME)
        await click_join_button(page)
        await wait_for_admission(page, ADMISSION_TIMEOUT_MIN)

        # Start recording only once we're actually in the room — avoids capturing
        # the Meet pre-join chimes as a fake meeting body.
        ffmpeg = await start_recorder()

        deadline = asyncio.get_event_loop().time() + MAX_DURATION_MIN * 60
        log.info("recording started; polling for meeting end")
        try:
            while True:
                if asyncio.get_event_loop().time() > deadline:
                    log.info("max duration reached")
                    break
                if not await is_still_in_meeting(page):
                    log.info("leave button gone — meeting appears to have ended")
                    break
                await asyncio.sleep(5)
        finally:
            await stop_recorder(ffmpeg)
            try:
                await browser.close()
            except Exception:
                pass

        size = OUTPUT_PATH.stat().st_size if OUTPUT_PATH.exists() else 0
        log.info("done; wrote %s (%d bytes)", OUTPUT_PATH, size)
        return 0 if size > 0 else 2


def main() -> None:
    try:
        sys.exit(asyncio.run(run()))
    except KeyboardInterrupt:
        log.info("interrupted")
        sys.exit(130)


if __name__ == "__main__":
    main()
