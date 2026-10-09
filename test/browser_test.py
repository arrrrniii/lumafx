"""Real-browser tests for lumafx (headless Chromium via Playwright).

Runs the demo page and checks every effect's behaviour, then repeats key checks with
forced fallbacks, reduced motion and a phone viewport. Screenshots go to test/shots/.
Usage: python3 test/browser_test.py
"""
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO = os.path.join(ROOT, "demo")
SHOTS = os.path.join(ROOT, "test", "shots")
os.makedirs(SHOTS, exist_ok=True)

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("  ✓ " if ok else "  ✗ ") + name + (f"  [{detail}]" if detail and not ok else ""))


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=DEMO)
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"


def write_fallback_page():
    html = open(os.path.join(DEMO, "index.html"), encoding="utf-8").read()
    html = html.replace(
        '<script src="lumafx.global.js"></script>',
        '<script src="lumafx.global.js" data-fx-manual></script>\n'
        "<script>document.documentElement.classList.add('fx-ready');"
        "lumafx.start({ features: { sda: false, cornerShape: false, chromium: false } });</script>",
        1,
    )
    open(os.path.join(DEMO, "fallback.html"), "w", encoding="utf-8").write(html)


def new_page(browser, url, errors, **ctx):
    context = browser.new_context(**ctx)
    # Fonts are cosmetic; skip the network round trip.
    context.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    context.route("**/fonts.gstatic.com/**", lambda r: r.fulfill(status=200, body=""))
    page = context.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
    page.goto(url, wait_until="load")
    page.wait_for_timeout(400)
    # The demo opens with a preloader; entrance animations start when it lifts.
    if page.query_selector("[data-fx~=preloader]"):
        page.wait_for_function("() => document.querySelector('[data-fx~=preloader]').hasAttribute('data-fx-done')", timeout=12000)
    return page


def scroll_to(page, sel, block="center"):
    page.eval_on_selector(sel, f"el => el.scrollIntoView({{block: '{block}', behavior: 'instant'}})")
    page.wait_for_timeout(350)


def center(page, sel):
    b = page.locator(sel).first.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, b


def main():
    write_fallback_page()
    httpd, base = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--enable-unsafe-swiftshader"])

        # ------------------------------------------------------------------ main run
        print("\nDesktop · Chromium")
        errors = []
        page = new_page(browser, base + "/index.html", errors, viewport={"width": 1440, "height": 900}, color_scheme="dark")
        info = page.evaluate("({ v: lumafx.version, env: {...lumafx.env}, stats: lumafx.stats(), names: lumafx.effects })")
        version = json.load(open(os.path.join(ROOT, "package.json")))["version"]
        check("runtime boots with version", info["v"] == version, info["v"])
        missing = [n for n in info["names"] if n not in info["stats"]]
        check(f"all {len(info['names'])} effects mounted on the page", not missing, f"missing {missing}")
        check("feature detection: scroll-driven, corner-shape, Chromium", info["env"]["sda"] and info["env"]["cornerShape"] and info["env"]["chromium"], json.dumps(info["env"]))

        # hero
        page.wait_for_timeout(1600)
        hero = page.evaluate(
            """() => { const h = document.querySelector('.site-head .logo [data-fx~="text-reveal"]');
               return { units: h.querySelectorAll('.fx-u').length, state: h.getAttribute('data-fx-state'), label: h.getAttribute('aria-label'),
                        op: getComputedStyle(h.querySelector('.fx-ui')).opacity }; }"""
        )
        check("hero text split into 6 letters with aria-label", hero["units"] == 6 and hero["label"] == "lumafx", json.dumps(hero))
        check("hero letters revealed (opacity 1)", hero["state"] and "in" in hero["state"] and hero["op"] == "1", json.dumps(hero))
        page.screenshot(path=os.path.join(SHOTS, "01-hero.png"))

        # border-beam
        scroll_to(page, "#border-beam .stage")
        beam = page.evaluate(
            """async () => { const c = document.querySelector('#border-beam .card');
               const cs = getComputedStyle(c, '::before'); const a1 = cs.getPropertyValue('--fx-angle');
               await new Promise(r => setTimeout(r, 300)); const a2 = getComputedStyle(c, '::before').getPropertyValue('--fx-angle');
               return { name: cs.animationName, mask: cs.maskImage || cs.webkitMaskImage, a1, a2,
                        dur: getComputedStyle(document.querySelectorAll('#border-beam .card')[1]).getPropertyValue('--fx-duration') }; }"""
        )
        check("border-beam animates the conic angle", beam["name"] == "fx-spin" and beam["a1"] != beam["a2"], json.dumps(beam))
        check("border-beam option mapped to CSS variable", beam["dur"].strip() == "9s", beam["dur"])
        page.screenshot(path=os.path.join(SHOTS, "02-border-beam.png"))

        # glass
        scroll_to(page, "#glass .glass-scene")
        page.wait_for_timeout(500)
        glass = page.evaluate(
            """() => { const g = document.querySelector('.glass-card');
               const id = (g.style.backdropFilter.match(/url\\("?#([\\w-]+)/) || [])[1];
               const f = id && document.getElementById(id);
               return { bf: g.style.backdropFilter, state: g.getAttribute('data-fx-state'),
                        map: f ? f.querySelector('feImage').getAttribute('href').slice(0, 22) : null,
                        prims: f ? f.children.length : 0 }; }"""
        )
        check("glass uses an SVG refraction filter in Chromium", glass["map"] == "data:image/png;base64," and glass["prims"] >= 8, json.dumps(glass))
        page.screenshot(path=os.path.join(SHOTS, "03-glass.png"))
        page.locator(".glass-scene").screenshot(path=os.path.join(SHOTS, "03b-glass-closeup.png"))

        # squircle
        scroll_to(page, "#squircle .stage")
        sq = page.evaluate("() => { const t = document.querySelector('#squircle [data-fx]'); const cs = getComputedStyle(t); return { shape: cs.getPropertyValue('corner-shape'), r: cs.borderTopLeftRadius, clip: t.style.clipPath }; }")
        check("squircle uses native corner-shape", "squircle" in sq["shape"] or "superellipse" in sq["shape"], json.dumps(sq))
        page.locator("#squircle .stage").screenshot(path=os.path.join(SHOTS, "04-squircle.png"))

        # shadow (cursor light)
        scroll_to(page, "#shadow .stage")
        x, y, b = center(page, "#shadow [data-fx-light]")
        page.mouse.move(b["x"] - 200, b["y"] - 150)
        page.wait_for_timeout(400)
        page.mouse.move(b["x"] - 220, b["y"] - 170)
        page.wait_for_timeout(600)
        shx = page.eval_on_selector("#shadow [data-fx-light]", "el => [el.style.getPropertyValue('--fx-shx'), el.style.getPropertyValue('--fx-shy')]")
        check("shadow follows the cursor light", shx[0] and float(shx[0]) > 0.05 and float(shx[1]) > 0.05, str(shx))
        page.locator("#shadow .stage").screenshot(path=os.path.join(SHOTS, "05-shadow.png"))

        # text-reveal
        scroll_to(page, "#tr-demo")
        page.wait_for_timeout(2200)
        tr = page.evaluate(
            """() => [...document.querySelectorAll('#tr-demo [data-fx]')].map(el => ({
                 units: el.querySelectorAll('.fx-u').length, state: el.getAttribute('data-fx-state'),
                 lines: new Set([...el.querySelectorAll('.fx-u')].map(u => u.style.getPropertyValue('--fx-i'))).size,
                 op: [...el.querySelectorAll('.fx-ui')].every(u => getComputedStyle(u).opacity === '1') }))"""
        )
        check("text-reveal words / chars / lines all split and visible", all(t["units"] > 0 and "in" in (t["state"] or "") and t["op"] for t in tr), json.dumps(tr))
        check("lines mode groups words by line", tr[2]["lines"] >= 2 and tr[2]["lines"] < tr[2]["units"], json.dumps(tr[2]))
        page.locator("#text-reveal .stage").screenshot(path=os.path.join(SHOTS, "06-text-reveal.png"))

        # shimmer
        scroll_to(page, "#shimmer .stage")
        sh = page.eval_on_selector("#shimmer [data-fx]", "el => { const cs = getComputedStyle(el); return [cs.animationName, cs.webkitTextFillColor, cs.backgroundClip || cs.webkitBackgroundClip]; }")
        check("shimmer clips an animated gradient to text", sh[0] == "fx-shimmer" and "text" in sh[2], str(sh))

        # scramble (hover)
        scroll_to(page, "#scramble .stage")
        x, y, _ = center(page, "#scramble a")
        page.mouse.move(x, y)
        page.wait_for_timeout(60)
        mid = page.text_content("#scramble a")
        page.wait_for_timeout(900)
        end = page.text_content("#scramble a")
        check("scramble decodes on hover and lands on the original", mid != "Hover · Work" and end == "Hover · Work", f"{mid!r} → {end!r}")

        # counter
        scroll_to(page, "#counter .stage")
        page.wait_for_timeout(2400)
        nums = page.eval_on_selector_all("#counter strong", "els => els.map(e => e.textContent)")
        check("counters land exactly on the original text", nums == ["12,480+", "€1.2M", "99.98%", "340 ms"], str(nums))

        # spotlight
        scroll_to(page, "#spotlight .stage")
        x, y, _ = center(page, "#spotlight .card")
        page.mouse.move(x - 40, y - 20)
        page.mouse.move(x - 30, y - 10)
        page.wait_for_timeout(500)
        sp = page.eval_on_selector("#spotlight .card", "el => [el.style.getPropertyValue('--fx-mx'), getComputedStyle(el.querySelector('.fx-spot')).opacity]")
        check("spotlight tracks the cursor and lights up", sp[0].endswith("px") and float(sp[1]) > 0.9, str(sp))
        page.locator("#spotlight .stage").screenshot(path=os.path.join(SHOTS, "07-spotlight.png"))

        # magnetic
        scroll_to(page, "#magnetic .stage")
        x, y, b = center(page, "#magnetic .btn.primary")
        page.mouse.move(x + b["width"] / 2 + 20, y + 10, steps=4)
        page.wait_for_timeout(500)
        pulled = page.eval_on_selector("#magnetic .btn.primary", "el => el.style.translate")
        page.mouse.move(x + 400, y + 300, steps=4)
        page.wait_for_timeout(1200)
        released = page.eval_on_selector("#magnetic .btn.primary", "el => el.style.translate")
        check("magnetic pulls toward the cursor and springs back", pulled not in ("", None) and released == "", f"{pulled!r} → {released!r}")

        # tilt
        scroll_to(page, "#tilt .stage")
        x, y, b = center(page, ".tilt-card")
        page.mouse.move(x, y)
        page.mouse.move(b["x"] + b["width"] * 0.85, b["y"] + b["height"] * 0.2, steps=5)
        page.wait_for_timeout(500)
        tl = page.eval_on_selector(".tilt-card", "el => [el.style.transform, getComputedStyle(el.querySelector('.fx-glare')).opacity, el.querySelector('[data-fx-depth]').style.transform]")
        check("tilt rotates in 3D with glare and depth layers", "rotateX" in tl[0] and float(tl[1]) > 0.3 and "translateZ" in tl[2], str(tl))
        page.locator("#tilt .stage").screenshot(path=os.path.join(SHOTS, "08-tilt.png"))

        # cursor-image
        scroll_to(page, "#cursor-image .stage")
        x, y, _ = center(page, ".work li:nth-child(1) a")
        page.mouse.move(x - 100, y, steps=3)
        page.mouse.move(x, y, steps=6)
        page.wait_for_timeout(600)
        ci = page.evaluate("() => { const f = document.querySelector('.fx-float'); return f && [f.getAttribute('data-state'), f.querySelector('img').getAttribute('src'), f.style.translate]; }")
        check("cursor-image shows the row's image at the cursor", ci and ci[0] == "in" and ci[1].endswith("theth.jpg"), str(ci))
        page.screenshot(path=os.path.join(SHOTS, "09-cursor-image.png"))
        x, y, _ = center(page, ".work li:nth-child(4) a")
        page.mouse.move(x, y, steps=4)
        page.wait_for_timeout(400)
        lab = page.evaluate("() => { const f = document.querySelector('.fx-float'); return [f.querySelector('.fx-float-label').textContent, getComputedStyle(document.querySelector('.work li:nth-child(4) a')).cursor]; }")
        check("cursor-image label mode hides the native cursor", lab[0] == "View case study →" and lab[1] == "none", str(lab))
        page.mouse.move(5, 5)

        # reveal + stagger
        scroll_to(page, "#reveal-demo")
        page.wait_for_timeout(1800)
        rv = page.eval_on_selector_all("#reveal-demo [data-fx]", "els => els.map(e => [e.getAttribute('data-fx-state'), getComputedStyle(e).opacity])")
        check("all 8 reveal presets revealed", all(s and "in" in s and o == "1" for s, o in rv), str(rv))
        page.click("[data-replay='#reveal-demo [data-fx]']")
        page.wait_for_timeout(120)
        hidden = page.eval_on_selector_all("#reveal-demo [data-fx]", "els => els.filter(e => Number(getComputedStyle(e).opacity) < 0.6).length")
        page.wait_for_timeout(1800)
        check("reveal replays after remount", hidden >= 4, f"{hidden} hidden mid-replay")
        scroll_to(page, "#stagger-demo")
        page.wait_for_timeout(1400)
        sg = page.eval_on_selector("#stagger-demo", "el => [el.getAttribute('data-fx-state'), [...el.children].map(c => c.style.getPropertyValue('--fx-i')).join(','), getComputedStyle(el.children[4]).opacity]")
        check("stagger indexes children and reveals them", sg[0] == "in" and sg[1] == "0,1,2,3,4" and sg[2] == "1", str(sg))

        # parallax (scroll-driven path)
        scroll_to(page, ".parallax-scene", "end")
        t1 = page.eval_on_selector(".parallax-scene img", "el => getComputedStyle(el).translate")
        scroll_to(page, ".parallax-scene", "start")
        t2 = page.eval_on_selector(".parallax-scene img", "el => getComputedStyle(el).translate")
        tl2 = page.eval_on_selector(".parallax-scene img", "el => getComputedStyle(el).animationTimeline")
        check("parallax runs on a CSS view() timeline and moves", "view" in tl2 and t1 != t2, f"{tl2} {t1} → {t2}")

        # stack
        page.eval_on_selector(".stack", "el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + el.offsetHeight * 0.55, behavior: 'instant' })")
        page.wait_for_timeout(500)
        st = page.eval_on_selector_all(".stack > article", "els => els.map(e => e.style.getPropertyValue('--fx-s'))")
        check("stack shrinks covered cards", st[0] and float(st[0]) < 0.99, str(st))
        page.screenshot(path=os.path.join(SHOTS, "10-stack.png"))

        # hscroll
        hs = page.evaluate("() => { const h = document.querySelector('.hscroll'); return [h.getBoundingClientRect().height, innerHeight, h.style.getPropertyValue('--fx-hs-dist')]; }")
        check("hscroll section is taller than the viewport by the track overflow", hs[0] > hs[1] + 300 and hs[2].endswith("px"), str(hs))
        page.eval_on_selector(".hscroll", "el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.5, behavior: 'instant' })")
        page.wait_for_timeout(400)
        tx = page.eval_on_selector(".hscroll [data-fx-track]", "el => new DOMMatrix(getComputedStyle(el).transform).m41 || parseFloat(getComputedStyle(el).translate)")
        check("hscroll moves the track sideways while pinned", tx is not None and tx < -100, str(tx))
        page.screenshot(path=os.path.join(SHOTS, "11-hscroll.png"))

        # marquee
        scroll_to(page, "#marquee .stage")
        mq = page.eval_on_selector(".wordmarks", "el => { const t = el.querySelectorAll('.fx-mq-track'); return [t.length, getComputedStyle(t[0]).animationName, el.style.getPropertyValue('--fx-mq-dur'), t[1] && t[1].getAttribute('aria-hidden'), t[1] && t[1].hasAttribute('inert')]; }")
        check("marquee fills the width with inert copies at a speed-based duration", mq[0] >= 2 and mq[1] == "fx-marquee" and mq[2].endswith("s") and mq[3] == "true" and mq[4], str(mq))
        page.locator("#marquee .stage").screenshot(path=os.path.join(SHOTS, "12-marquee.png"))

        # carousel
        scroll_to(page, "#carousel .stage")
        before = page.eval_on_selector(".slides", "el => el.scrollLeft")
        x, y, b = center(page, ".slides")
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x - 120, y, steps=4)
        page.mouse.move(x - 380, y, steps=6)
        page.mouse.up()
        page.wait_for_timeout(1400)
        after = page.eval_on_selector(".slides", "el => [el.scrollLeft, [...el.parentElement.querySelectorAll('.fx-dot')].findIndex(d => d.getAttribute('aria-current') === 'true'), getComputedStyle(el.children[0]).scale]")
        check("carousel mouse-drag scrolls with momentum and snaps", after[0] > before + 100 and after[1] >= 1, f"{before} → {after}")
        page.focus(".slides")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(900)
        k = page.eval_on_selector(".slides", "el => [...el.parentElement.querySelectorAll('.fx-dot')].findIndex(d => d.getAttribute('aria-current') === 'true')")
        check("carousel arrow keys move one slide", k == after[1] + 1, f"{after[1]} → {k}")
        page.locator("#carousel .stage").screenshot(path=os.path.join(SHOTS, "13-carousel.png"))

        # stories
        scroll_to(page, "#stories .stage")
        _, _, b = center(page, ".phone")
        page.mouse.click(b["x"] + b["width"] * 0.85, b["y"] + b["height"] * 0.5)
        page.wait_for_timeout(300)
        sto = page.eval_on_selector(".phone", "el => [el.querySelectorAll('.fx-st-bar').length, [...el.querySelectorAll('.slide')].findIndex(s => (s.getAttribute('data-fx-state')||'').includes('active')), [...el.querySelectorAll('.fx-st-bar')].map(b => b.getAttribute('data-s')||'-').join(' ')]")
        check("stories: 4 bars, tap right advances", sto[0] == 4 and sto[1] == 1, str(sto))
        page.wait_for_timeout(1500)
        page.locator("#stories .stage").screenshot(path=os.path.join(SHOTS, "14-stories.png"))
        page.wait_for_timeout(3600)
        auto = page.eval_on_selector(".phone", "el => [...el.querySelectorAll('.slide')].findIndex(s => (s.getAttribute('data-fx-state')||'').includes('active'))")
        check("stories auto-advance when a bar fills", auto == 2, str(auto))

        # ripple (WebGL)
        scroll_to(page, ".ripple-box")
        x, y, b = center(page, ".ripple-box")
        page.mouse.move(b["x"] + 20, y, steps=2)
        page.mouse.move(x, y, steps=10)
        page.wait_for_timeout(700)
        rp = page.eval_on_selector(".ripple-box", "el => [el.getAttribute('data-fx-state'), !!el.querySelector('canvas'), el.querySelector('canvas') && getComputedStyle(el.querySelector('canvas')).opacity]")
        check("ripple renders a WebGL layer on hover", rp[0] and "gl" in rp[0].split() and rp[1], str(rp))
        page.locator(".ripple-box").screenshot(path=os.path.join(SHOTS, "15-ripple.png"))
        page.mouse.move(5, 5)

        # morph + page presets
        scroll_to(page, "#morph .stage")
        page.click("[data-pick='1']")
        page.wait_for_timeout(900)
        mo = page.evaluate("() => [document.getElementById('detail').hidden, document.getElementById('detail-img').style.getPropertyValue('view-transition-name'), document.getElementById('detail-title').textContent]")
        check("morph opens the detail with the shared transition name", mo[0] is False and mo[1] == "pic-1" and mo[2] == "Ksamil", str(mo))
        page.click("#detail-back")
        page.wait_for_timeout(900)
        page.click("[data-page-preset='slide']")
        page.wait_for_timeout(2000)
        pg = page.evaluate("() => [document.getElementById('pages').dataset.page, document.documentElement.hasAttribute('data-fx-transition')]")
        check("page preset transition runs and cleans up", pg == ["2", False], str(pg))

        # ================================================================== v0.2
        print("\nv0.2 · navigation, components, media, live")
        pl = page.evaluate("() => [document.querySelector('#loader').hasAttribute('data-fx-done'), document.documentElement.classList.contains('fx-loading'), document.querySelector('#loader [data-fx-count]').textContent]")
        check("preloader counted to 100 and lifted", pl == [True, False, "100"], str(pl))

        page.evaluate("scrollTo({ top: 0, behavior: 'instant' })")
        page.wait_for_timeout(400)
        top = page.evaluate("() => { const l = document.querySelector('.site-head [data-fx-logo]'); return [l.style.transform, l.getBoundingClientRect().width / l.offsetWidth] }")
        page.evaluate("scrollTo({ top: 700, behavior: 'instant' })")
        page.wait_for_timeout(400)
        docked = page.evaluate("() => [document.querySelector('.site-head [data-fx-logo]').style.transform, document.querySelector('.site-head').getAttribute('data-fx-state')]")
        check("smart-header: hero wordmark is scaled up, then docks into the bar", top[1] > 5 and docked[0] == "" and "docked" in (docked[1] or ""), f"{top} → {docked}")
        page.evaluate("scrollTo({ top: 1600, behavior: 'instant' })")
        page.wait_for_timeout(300)
        page.evaluate("scrollTo({ top: 2400, behavior: 'instant' })")
        page.wait_for_timeout(400)
        hid = page.eval_on_selector(".site-head", "el => el.getAttribute('data-fx-state')")
        page.evaluate("scrollTo({ top: 2200, behavior: 'instant' })")
        page.wait_for_timeout(500)
        back = page.eval_on_selector(".site-head", "el => [el.getAttribute('data-fx-state'), getComputedStyle(el).backdropFilter]")
        check("smart-header hides on the way down and returns as glass", "hidden" in hid and "hidden" not in back[0] and "scrolled" in back[0] and "blur" in back[1], f"{hid} → {back}")
        page.screenshot(path=os.path.join(SHOTS, "22-header-glass.png"))

        sp = page.eval_on_selector("[data-fx~=scroll-progress]", "el => [getComputedStyle(el).animationName, getComputedStyle(el).animationTimeline]")
        check("scroll-progress runs on a scroll() timeline", sp[0] == "fx-progress" and "scroll" in sp[1], str(sp))

        sb = page.evaluate("() => ({ rail: !!document.querySelector('.fx-sb'), html: document.documentElement.hasAttribute('data-fx-scrollbar'), marks: document.querySelectorAll('.fx-sb-marks i').length, native: getComputedStyle(document.documentElement).scrollbarWidth })")
        check("scrollbar replaces the native one and marks every section", sb["rail"] and sb["html"] and sb["marks"] >= 40 and sb["native"] == "none", json.dumps(sb))
        page.mouse.move(1300, 450)
        page.mouse.move(1430, 450, steps=5)
        page.wait_for_timeout(500)
        tip = page.evaluate("() => { const r = document.querySelector('.fx-sb'); const t = r.querySelector('.fx-sb-tip'); const b = t.getBoundingClientRect(); return [r.getAttribute('data-fx-state'), t.textContent, getComputedStyle(t).opacity, Math.round(b.top + b.height / 2)] }")
        check("hovering the scrollbar shows the section at that point, next to the cursor", "tip" in tip[0] and "%" in tip[1] and " · " in tip[1] and tip[2] == "1" and abs(tip[3] - 450) < 30, str(tip))
        page.screenshot(path=os.path.join(SHOTS, "23-scrollbar-tip.png"), clip={"x": 1040, "y": 300, "width": 400, "height": 300})
        before = page.evaluate("window.scrollY")
        page.mouse.click(1430, 820)
        page.wait_for_timeout(1500)
        after = page.evaluate("window.scrollY")
        check("clicking the scrollbar track jumps down the page", after > before + 1000, f"{before} → {after}")
        page.mouse.move(700, 450)

        scroll_to(page, "#page-transition .stage")
        page.click("[data-pt=circle]")
        page.wait_for_timeout(350)
        ptm = page.evaluate("() => { const l = document.querySelector('.fx-pt'); return [l.dataset.style, l.hasAttribute('data-active'), getComputedStyle(l).visibility] }")
        page.screenshot(path=os.path.join(SHOTS, "24-page-transition.png"))
        page.wait_for_timeout(2600)
        ptd = page.evaluate("() => { const l = document.querySelector('.fx-pt'); return [l.hasAttribute('data-active'), l.hasAttribute('data-covered')] }")
        check("page-transition covers and reveals in place (circle)", ptm == ["circle", True, "visible"] and ptd == [False, False], f"{ptm} {ptd}")

        scroll_to(page, "#modal .stage")
        page.click("#modal [data-fx-open='#join']")
        page.wait_for_timeout(200)
        mid = page.evaluate("() => { const g = document.querySelector('#join .fx-md-goo'); return [document.querySelector('#join').open, getComputedStyle(g).filter, getComputedStyle(g).display === 'block' && document.querySelector('#join .fx-md-shape').style.transform.includes('scale'), getComputedStyle(document.documentElement).overflow] }")
        page.screenshot(path=os.path.join(SHOTS, "25-modal-liquid.png"))
        page.wait_for_timeout(1400)
        shown = page.evaluate("() => [document.querySelector('#join').getAttribute('data-fx-state'), getComputedStyle(document.querySelector('#join .fx-md-panel')).opacity, document.activeElement.closest('dialog') && document.activeElement.closest('dialog').id]")
        check("liquid modal: gooey layer drawn frame by frame, scroll locked", mid[0] and "url" in mid[1] and mid[2] and mid[3] == "hidden", str(mid))
        check("liquid modal settles open with focus inside", "shown" in (shown[0] or "") and shown[1] == "1" and shown[2] == "join", str(shown))
        rest = page.evaluate("() => [getComputedStyle(document.querySelector('#join .fx-md-goo')).display, getComputedStyle(document.querySelector('#join .fx-md-panel')).backgroundImage.includes('gradient')]")
        check("at rest the panel draws itself (crisp edges) and the liquid layer is off", rest == ["none", True], str(rest))
        page.screenshot(path=os.path.join(SHOTS, "26-modal-open.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(1500)
        closed = page.evaluate("() => [document.querySelector('#join').open, document.querySelector('#join').getAttribute('data-fx-state') || '', getComputedStyle(document.documentElement).overflow]")
        check("Esc melts the modal back and unlocks scrolling", closed[0] is False and "closing" not in closed[1] and closed[2] != "hidden", str(closed))

        scroll_to(page, "#hovercard .stage")
        page.hover("#hovercard a[data-fx-for='#hc-tirana']")
        page.wait_for_timeout(700)
        hc = page.evaluate("() => { const c = document.getElementById('fx-hovercard'); const r = c.getBoundingClientRect(); return [c.getAttribute('data-state'), !!c.querySelector('img'), r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, getComputedStyle(c).opacity] }")
        check("hovercard springs open next to the word, inside the viewport", hc == ["open", True, True, "1"], str(hc))
        page.screenshot(path=os.path.join(SHOTS, "27-hovercard.png"))
        page.mouse.move(700, 80)
        page.wait_for_timeout(500)

        page.click(".fx-chat-launch")
        page.wait_for_timeout(900)
        page.click(".fx-chat-quick button >> nth=2")
        page.wait_for_timeout(300)
        typing = page.evaluate("() => !!document.querySelector('.fx-typing')")
        page.wait_for_timeout(2500)
        ch = page.evaluate("() => { const c = document.querySelector('[data-fx~=chat]'); return [c.hasAttribute('data-open'), getComputedStyle(c.querySelector('.fx-chat-panel')).visibility, c.querySelectorAll('.fx-msg[data-from=me]').length, c.querySelectorAll('.fx-msg[data-from=them]').length, c.querySelector('.fx-chat-launch').getAttribute('aria-expanded')] }")
        check("chat opens, sends a quick reply, shows typing, gets an answer", ch == [True, "visible", 1, 2, "true"] and typing, f"{ch} typing={typing}")
        page.screenshot(path=os.path.join(SHOTS, "28-chat.png"))
        page.click(".fx-chat-launch")
        page.wait_for_timeout(700)

        scroll_to(page, "#dock .stage")
        x, y, _ = center(page, "[data-fx=dock] a >> nth=2")
        page.mouse.move(x - 60, y)
        page.mouse.move(x, y, steps=6)
        page.wait_for_timeout(700)
        dk = page.evaluate("() => [...document.querySelectorAll('[data-fx=dock] > a')].map(a => +(a.style.getPropertyValue('--fx-s') || 1))")
        check("dock magnifies the hovered icon most, neighbours less", dk[2] > 1.5 and 1.05 < dk[1] < dk[2] and dk[0] < dk[1], str([round(v, 2) for v in dk]))
        page.screenshot(path=os.path.join(SHOTS, "29-dock.png"))

        scroll_to(page, "#hover-icon .stage")
        page.hover("#hover-icon ul >> nth=0 >> a >> nth=1")
        page.wait_for_timeout(700)
        hi = page.evaluate("() => { const a = document.querySelectorAll('#hover-icon ul')[0].querySelectorAll('a')[1]; const b = document.querySelectorAll('#hover-icon ul')[0].querySelectorAll('a')[0]; const s = getComputedStyle(a, '::before'); return [s.content, s.opacity, parseFloat(s.maxWidth) > 0, getComputedStyle(b, '::before').opacity] }")
        check("hover-icon slides the link's icon in (menu mode)", hi[0] == '"◐"' and hi[1] == "1" and hi[2] and hi[3] == "0", str(hi))

        scroll_to(page, "#lightbox .stage")
        page.click("#lightbox a >> nth=1")
        page.wait_for_timeout(1000)
        lb1 = page.evaluate("() => { const d = document.querySelector('dialog.fx-lb'); return [d.open, d.querySelector('.fx-lb-img').src.split('/').pop(), d.querySelector('.fx-lb-count').textContent] }")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(500)
        lb2 = page.evaluate("() => document.querySelector('.fx-lb-count').textContent")
        page.screenshot(path=os.path.join(SHOTS, "30-lightbox.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(1000)
        lb3 = page.evaluate("() => document.querySelector('dialog.fx-lb').open")
        check("lightbox opens the full image, pages with arrows, closes with Esc", lb1 == [True, "ksamil-wide.jpg", "2 / 4"] and lb2 == "3 / 4" and lb3 is False, f"{lb1} {lb2} {lb3}")

        scroll_to(page, "#ir-demo")
        page.wait_for_timeout(2600)
        ir = page.evaluate("() => [...document.querySelectorAll('#ir-demo .ir')].map(e => [e.getAttribute('data-fx-state'), getComputedStyle(e).clipPath])")
        check("image-reveal: all four uncovered", all(st and "in" in st and cp == "none" for st, cp in ir), str(ir))

        ex = page.eval_on_selector("#expand [data-fx]", "el => [getComputedStyle(el).animationName, getComputedStyle(el).animationTimeline]")
        check("expand runs on a view() timeline", ex[0] == "fx-expand" and "view" in ex[1], str(ex))

        scroll_to(page, ".trail-zone")
        x, y, b = center(page, ".trail-zone")
        for k in range(16):
            page.mouse.move(b["x"] + 60 + k * 40, y + (k % 4) * 15)
        page.wait_for_timeout(120)
        tr = page.evaluate("() => document.querySelectorAll('.trail-zone > .fx-trail').length")
        check("image-trail drops photos along the cursor path", tr >= 4, str(tr))
        page.screenshot(path=os.path.join(SHOTS, "31-image-trail.png"))
        page.mouse.move(10, 400)

        vy = page.evaluate("() => { const s = document.querySelector('#video-scrub .scrub'); return [s.getBoundingClientRect().top + scrollY, s.offsetHeight - innerHeight] }")
        page.evaluate(f"scrollTo({{ top: {vy[0]} + {vy[1]} * 0.6, behavior: 'instant' }})")
        page.wait_for_timeout(2200)
        v1 = page.evaluate("() => { const v = document.querySelector('#video-scrub video'); return [v.currentTime, v.duration, v.currentSrc.slice(0, 5)] }")
        page.screenshot(path=os.path.join(SHOTS, "32-video-scrub.png"))
        page.evaluate(f"scrollTo({{ top: {vy[0]} + {vy[1]} * 0.1, behavior: 'instant' }})")
        page.wait_for_timeout(2200)
        v2 = page.evaluate("document.querySelector('#video-scrub video').currentTime")
        check("video-scrub plays forward with the scroll and rewinds back", v1[0] > v1[1] * 0.4 and v2 < v1[0] - 0.8, f"{v1} → {v2}")

        fy = page.evaluate("() => { const s = document.querySelector('#frames .scrub'); return [s.getBoundingClientRect().top + scrollY, s.offsetHeight - innerHeight] }")
        page.evaluate(f"scrollTo({{ top: {fy[0]} + {fy[1]} * 0.8, behavior: 'instant' }})")
        page.wait_for_timeout(2500)
        fr = page.evaluate("""() => { const s = document.querySelector('#frames .scrub'); const c = s.querySelector('canvas'); const g = c.getContext('2d');
            const d = g.getImageData(c.width / 2, Math.round(c.height * 0.2), 1, 1).data; return [s.getAttribute('data-fx-state'), c.width > 0, d[0] + d[1] + d[2]] }""")
        check("frames draws the sequence on a canvas (dusk sky at 80%)", "loaded" in (fr[0] or "") and fr[1] and 0 < fr[2] < 400, str(fr))
        page.screenshot(path=os.path.join(SHOTS, "36-frames.png"))

        dp = page.eval_on_selector("#dapple [data-fx]", "el => { const s = getComputedStyle(el, '::after'); return [s.animationName, s.backgroundImage.startsWith('url(\"data:image/svg+xml'), s.mixBlendMode] }")
        check("dapple sways procedural leaf shadows", dp == ["fx-dapple", True, "multiply"], str(dp))
        scroll_to(page, "#dapple [data-fx]")
        page.screenshot(path=os.path.join(SHOTS, "37-dapple.png"))

        scroll_to(page, "#svg-draw .stage")
        page.wait_for_timeout(3200)
        sd = page.evaluate("() => { const s = document.querySelector('#svg-draw svg'); return [s.getAttribute('data-fx-state'), [...s.querySelectorAll('path')].every(p => p.style.strokeDashoffset === '0'), s.querySelectorAll('.fx-pulse').length] }")
        check("svg-draw draws every path, then sends pulses along them", sd == ["in", True, 10], str(sd))
        page.screenshot(path=os.path.join(SHOTS, "38-svg-draw.png"))

        scroll_to(page, "#field")
        x, y, b = center(page, "#field")
        page.mouse.move(x - 100, y)
        page.mouse.move(x, y, steps=5)
        page.wait_for_timeout(400)
        df = page.evaluate("() => { const c = document.querySelector('#field > .fx-dotfield'); return [c.width > 0, c.height > 0, document.getElementById('fx-x').textContent] }")
        check("dot-field paints behind the content and tracks the cursor", df[0] and df[1] and df[2] != "0.000", str(df))
        page.screenshot(path=os.path.join(SHOTS, "39-dot-field.png"))

        scroll_to(page, "#typewriter .term")
        h0 = page.eval_on_selector("#typewriter .term-body", "el => el.offsetHeight")
        page.wait_for_timeout(1500)
        page.wait_for_function("() => document.querySelector('#typewriter .term-body .fx-tw').textContent === '$ npm i lumafx'", timeout=10000)
        tw = page.evaluate("() => { const b = document.querySelector('#typewriter .term-body'); return [b.offsetHeight, b.querySelector('.fx-tw').textContent, b.querySelectorAll('.fx-sr').length, !!b.querySelector('.fx-caret')] }")
        check("typewriter types line by line without moving the layout", tw[0] == h0 and tw[1] == "$ npm i lumafx" and tw[2] == 3 and tw[3], f"{h0} {tw}")

        rw0 = page.evaluate("document.querySelector('#rotate-words .fx-rw-word:last-child').textContent")
        page.wait_for_timeout(2600)
        rw1 = page.evaluate("document.querySelector('#rotate-words .fx-rw-word:last-child').textContent")
        check("rotate-words cycles to the next word", rw0 != rw1, f"{rw0} → {rw1}")

        c0 = page.evaluate("[...document.querySelectorAll('#clock time')].map(t => t.textContent)")
        page.wait_for_timeout(1100)
        c1 = page.evaluate("document.querySelector('#clock time').textContent")
        import re as _re
        check("clocks tick in their own time zones", all(_re.match(r"^\d\d.\d\d(.\d\d)?$", t) for t in c0) and c1 != c0[0] and len(set(c0)) == 4, f"{c0} → {c1}")

        page.mouse.move(5, 5)
        scroll_to(page, "#ring .stage")
        r0 = page.eval_on_selector(".fx-ring-track", "el => el.style.transform")
        page.wait_for_timeout(600)
        r1 = page.eval_on_selector(".fx-ring-track", "el => el.style.transform")
        x, y, _ = center(page, "[data-fx=ring]")
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x - 260, y, steps=8)
        page.mouse.up()
        page.wait_for_timeout(300)
        r2 = page.eval_on_selector(".fx-ring-track", "el => el.style.transform")
        check("ring turns by itself and follows a drag", "rotateY" in r0 and r0 != r1 and r2 != r1, f"{r0} | {r1} | {r2}")
        page.mouse.move(x, y - 400)
        page.screenshot(path=os.path.join(SHOTS, "40-ring.png"))

        # ---------------- v0.3: cards, press, drawers, forms, loader, builder kit
        scroll_to(page, "#card .cards-grid")
        gx, gy, _ = center(page, "[data-fx~=card][data-fx-style=glow]")
        page.mouse.move(gx - 40, gy - 30)
        page.mouse.move(gx + 20, gy + 10, steps=3)
        page.wait_for_timeout(150)
        glow = page.eval_on_selector("[data-fx~=card][data-fx-style=glow]", "el => el.style.getPropertyValue('--fx-mx')")
        flipc = "[data-fx~=card][data-fx-style=flip]"
        page.click(flipc + " h3")
        page.wait_for_timeout(900)
        fl = page.eval_on_selector(flipc, "el => [el.hasAttribute('data-flipped'), getComputedStyle(el.querySelector('.fx-card-flip')).transform]")
        check("cards: glow follows the cursor, flip turns to its back", glow.endswith("px") and fl[0] and fl[1] != "none", f"{glow} {fl}")
        page.screenshot(path=os.path.join(SHOTS, "41-cards.png"))

        scroll_to(page, "#press .press-row")
        page.click("#press .p1")
        rip = page.evaluate("document.querySelectorAll('#press .p1 .fx-press-ripple').length")
        page.click("#press .p2")
        spark = page.evaluate("[document.querySelectorAll('body > .fx-spark').length, document.querySelector('#press .p2').textContent]")
        check("press: ripple inside the button, burst of sparks and a done label", rip >= 1 and spark[0] >= 6 and spark[1] == "Sent ✓", f"{rip} {spark}")

        scroll_to(page, "#drawer .stage")
        page.click("[data-fx-open='#dr-edit']")
        page.wait_for_timeout(900)
        de = page.evaluate("() => { const r = document.querySelector('#dr-edit .fx-md-panel').getBoundingClientRect(); return [document.querySelector('#dr-edit').open, Math.round(innerWidth - r.right), r.width > 300, getComputedStyle(document.documentElement).overflow] }")
        page.screenshot(path=os.path.join(SHOTS, "42-drawer.png"))
        page.mouse.click(120, 450)
        page.wait_for_timeout(800)
        dc = page.evaluate("document.querySelector('#dr-edit').open")
        check("drawer slides in at the right edge, locks scroll, closes on an outside click", de[0] and de[1] <= 20 and de[2] and de[3] == "hidden" and dc is False, f"{de} closed={not dc}")
        page.click("[data-fx-open='#dr-push']")
        page.wait_for_timeout(900)
        pu = page.evaluate("() => { const root = document.querySelector('[data-fx-sheet-root]'); return [document.querySelector('#dr-push').open, Math.round(root.getBoundingClientRect().left)] }")
        page.keyboard.press("Escape")
        page.wait_for_timeout(800)
        pu2 = page.evaluate("Math.round(document.querySelector('[data-fx-sheet-root]').getBoundingClientRect().left)")
        check("push drawer slides the whole page over, and back on close", pu[0] and pu[1] < -300 and abs(pu2) <= 1, f"{pu} → {pu2}")
        page.click("[data-fx-open='#dr-dock']")
        page.wait_for_timeout(900)
        dk3 = page.evaluate("() => { const root = document.querySelector('[data-fx-sheet-root]'); return [document.querySelector('#dr-dock').open, parseFloat(getComputedStyle(root).marginLeft), getComputedStyle(document.documentElement).overflow] }")
        before_y = page.evaluate("scrollY")
        page.mouse.move(900, 500)
        page.mouse.wheel(0, 400)
        page.wait_for_timeout(400)
        after_y = page.evaluate("scrollY")
        page.keyboard.press("Escape")
        page.wait_for_timeout(800)
        dk4 = page.evaluate("[document.querySelector('#dr-dock').open, parseFloat(getComputedStyle(document.querySelector('[data-fx-sheet-root]')).marginLeft)]")
        check("dock drawer: page reflows beside it and still scrolls; Esc closes", dk3[0] and dk3[1] > 300 and dk3[2] != "hidden" and after_y > before_y and dk4 == [False, 0], f"{dk3} {before_y}→{after_y} {dk4}")
        for d in ["#dr-glass", "#dr-scale", "#dr-liquid"]:
            page.click(f"[data-fx-open='{d}']")
            page.wait_for_timeout(1300)
            op = page.evaluate(f"document.querySelector('{d}').getAttribute('data-fx-state')")
            page.keyboard.press("Escape")
            page.wait_for_timeout(1100)
            cl = page.evaluate(f"document.querySelector('{d}').open")
            check(f"{d[4:]} drawer opens and closes", "shown" in (op or "") and cl is False, f"{op} {cl}")

        scroll_to(page, "#form .stage")
        page.click("#join-form [type=submit]")
        page.wait_for_timeout(300)
        fe = page.evaluate("[document.querySelectorAll('#join-form [aria-invalid=true]').length, document.activeElement.name]")
        page.fill("#join-form [name=name]", "Arni Kajolli")
        page.fill("#join-form [name=phone]", "069 123 4567")
        page.fill("#join-form [name=email]", "arni@gmial.com")
        page.fill("#join-form [name=password]", "Tirana-2026!")
        page.fill("#join-form [name=confirm]", "Tirana-2026!")
        page.fill("#join-form [name=about]", "An events platform for Albania")
        page.check("#join-form [name=terms]")
        page.wait_for_timeout(300)
        hint = page.evaluate("[document.querySelector('#join-form .fx-hint[data-show]') && document.querySelector('#join-form .fx-hint[data-show]').textContent, document.querySelector('#join-form [name=phone]').value]")
        page.click("#join-form .fx-hint[data-show] button")
        page.fill("#join-form [name=email]", "taken@sphere.al")
        page.click("#join-form [type=submit]")
        page.wait_for_timeout(1500)
        se = page.evaluate("[...document.querySelectorAll('#join-form [aria-invalid=true]')].map(i => i.name + ': ' + document.getElementById(i.getAttribute('aria-describedby')).textContent)")
        page.fill("#join-form [name=email]", "arni@sphere.al")
        page.click("#join-form [type=submit]")
        page.wait_for_timeout(1600)
        ok = page.evaluate("[document.querySelector('#join-form').getAttribute('data-fx-state'), document.querySelector('#join-form [data-fx-success]').hidden]")
        check("form: errors on submit, typo fix, phone format, server error on its field, success", fe[0] >= 4 and fe[1] == "name" and "gmail.com" in (hint[0] or "") and hint[1] == "+355 69 123 4567" and se == ["email: That email is already on the list."] and "sent" in (ok[0] or "") and ok[1] is False, f"{fe} {hint} {se} {ok}")
        page.screenshot(path=os.path.join(SHOTS, "43-form.png"))

        scroll_to(page, "#loader-3d .loaders")
        page.wait_for_timeout(1200)
        ld = page.evaluate("""() => [...document.querySelectorAll('#loader-3d .loaders [data-fx~=loader-3d]')].map((el) => {
            const c = el.querySelector('canvas'); if (!c) return null;
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0;
            for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 200) lit++;
            return [el.getAttribute('role'), el.getAttribute('data-fx-state'), lit / (d.length / 28) > 0.12];
        })""")
        check("3D loaders render glossy slabs on the GPU (one shared context)", all(x and x[0] == "progressbar" and x[1] == "ready" and x[2] for x in ld) and len(ld) == 3, str(ld))
        page.locator("#loader-3d .loaders").screenshot(path=os.path.join(SHOTS, "44-loader-3d.png"))
        scroll_to(page, "#posts", "start")
        page.click("#more-posts")
        page.wait_for_timeout(200)
        busy = page.evaluate("[document.querySelector('#posts').getAttribute('aria-busy'), !!document.querySelector('#posts .fx-loading-box [data-fx~=loader-3d]')]")
        page.wait_for_function("() => document.querySelectorAll('#posts .post').length === 6 && !document.querySelector('#posts .fx-loading-box')", timeout=15000)
        check("lumafx.loading shows the loader while posts load, then the new posts", busy == ["true", True], str(busy))

        scroll_to(page, "#editor .builder", "start")
        page.wait_for_timeout(500)
        bk0 = page.evaluate("[...document.querySelectorAll('#bk-canvas > .bk-block')].map(b => b.dataset.block)")
        page.locator("#bk-panel [data-preset='zoom-in']").click()
        bk1 = page.evaluate("[document.querySelector('.bk-hero').getAttribute('data-fx'), document.querySelector('.bk-hero').getAttribute('data-fx-from'), document.querySelector('#bk-panel').shadowRoot.querySelector('.code code').textContent]")
        check("builder panel applies a preset to the selected block", bk1[0] == "reveal" and bk1[1] == "zoom" and 'data-fx-from="zoom"' in bk1[2], str(bk1))
        cb = page.locator("#bk-canvas > .bk-cta").bounding_box()
        fb = page.locator("#bk-canvas > [data-block=features]").bounding_box()
        page.mouse.move(cb["x"] + 40, cb["y"] + cb["height"] / 2)
        page.mouse.down()
        page.mouse.move(cb["x"] + 60, cb["y"] + cb["height"] / 2 - 20, steps=4)
        page.mouse.move(fb["x"] + 120, fb["y"] + 15, steps=12)
        page.wait_for_timeout(200)
        lifted = page.evaluate("[!!document.querySelector('.fx-sort-ghost'), document.querySelector('#bk-canvas > .bk-cta').classList.contains('fx-sort-origin')]")
        page.mouse.up()
        page.wait_for_timeout(700)
        bk2 = page.evaluate("[[...document.querySelectorAll('#bk-canvas > .bk-block')].map(b => b.dataset.block), document.querySelectorAll('.fx-sort-ghost').length]")
        qb = page.locator("#bk-palette [data-block=quote]").bounding_box()
        page.mouse.move(qb["x"] + 30, qb["y"] + 20)
        page.mouse.down()
        page.mouse.move(qb["x"] + 60, qb["y"] + 30, steps=4)
        lb = page.locator("#bk-canvas > [data-block=features]").bounding_box()
        page.mouse.move(lb["x"] + 200, lb["y"] + 12, steps=12)
        page.wait_for_timeout(600)
        # The slot opened somewhere on the way: aim again at the block, like a person would.
        lb = page.locator("#bk-canvas > [data-block=features]").bounding_box()
        page.mouse.move(lb["x"] + 200, lb["y"] + 12, steps=3)
        page.wait_for_timeout(600)
        page.mouse.up()
        page.wait_for_timeout(900)
        bk3 = page.evaluate("[...document.querySelectorAll('#bk-canvas > .bk-block')].map(b => b.dataset.block)")
        check("builder: drag lifts a ghost and reorders; palette drops a new block", lifted == [True, True] and bk2[0].index("cta") < bk2[0].index("features") and bk2[1] == 0 and len(bk3) == len(bk0) + 1 and bk3[bk3.index("quote") + 1] == "features", f"{bk0} {lifted} {bk2} {bk3}")
        page.click("#bk-export")
        ex = page.evaluate("document.getElementById('bk-code').textContent")
        check("builder exports clean HTML with the effects as attributes", 'data-fx="reveal"' in ex and 'data-fx-from="zoom"' in ex and "bk-selected" not in ex and "fx-u" not in ex, ex[:160])
        page.locator("#editor .builder").screenshot(path=os.path.join(SHOTS, "45-builder.png"))

        # ---------------- v0.4: intelligent UI
        orb = page.evaluate("() => { const r = document.querySelector('#orbit-ui > .fxui'); return [!!r && r.classList.contains('fxui-seen'), r && r.dataset.theme, document.querySelectorAll('#orbit-ui .fxui-b').length, document.querySelectorAll('#orbit-ui .fxui-b-lineup [data-k]').length] }")
        check("Orbit article: server-rendered blocks hydrate in place (light theme, 11 players)", orb[0] and orb[1] == "light" and orb[2] >= 6 and orb[3] >= 11, str(orb))
        scroll_to(page, "#ui .ui-chat", "start")
        page.wait_for_function("() => document.getElementById('ui-json').hasAttribute('data-done')", timeout=60000)
        chat = page.evaluate("() => [document.querySelectorAll('#ui-out .fxui-b').length, document.querySelector('#ui-count').textContent, !!document.querySelector('#ui-out .fxui[aria-busy]')]")
        check("chat demo streams a document into blocks and settles", chat[0] >= 8 and chat[1].endswith("blocks") and not chat[2], str(chat))
        page.click("#ui-prompts [data-doc=events]")
        page.wait_for_timeout(600)
        mid = page.evaluate("() => [document.querySelectorAll('#ui-out .fxui-b').length, document.querySelector('#ui-out .fxui').getAttribute('aria-busy')]")
        page.wait_for_function("() => document.getElementById('ui-json').hasAttribute('data-done')", timeout=60000)
        page.locator("#ui-out .fxui-b-tickets input[type=radio]:not([disabled])").first.check(force=True)
        page.wait_for_timeout(200)
        picked = page.evaluate("() => document.querySelectorAll('#ui-convo .ui-ask').length")
        check("switching questions re-streams (busy while writing) and selections reach the chat", mid[1] == "true" and picked == 2, f"{mid} {picked}")
        page.locator("#ui .ui-chat").screenshot(path=os.path.join(SHOTS, "50-ui-chat.png"))
        page.locator("#ui-blog .orbit").screenshot(path=os.path.join(SHOTS, "51-ui-orbit.png"))

        # A real page-to-page transition: cover, navigate, arrive covered, reveal.
        nav_err = []
        np_ = new_page(browser, base + "/index.html", nav_err, viewport={"width": 1280, "height": 800}, color_scheme="dark")
        np_.evaluate("() => { const a = document.createElement('a'); a.href = '/index.html?next'; a.dataset.transition = ''; a.id = 'go'; a.textContent = 'next page'; a.style.cssText = 'position:fixed;left:20px;bottom:20px;z-index:99'; document.body.append(a); }")
        np_.click("#go")
        np_.wait_for_timeout(300)
        leaving = np_.evaluate("() => [document.querySelector('.fx-pt').hasAttribute('data-active'), sessionStorage.getItem('fx-pt') !== null]")
        np_.wait_for_url("**/index.html?next", timeout=8000)
        np_.wait_for_load_state("domcontentloaded")
        arriving = np_.evaluate("() => [document.querySelector('.fx-pt') && document.querySelector('.fx-pt').hasAttribute('data-active'), sessionStorage.getItem('fx-pt')]")
        np_.wait_for_timeout(2500)
        settled = np_.evaluate("() => [document.querySelector('.fx-pt').hasAttribute('data-active'), document.documentElement.classList.contains('fx-pt-arriving')]")
        check("page-transition across a real navigation: covers, arrives covered, reveals", leaving == [True, True] and arriving[0] and arriving[1] is None and settled == [False, False], f"{leaving} {arriving} {settled}")
        check("no console errors (navigation)", not nav_err, "; ".join(nav_err[:5]))
        np_.context.close()

        # offscreen pausing
        page.evaluate("() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })")
        page.wait_for_timeout(500)
        paused = page.eval_on_selector("#border-beam .card", "el => [el.hasAttribute('data-fx-paused'), getComputedStyle(el, '::before').animationPlayState]")
        check("loops pause while off-screen", paused[0] and paused[1] == "paused", str(paused))

        overflow = page.evaluate("() => document.scrollingElement.scrollWidth - innerWidth")
        check("no horizontal page overflow (desktop)", overflow <= 0, str(overflow))
        check("no console errors (desktop)", not errors, "; ".join(errors[:5]))

        # light theme snapshot
        light_errors = []
        lp = new_page(browser, base + "/index.html", light_errors, viewport={"width": 1440, "height": 900}, color_scheme="light")
        lp.wait_for_timeout(1500)
        lp.screenshot(path=os.path.join(SHOTS, "16-hero-light.png"))
        scroll_to(lp, "#border-beam .stage")
        lp.screenshot(path=os.path.join(SHOTS, "17-beam-light.png"))
        lp.context.close()

        # ------------------------------------------------------------------ forced fallbacks
        print("\nFallback paths (no scroll-driven CSS, no corner-shape, non-Chromium glass)")
        ferr = []
        fp = new_page(browser, base + "/fallback.html", ferr, viewport={"width": 1280, "height": 860})
        fenv = fp.evaluate("({...lumafx.env})")
        check("fallback flags applied", not fenv["sda"] and not fenv["cornerShape"] and not fenv["chromium"], json.dumps(fenv))
        sq = fp.eval_on_selector("#squircle [data-fx]", "el => [el.style.clipPath.slice(0, 10), getComputedStyle(el).getPropertyValue('corner-shape')]")
        check("squircle falls back to an SVG clip-path", sq[0].startswith("path(") and "squircle" not in sq[1], str(sq))
        fp.locator("#squircle .stage").screenshot(path=os.path.join(SHOTS, "18-squircle-fallback.png"))
        g = fp.eval_on_selector(".glass-card", "el => [el.style.backdropFilter, getComputedStyle(el).backdropFilter]")
        check("glass falls back to frosted blur", g[0] == "" and "blur" in g[1], str(g))
        scroll_to(fp, ".parallax-scene", "end")
        a = fp.eval_on_selector(".parallax-scene img", "el => [el.style.translate, getComputedStyle(el).animationName]")
        scroll_to(fp, ".parallax-scene", "start")
        fp.wait_for_timeout(200)
        b2 = fp.eval_on_selector(".parallax-scene img", "el => el.style.translate")
        check("parallax JS fallback moves the element", a[0] and a[0] != b2 and a[1] == "none", f"{a} → {b2}")
        fp.eval_on_selector(".hscroll", "el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.6, behavior: 'instant' })")
        fp.wait_for_timeout(300)
        ht = fp.eval_on_selector(".hscroll [data-fx-track]", "el => [el.style.translate, getComputedStyle(el).animationName]")
        check("hscroll JS fallback translates the track", ht[0].startswith("-") and ht[1] == "none", str(ht))
        check("no console errors (fallbacks)", not ferr, "; ".join(ferr[:5]))
        fp.context.close()

        # ------------------------------------------------------------------ reduced motion
        print("\nReduced motion")
        rerr = []
        rp_ = new_page(browser, base + "/index.html", rerr, viewport={"width": 1280, "height": 860}, reduced_motion="reduce")
        r = rp_.evaluate(
            """() => ({ reduced: lumafx.env.reduced,
                 split: document.querySelectorAll('.fx-u').length,
                 heroOpacity: getComputedStyle(document.querySelector('.site-head .logo [data-fx~="text-reveal"]')).opacity,
                 modal: document.querySelector('#join').getAttribute('data-fx-style-active'),
                 typed: document.querySelector('#typewriter .term-body').textContent.includes('npm i lumafx'),
                 loaderDone: document.querySelector('#loader').hasAttribute('data-fx-done'),
                 beam: getComputedStyle(document.querySelector('#border-beam .card'), '::before').animationName,
                 marquee: getComputedStyle(document.querySelector('.fx-mq-track') || document.querySelector('.wordmarks')).animationName,
                 stories: document.querySelector('.phone').getAttribute('data-fx-state'),
                 hscroll: document.querySelector('.hscroll').getAttribute('data-fx-state'),
                 counter: document.querySelector('#counter strong').textContent })"""
        )
        check("reduced motion detected", r["reduced"], json.dumps(r))
        check("text is not split and is visible", r["split"] == 0 and r["heroOpacity"] == "1", json.dumps(r))
        check("loops stop (beam, marquee)", r["beam"] == "none" and r["marquee"] == "none", json.dumps(r))
        check("stories become manual, hscroll becomes a native row", "manual" in (r["stories"] or "") and "native" in (r["hscroll"] or ""), json.dumps(r))
        check("counter shows the final number immediately", r["counter"] == "12,480+", r["counter"])
        check("modal falls back to a fade, typewriter shows its text, preloader done", r["modal"] == "fade" and r["typed"] and r["loaderDone"], json.dumps(r))
        scroll_to(rp_, "#loader-3d .loaders")
        rl = rp_.evaluate("() => { const el = document.querySelector('#loader-3d [data-fx~=loader-3d]'); return [el.getAttribute('data-fx-state'), getComputedStyle(el.querySelector('canvas')).animationName] }")
        check("3D loader holds a still frame with only a soft fade", rl[0] == "ready" and rl[1] == "fx-l3d-breathe", str(rl))
        rp_.screenshot(path=os.path.join(SHOTS, "19-reduced.png"))
        check("no console errors (reduced motion)", not rerr, "; ".join(rerr[:5]))
        rp_.context.close()

        # ------------------------------------------------------------------ phone
        print("\nPhone (390×844, touch)")
        merr = []
        mp = new_page(browser, base + "/index.html", merr, viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp.wait_for_timeout(1500)
        m = mp.evaluate("() => ({ overflow: document.scrollingElement.scrollWidth - innerWidth, fine: lumafx.env.finePointer, float: !!document.querySelector('.fx-float'), spot: document.querySelectorAll('.fx-spot').length, sb: !!document.querySelector('.fx-sb'), launch: !!document.querySelector('.fx-chat-launch') })")
        check("no horizontal overflow on a phone", m["overflow"] <= 0, json.dumps(m))
        check("hover-only effects stay off on touch", not m["fine"] and not m["float"] and m["spot"] == 0, json.dumps(m))
        check("touch keeps the native scrollbar; chat is available", not m["sb"] and m["launch"], json.dumps(m))
        mp.click(".fx-chat-launch")
        mp.wait_for_timeout(900)
        pw = mp.evaluate("() => { const r = document.querySelector('.fx-chat-panel').getBoundingClientRect(); return [r.left, r.right, innerWidth, document.querySelector('[data-fx~=chat]').hasAttribute('data-open')] }")
        check("chat panel fits the phone screen", pw[3] and pw[0] >= 0 and pw[1] <= pw[2], str(pw))
        mp.screenshot(path=os.path.join(SHOTS, "33-phone-chat.png"))
        mp.click(".fx-chat-launch")
        mp.wait_for_timeout(400)
        mp.evaluate("document.querySelector('#modal [data-fx-open]').scrollIntoView({block: 'center', behavior: 'instant'})")
        mp.click("#modal [data-fx-open='#join']")
        mp.wait_for_timeout(1500)
        mb = mp.evaluate("() => { const r = document.querySelector('#join .fx-md-panel').getBoundingClientRect(); return [r.left, r.right, r.bottom, innerWidth, innerHeight] }")
        check("modal is a bottom sheet inside the phone screen", mb[0] >= 0 and mb[1] <= mb[3] and mb[2] <= mb[4] and mb[2] > mb[4] - 40, str(mb))
        mp.screenshot(path=os.path.join(SHOTS, "34-phone-modal.png"))
        mp.keyboard.press("Escape")
        mp.wait_for_timeout(1200)
        scroll_to(mp, "#ring .stage")
        mp.screenshot(path=os.path.join(SHOTS, "35-phone-ring.png"))
        m2 = mp.evaluate("() => document.scrollingElement.scrollWidth - innerWidth")
        check("no horizontal overflow on a phone after v0.2 sections", m2 <= 0, str(m2))
        scroll_to(mp, "#editor .builder", "start")
        mp.wait_for_timeout(400)
        bkm = mp.evaluate("() => { const c = document.querySelector('#bk-canvas').getBoundingClientRect(); const p = document.querySelector('#bk-panel').getBoundingClientRect(); return [p.top >= c.bottom - 1, c.width > 300, document.scrollingElement.scrollWidth - innerWidth] }")
        check("builder stacks into one column on a phone without overflow", bkm[0] and bkm[1] and bkm[2] <= 0, str(bkm))
        mp.screenshot(path=os.path.join(SHOTS, "36-phone-builder.png"))
        scroll_to(mp, "#ui-blog .orbit", "start")
        mp.wait_for_timeout(300)
        uim = mp.evaluate("() => document.scrollingElement.scrollWidth - innerWidth")
        check("intelligent UI sections fit a phone without overflow", uim <= 0, str(uim))
        mp.screenshot(path=os.path.join(SHOTS, "37-phone-orbit.png"))
        mp.screenshot(path=os.path.join(SHOTS, "20-phone-hero.png"))
        scroll_to(mp, "#glass .glass-scene")
        mp.screenshot(path=os.path.join(SHOTS, "21-phone-glass.png"))
        check("no console errors (phone)", not merr, "; ".join(merr[:5]))
        mp.context.close()

        browser.close()
    httpd.shutdown()
    os.remove(os.path.join(DEMO, "fallback.html"))

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} browser checks passed · screenshots in test/shots/")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
