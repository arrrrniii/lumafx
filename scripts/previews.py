"""
Regenerates the README previews in docs/preview/ from the real demo and the real renderer:

  python3 scripts/previews.py        (after npm run build; needs Python Playwright and ffmpeg)

Stills are PNG (light and dark for the UI blocks), motion is GIF so GitHub shows it inline.
"""
import functools
import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "preview")
os.makedirs(OUT, exist_ok=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{httpd.server_address[1]}"


def gif(frames_dir, out, fps=15, width=640):
    """PNG frames → a small looping GIF (palette per clip, light dithering)."""
    pattern = os.path.join(frames_dir, "f%04d.png")
    palette = os.path.join(frames_dir, "palette.png")
    scale = f"scale={width}:-1:flags=lanczos"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(fps), "-i", pattern, "-vf", f"{scale},palettegen=stats_mode=full:max_colors=160", palette], check=True)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(fps), "-i", pattern, "-i", palette, "-lavfi", f"{scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", out],
        check=True,
    )
    print(f"  {os.path.relpath(out, ROOT)}  {os.path.getsize(out) / 1024:.0f} KB")


def record(page, clip, out, seconds=3.0, fps=15, width=640, before=None):
    """Screenshots of `clip` at `fps` for `seconds`; `before` runs right before the first frame."""
    tmp = tempfile.mkdtemp()
    try:
        if before:
            before()
        n = int(seconds * fps)
        for i in range(n):
            try:
                page.screenshot(path=os.path.join(tmp, f"f{i:04d}.png"), clip=clip)
            except Exception:
                print("  clip", clip, "frame", i, "scroll", page.evaluate("[scrollX, scrollY, innerWidth, innerHeight]"))
                raise
            page.wait_for_timeout(1000 / fps * 0.55)  # a screenshot itself takes part of the frame
        gif(tmp, out, fps=fps, width=width)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def jump(page, selector, offset=160):
    """Scroll without smooth scrolling, so the element is where the clip expects it."""
    page.evaluate(
        "([s, o]) => { const el = document.querySelector(s); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - o, behavior: 'instant' }); }",
        [selector, offset],
    )
    page.wait_for_timeout(700)


def box(locator, pad=24, page=None):
    b = locator.bounding_box()
    return {"x": max(0, b["x"] - pad), "y": max(0, b["y"] - pad), "width": b["width"] + pad * 2, "height": b["height"] + pad * 2}


def demo(browser, **ctx):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1, **ctx)
    context.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    context.route("**/fonts.gstatic.com/**", lambda r: r.fulfill(status=200, body=""))
    page = context.new_page()
    page.goto(BASE + "/demo/index.html", wait_until="load")
    if page.query_selector("[data-fx~=preloader]"):
        page.wait_for_function("() => document.querySelector('[data-fx~=preloader]').hasAttribute('data-fx-done')", timeout=15000)
    page.wait_for_timeout(600)
    return context, page


UI_PAGE = """<!doctype html><html lang="en" data-theme="%(theme)s"><head><meta charset="utf-8"><base href="/demo/">
<link rel="stylesheet" href="/dist/lumafx-ui.css">
<style>
  html, body { margin: 0; background: %(bg)s; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: %(fg)s; }
  .grid { display: grid; grid-template-columns: %(template)s; gap: 20px; padding: 28px; width: %(width)dpx; box-sizing: border-box; align-items: start; }
</style></head><body><div class="grid" id="grid"></div>
<script src="/dist/lumafx-ui.global.js"></script>
<script src="/demo/ui-samples.js"></script>
<script>
  const columns = %(columns)s;
  const S = window.FXUI_SAMPLES;
  const flat = (list, out = []) => { for (const b of list || []) { out.push(b); flat(b.blocks, out); } return out; };
  const pick = (doc, type, nth = 0) => flat(S[doc].blocks).filter((b) => b.type === type)[nth];
  const grid = document.getElementById('grid');
  for (const col of columns) {
    const el = document.createElement('div');
    grid.append(el);
    // "doc:type" picks a sample block; { pick: "doc:type", set: {...} } picks one and changes some fields.
    const blocks = col.map((x) => (typeof x === 'string' ? pick(...x.split(':')) : x.pick ? { ...pick(...x.pick.split(':')), ...x.set } : x)).filter(Boolean);
    lumafx.ui.render(el, { lang: %(lang)s, blocks }, { theme: '%(theme)s', timeZone: 'Europe/Tirane', now: Date.parse('2026-10-05T12:00:00+02:00') });
  }
</script></body></html>"""

ALB = [
    {
        "type": "stats",
        "items": [{"label": "Points", "value": 9}, {"label": "Goals scored", "value": 8}, {"label": "Goals conceded", "value": 3}],
    },
    {
        "type": "table",
        "title": "Albania, Nations League group C1",
        "columns": [{"label": "Date", "format": "date"}, {"label": "Match"}, {"label": "Score", "align": "center"}, {"label": "Albania goals", "format": "number", "bar": True}, {"label": "Pts", "format": "number"}],
        "rows": [["2026-09-26", "Albania–Belarus", "2–0", 2, 3], ["2026-09-29", "San Marino–Albania", "0–3", 3, 3], ["2026-10-03", "Finland–Albania", "2–1", 1, 0], ["2026-10-06", "Albania–San Marino", "2–1", 2, 3]],
    },
]
ALB_CHARTS = [
    {"type": "chart", "kind": "column", "title": "Goals per match", "labels": ["BLR", "SMR", "FIN", "SMR"], "series": [{"name": "Scored", "values": [2, 3, 1, 2]}, {"name": "Conceded", "values": [0, 0, 2, 1]}]},
    {"type": "chart", "kind": "line", "title": "Points after each match", "labels": ["26 Sep", "29 Sep", "3 Oct", "6 Oct"], "series": [{"name": "Points", "values": [3, 6, 6, 9]}], "min": 0},
]

COMPOSITIONS = {
    "ui-football": {
        "width": 1680,
        "template": "minmax(0, .82fr) minmax(0, 1fr) minmax(0, 1.28fr)",
        "lang": "'en'",
        "columns": [[{"pick": "orbit:lineup", "set": {"title": "Lineup", "note": "Positions are schematic; the 3-4-3 is as reported by Flashscore."}}], ["sports:match", "sports:match-stats"], ["sports:standings", "sports:player"]],
    },
    "ui-data": {"width": 1200, "lang": "'en'", "columns": [ALB, ALB_CHARTS]},
    "ui-events": {"width": 1200, "lang": "'en'", "columns": [["events:event", "events:tickets"], ["events:zones"]]},
}


def compose(browser, name, spec, theme):
    bg, fg = ("#f4f5f8", "#10131f") if theme == "light" else ("#0b0d13", "#eef0f6")
    template = spec.get("template") or f"repeat({len(spec['columns'])}, minmax(0, 1fr))"
    html = UI_PAGE % {"theme": theme, "bg": bg, "fg": fg, "template": template, "width": spec["width"], "columns": json.dumps(spec["columns"]), "lang": spec["lang"]}
    path = os.path.join(ROOT, "docs", "preview", f"_{name}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    try:
        context = browser.new_context(viewport={"width": spec["width"], "height": 900}, device_scale_factor=1.5, color_scheme=theme)
        page = context.new_page()
        page.goto(f"{BASE}/docs/preview/_{name}.html", wait_until="load")
        page.wait_for_timeout(1400)  # entrance animations and count-ups settle
        out = os.path.join(OUT, f"{name}-{theme}.png")
        page.locator("#grid").screenshot(path=out)
        subprocess.run(["python3", "-c", f"from PIL import Image; im=Image.open({out!r}); im.save({out!r}, optimize=True)"], check=True)
        print(f"  {os.path.relpath(out, ROOT)}  {os.path.getsize(out) / 1024:.0f} KB")
        context.close()
    finally:
        os.remove(path)


def stream_gif(browser):
    """The signature move: blocks appear while the model is still writing the JSON."""
    doc = "sports"
    html = """<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/lumafx-ui.css">
<style>html,body{margin:0;background:#f4f5f8;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}#ui{width:760px;padding:24px;box-sizing:border-box}</style></head>
<body><div id="ui"></div><script src="/dist/lumafx-ui.global.js"></script><script src="/demo/ui-samples.js"></script>
<script>
  const d = window.FXUI_SAMPLES.%s;
  const flat = (list, out = []) => { for (const b of list || []) { out.push(b); flat(b.blocks, out); } return out; };
  const pick = (t) => flat(d.blocks).find((b) => b.type === t);
  const text = JSON.stringify({ lang: d.lang, blocks: [pick('match'), pick('standings')] });
  // The recorder writes one chunk per frame, so the GIF shows every step whatever the screenshot speed.
  const s = lumafx.ui.stream(document.getElementById('ui'), { timeZone: 'Europe/Tirane', now: Date.parse('2026-10-05T12:00:00+02:00') });
  let i = 0;
  window.step = (n) => { if (i >= text.length) return true; s.write(text.slice(i, i + n)); i += n; if (i >= text.length) s.end(); return false; };
</script></body></html>""" % doc
    path = os.path.join(ROOT, "docs", "preview", "_stream.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    try:
        context = browser.new_context(viewport={"width": 760, "height": 820}, device_scale_factor=1)
        page = context.new_page()
        page.goto(f"{BASE}/docs/preview/_stream.html", wait_until="load")
        # Measure the finished answer once, then start again from an empty page.
        page.evaluate("step(1e9)")
        page.wait_for_timeout(1200)
        height = page.evaluate("document.getElementById('ui').getBoundingClientRect().height")
        page.reload(wait_until="load")
        clip = {"x": 0, "y": 0, "width": 760, "height": min(820, int(height) + 2)}
        tmp = tempfile.mkdtemp()
        try:
            i = 0
            page.screenshot(path=os.path.join(tmp, f"f{i:04d}.png"), clip=clip)
            done = False
            while not done:
                done = page.evaluate("step(30)")
                page.wait_for_timeout(60)  # one animation frame for the new pieces
                i += 1
                page.screenshot(path=os.path.join(tmp, f"f{i:04d}.png"), clip=clip)
            for _ in range(14):  # hold the finished answer before the loop restarts
                page.wait_for_timeout(80)
                i += 1
                page.screenshot(path=os.path.join(tmp, f"f{i:04d}.png"), clip=clip)
            gif(tmp, os.path.join(OUT, "ui-streaming.gif"), fps=12, width=640)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        context.close()
    finally:
        os.remove(path)


LOADER_PAGE = """<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/lumafx.css">
<script src="/dist/lumafx.global.js"></script>
<style>html,body{margin:0;background:#0b0d13}.row{display:flex;gap:28px;padding:28px}.row>div{width:260px;height:220px}</style></head>
<body><div class="row"><div data-fx="loader-3d"></div><div data-fx="loader-3d" data-fx-colors="#ffc15e,#ff8a4c,#ff4f7b" data-fx-base="#ffe6cc" data-fx-count="6"></div></div></body></html>"""


def loader_gif(p):
    """WebGL needs software GL in a headless browser; only this small page pays for it."""
    path = os.path.join(ROOT, "docs", "preview", "_loader.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(LOADER_PAGE)
    try:
        browser = p.chromium.launch(args=["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"])
        page = browser.new_page(viewport={"width": 600, "height": 280})
        page.goto(f"{BASE}/docs/preview/_loader.html", wait_until="load")
        page.wait_for_timeout(1500)
        record(page, {"x": 0, "y": 0, "width": 600, "height": 276}, os.path.join(OUT, "loader-3d.gif"), seconds=3, fps=15, width=480)
        browser.close()
    finally:
        os.remove(path)


ONLY = set(sys.argv[1:])  # e.g. `python3 scripts/previews.py ui` to redo only the intelligent UI images

with sync_playwright() as p:
    browser = p.chromium.launch()

    if not ONLY or "effects" in ONLY:
        print("hero and effects")
        context, page = demo(browser, color_scheme="dark")
        page.wait_for_timeout(2500)  # the hero text reveal finishes
        page.screenshot(path=os.path.join(OUT, "hero.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 760})
        print("  docs/preview/hero.png")

        beams = page.locator("#border-beam [data-fx~=border-beam]")
        jump(page, '#border-beam', 160)
        a, c = beams.nth(0).bounding_box(), beams.nth(2).bounding_box()
        clip = {"x": a["x"] - 20, "y": a["y"] - 20, "width": c["x"] + c["width"] - a["x"] + 40, "height": max(a["height"], c["height"]) + 40}
        record(page, clip, os.path.join(OUT, "border-beam.gif"), seconds=4, fps=15, width=720)

        # Clicks go through the DOM so the page does not scroll under the clip.
        jump(page, '#tr-demo', 200)
        page.wait_for_timeout(800)
        clip = box(page.locator("#tr-demo"), pad=16)
        clip["y"] = max(0, clip["y"])
        clip["height"] = min(clip["height"], 900 - clip["y"])
        record(page, clip, os.path.join(OUT, "text-reveal.gif"), seconds=2.6, fps=15, width=640, before=lambda: page.evaluate("document.querySelector('#text-reveal [data-replay]').click()"))

        context.close()
        loader_gif(p)

    if not ONLY or "ui" in ONLY:
        print("intelligent UI")
        stream_gif(browser)
        for name, spec in COMPOSITIONS.items():
            for theme in ("light", "dark"):
                compose(browser, name, spec, theme)
    browser.close()

# Two stills come straight from the test suites (npm run test:wordpress, cd mcp && npm run test:view).
from PIL import Image  # noqa: E402

wp, view = os.path.join(ROOT, "test", "shots", "wp-08-editor-panel.png"), os.path.join(ROOT, "mcp", "test", "shots", "view-orbit-midstream.png")
if os.path.exists(wp):
    Image.open(wp).save(os.path.join(OUT, "wordpress-editor.png"), optimize=True)
if os.path.exists(view):
    Image.open(view).crop((0, 0, 820, 545)).save(os.path.join(OUT, "mcp-chat.png"), optimize=True)

total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f"docs/preview: {total / 1024 / 1024:.1f} MB")
