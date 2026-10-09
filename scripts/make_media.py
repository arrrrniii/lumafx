"""Procedural media for the v0.2 demo (no stock footage needed).

- demo/media/flight.mp4 + .webm: a flight down a mountain valley at sunset, for video-scrub.
  Encoded with short keyframe intervals so seeking backwards stays smooth.
- demo/seq/sunset-001.jpg …: a sunset over the bay, for the frames (image sequence) effect.
"""
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from make_images import hexrgb, scene  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "demo")


def lerp(a, b, t):
    return a + (b - a) * t


def mix_palette(p1, p2, t):
    return ["#%02x%02x%02x" % tuple(int(round(c * 255)) for c in lerp(hexrgb(a), hexrgb(b), t)) for a, b in zip(p1, p2)]


# ---------------------------------------------------------------- flight (video-scrub)

def profile(xw, seed, valley_w):
    """Mountain height (world units) along x: a valley in the middle, ridges either side."""
    rng = np.random.default_rng(seed)
    y = np.zeros_like(xw)
    a, f = 0.12, 0.9
    for _ in range(5):
        ph = rng.uniform(0, 2 * np.pi)
        y += a * np.sin(xw * f + ph)
        a *= 0.5
        f *= 2.05
    side = np.clip((np.abs(xw - rng.uniform(-0.25, 0.25)) - valley_w) / 1.4, 0, 1)
    side = side * side * (3 - 2 * side)
    return 0.12 + 1.05 * side + y


def flight_frame(t, w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = yy / h
    sky_a = ["#1a2350", "#7d4c84", "#f4a06a", "#ffdcaa"]
    sky_b = ["#1b2048", "#6d3f78", "#e6765c", "#ffc58a"]
    stops = np.stack([hexrgb(c) for c in mix_palette(sky_a, sky_b, t)])
    tt = np.clip(v / 0.5, 0, 1) * (len(stops) - 1)
    i0 = np.clip(np.floor(tt).astype(int), 0, len(stops) - 2)
    fr = (tt - i0)[..., None]
    img = stops[i0] * (1 - fr) + stops[i0 + 1] * fr
    horizon = h * 0.44
    sx, sy = w * 0.52, horizon - h * lerp(0.07, 0.01, t)
    d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2) / (w * 0.045)
    sun = hexrgb("#ffe6b8")
    img = img + sun * (np.exp(-(d ** 2) * 0.05) * 0.6)[..., None]
    img = img * (1 - np.clip((1.02 - d) * 30, 0, 1)[..., None]) + (sun * 0.4 + 0.6) * np.clip((1.02 - d) * 30, 0, 1)[..., None]

    fog = hexrgb("#f2a77a")
    near_col = hexrgb("#141228")
    cam_h = 0.42
    z = t * 3.2
    f = h * 0.42
    depths = [0.8 + k * 0.62 for k in range(14)]
    for k, D in reversed(list(enumerate(depths))):
        dz = D - z
        if dz <= 0.18:
            continue
        cols = np.arange(w, dtype=np.float32)
        xw = (cols - w / 2) * dz / f
        hgt = profile(xw, 100 + k, 0.35 + 0.1 * (k % 3))
        top = horizon - f * (hgt - cam_h) / dz
        edge = np.clip((yy - top[None, :]) / 1.5, 0, 1)
        haze = float(np.clip(1 - np.exp(-dz * 0.3), 0, 1))
        col = lerp(near_col, fog, haze * 0.95)
        shade = np.clip((yy - top[None, :]) / (h * 0.6), 0, 1)[..., None]
        layer = col * (1 - shade * 0.3 * (1 - haze))
        # the nearest layers rush past and fade
        a = edge * float(np.clip((dz - 0.18) / 0.35, 0, 1))
        img = img * (1 - a[..., None]) + layer * a[..., None]
    vig = 1 - 0.3 * (((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2)
    img = img * vig[..., None]
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))


def make_flight(n=96, w=960, h=540):
    out = os.path.join(ROOT, "media")
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for i in range(n):
        t = i / (n - 1)
        e = t * t * (3 - 2 * t) * 0.35 + t * 0.65
        flight_frame(e, w, h).save(os.path.join(tmp, f"f{i:04d}.png"))
    src = ["-framerate", "30", "-i", os.path.join(tmp, "f%04d.png")]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *src, "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-g", "6",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", os.path.join(out, "flight.mp4")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *src, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-g", "6",
                    "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-an", os.path.join(out, "flight.webm")], check=True)
    Image.open(os.path.join(tmp, "f0000.png")).convert("RGB").save(os.path.join(out, "flight-poster.jpg"), quality=78)
    shutil.rmtree(tmp)


# ---------------------------------------------------------------- sunset (frames)

def make_sunset(n=48, w=1120, h=630):
    out = os.path.join(ROOT, "seq")
    os.makedirs(out, exist_ok=True)
    day = ["#2f6f9f", "#6fb0d6", "#bfe3ea", "#fff1d6"]
    gold = ["#1d2b53", "#7e4e86", "#f19b6a", "#ffd3a1"]
    night = ["#03040b", "#0b1030", "#2a2458", "#7a3b6e"]
    rng = np.random.default_rng(5)
    stars = rng.uniform(0, 1, (260, 3))
    for i in range(n):
        t = i / (n - 1)
        pal = mix_palette(day, gold, t / 0.55) if t < 0.55 else mix_palette(gold, night, (t - 0.55) / 0.45)
        sun_y = lerp(0.24, 0.74, t)
        sun = "#%02x%02x%02x" % tuple(int(c * 255) for c in lerp(hexrgb("#fffbe8"), hexrgb("#ff8a4c"), min(1, t * 1.3)))
        night_a = float(np.clip((t - 0.62) / 0.3, 0, 1))

        def extra(img, xx, yy, night_a=night_a):
            if night_a <= 0:
                return img
            for sxn, syn, b in stars:
                cx, cy = int(sxn * w), int(syn * h * 0.55)
                img[max(cy - 1, 0):cy + 1, max(cx - 1, 0):cx + 1] += night_a * (0.35 + 0.6 * b)
            return img

        im = scene(w, h, pal, sun, [("#3e6e78", 0.6, 0.03), ("#244b55", 0.64, 0.025)],
                   {"y": 0.66, "color": "#1b6e8a"}, seed=42, sun_pos=(0.62, sun_y), sun_r=0.05, grain=0.008, extra=extra)
        # darken the land and sea as the light goes
        arr = np.asarray(im).astype(np.float32) / 255
        dim = 1 - 0.55 * night_a
        ramp = np.clip((np.arange(h, dtype=np.float32) - h * 0.54) / (h * 0.08), 0, 1)[:, None, None]
        arr *= 1 - (1 - dim) * ramp
        Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(
            os.path.join(out, f"sunset-{i + 1:03d}.jpg"), quality=68, optimize=True, progressive=True)


if __name__ == "__main__":
    make_flight()
    make_sunset()
    for d in ("media", "seq"):
        p = os.path.join(ROOT, d)
        total = sum(os.path.getsize(os.path.join(p, f)) for f in os.listdir(p))
        print(d, len(os.listdir(p)), "files", round(total / 1024), "KB")
