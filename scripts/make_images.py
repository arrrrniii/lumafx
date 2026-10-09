"""Procedural landscape images for the demo (no stock photos needed).

Sky gradient + sun glow + layered ridges with atmospheric perspective + optional sea, plus film grain.
"""
import os
import sys
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 and __name__ == "__main__" else "demo/img"


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def ridge(width, rng, base, amp, octaves=5, rough=0.42):
    x = np.linspace(0, 1, width)
    y = np.zeros(width)
    a, f = amp, 1.5
    for _ in range(octaves):
        phase = rng.uniform(0, 2 * np.pi)
        y += a * np.sin(2 * np.pi * f * x + phase) + a * 0.5 * np.sin(2 * np.pi * f * 2.13 * x + phase * 1.7)
        a *= rough
        f *= 2.1
    return base + y


def scene(w, h, sky, sun, ridges, sea=None, seed=0, sun_pos=(0.62, 0.42), sun_r=0.07, grain=0.022, extra=None):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = yy / h
    # sky: multi-stop vertical gradient
    stops = [hexrgb(c) for c in sky]
    t = np.clip(v / 0.75, 0, 1) * (len(stops) - 1)
    i0 = np.clip(np.floor(t).astype(int), 0, len(stops) - 2)
    frac = (t - i0)[..., None]
    s = np.stack(stops)
    img = s[i0] * (1 - frac) + s[i0 + 1] * frac
    # sun disc + glow
    sx, sy = sun_pos[0] * w, sun_pos[1] * h
    d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2) / (w * sun_r)
    sc = hexrgb(sun)
    glow = np.exp(-(d ** 2) * 0.08)[..., None] * 0.55
    disc = np.clip((1.02 - d) * 30, 0, 1)[..., None]
    img = img + sc * glow
    img = img * (1 - disc) + (sc * 0.4 + 0.6) * disc
    horizon = None
    # ridges: back to front
    for k, (color, base, amp) in enumerate(ridges):
        r = ridge(w, rng, base * h, amp * h)
        mask = (yy >= r[None, :]).astype(np.float32)
        # soft edge
        edge = np.clip((yy - r[None, :]) / 2.0, 0, 1)
        col = hexrgb(color)
        # vertical shading inside each ridge layer
        shade = np.clip((yy - r[None, :]) / (h * 0.5), 0, 1)[..., None]
        layer = col * (1 - shade * 0.35)
        img = img * (1 - edge[..., None]) + layer * edge[..., None]
        horizon = r if horizon is None else np.minimum(horizon, r)
    if sea:
        top = sea["y"] * h
        m = (yy >= top).astype(np.float32)
        sea_col = hexrgb(sea["color"])
        depth = np.clip((yy - top) / (h - top + 1), 0, 1)[..., None]
        water = sea_col * (1 - depth * 0.45) + hexrgb(sun) * 0.12 * (1 - depth)
        # sun reflection streaks
        band = np.exp(-((xx - sx) / (w * 0.06)) ** 2)
        streak = (np.sin(yy * 0.9 + np.sin(xx * 0.05) * 3) > 0.55).astype(np.float32)
        refl = (band * streak * (1 - depth[..., 0]) * 0.55)[..., None]
        water = water + sc * refl
        img = img * (1 - m[..., None]) + water * m[..., None]
    if extra is not None:
        img = extra(img, xx, yy)
    # grain + vignette
    img = img + rng.normal(0, grain, img.shape).astype(np.float32)
    vig = 1 - 0.28 * (((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2)
    img = img * vig[..., None]
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))


SCENES = {
    # name: (sky stops, sun, ridges [(color, base 0-1, amp 0-1)], sea, sun_pos)
    "theth": (["#1d2b53", "#7e4e86", "#f19b6a", "#ffd3a1"], "#ffe2b0",
              [("#6b5a87", 0.52, 0.07), ("#3f3a63", 0.62, 0.08), ("#22223f", 0.74, 0.06), ("#121427", 0.86, 0.04)], None, (0.55, 0.5)),
    "ksamil": (["#0e3b5c", "#2f7aa0", "#8fd0d8", "#ffe9c4"], "#fff3d6",
               [("#3e6e78", 0.6, 0.03), ("#244b55", 0.64, 0.025)], {"y": 0.66, "color": "#1b6e8a"}, (0.7, 0.48)),
    "dajti": (["#120f2b", "#3d2361", "#b44a6e", "#f5875f"], "#ffb37a",
              [("#5a2f5e", 0.55, 0.09), ("#38214a", 0.66, 0.08), ("#1e1530", 0.8, 0.05)], None, (0.32, 0.56)),
    "blloku": (["#05060d", "#151a3a", "#3a2d6e", "#c1477a"], "#ff7aa8",
               [("#2a2350", 0.7, 0.012), ("#16142c", 0.78, 0.01)], None, (0.5, 0.66)),
    "valbona": (["#2a4a6b", "#7aa6c2", "#d9e6ea", "#f7efe2"], "#fffaf0",
                [("#90a8b8", 0.42, 0.11), ("#5f7d8f", 0.55, 0.1), ("#3d5866", 0.7, 0.07), ("#22343d", 0.85, 0.04)], None, (0.3, 0.3)),
    "butrint": (["#1f1a12", "#6b4a26", "#d18d42", "#f7d08a"], "#fff0c2",
                [("#7a5a35", 0.6, 0.05), ("#4b3720", 0.7, 0.05), ("#261c10", 0.84, 0.03)], {"y": 0.88, "color": "#3a2a18"}, (0.66, 0.45)),
    "llogara": (["#061826", "#0f3b4a", "#2e8c87", "#b9e3c9"], "#e8fff0",
                [("#24616a", 0.5, 0.09), ("#173f48", 0.63, 0.08), ("#0b252c", 0.78, 0.06)], {"y": 0.84, "color": "#0e3a46"}, (0.5, 0.36)),
    "durres": (["#1b1636", "#5d3a7a", "#e2706a", "#ffc890"], "#ffd9a6",
               [("#40305e", 0.68, 0.015)], {"y": 0.7, "color": "#3a2c5c"}, (0.45, 0.55)),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for i, (name, (sky, sun, ridges, sea, pos)) in enumerate(SCENES.items()):
        portrait = scene(900, 1125, sky, sun, ridges, sea, seed=i + 3, sun_pos=pos)
        portrait.save(os.path.join(OUT, f"{name}.jpg"), quality=82, optimize=True, progressive=True)

    wide = scene(1600, 1000, *SCENES["ksamil"][:4], seed=42, sun_pos=(0.68, 0.46))
    wide.save(os.path.join(OUT, "ksamil-wide.jpg"), quality=84, optimize=True, progressive=True)
    wide2 = scene(1600, 1000, *SCENES["theth"][:4], seed=7, sun_pos=(0.5, 0.48))
    wide2.save(os.path.join(OUT, "theth-wide.jpg"), quality=84, optimize=True, progressive=True)
    print("ok", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
