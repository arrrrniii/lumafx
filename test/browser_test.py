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
        check("runtime boots with version", info["v"] == "0.1.0", info["v"])
        missing = [n for n in info["names"] if n not in info["stats"]]
        check(f"all {len(info['names'])} effects mounted on the page", not missing, f"missing {missing}")
        check("feature detection: scroll-driven, corner-shape, Chromium", info["env"]["sda"] and info["env"]["cornerShape"] and info["env"]["chromium"], json.dumps(info["env"]))

        # hero
        page.wait_for_timeout(1600)
        hero = page.evaluate(
            """() => { const h = document.querySelector('.wordmark');
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
                 heroOpacity: getComputedStyle(document.querySelector('.wordmark')).opacity,
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
        rp_.screenshot(path=os.path.join(SHOTS, "19-reduced.png"))
        check("no console errors (reduced motion)", not rerr, "; ".join(rerr[:5]))
        rp_.context.close()

        # ------------------------------------------------------------------ phone
        print("\nPhone (390×844, touch)")
        merr = []
        mp = new_page(browser, base + "/index.html", merr, viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp.wait_for_timeout(1500)
        m = mp.evaluate("() => ({ overflow: document.scrollingElement.scrollWidth - innerWidth, fine: lumafx.env.finePointer, float: !!document.querySelector('.fx-float'), spot: document.querySelectorAll('.fx-spot').length })")
        check("no horizontal overflow on a phone", m["overflow"] <= 0, json.dumps(m))
        check("hover-only effects stay off on touch", not m["fine"] and not m["float"] and m["spot"] == 0, json.dumps(m))
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
