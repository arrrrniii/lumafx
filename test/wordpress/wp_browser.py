"""Browser checks of the lumafx WordPress plugin on a real WordPress (block theme, SQLite)."""
import json, os, sys, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get("WP_URL", "http://127.0.0.1:8899")
SHOTS = sys.argv[1] if len(sys.argv) > 1 else "shots"
os.makedirs(SHOTS, exist_ok=True)
results = []
def check(name, ok, detail=""):
    results.append(ok)
    print(("  ✓ " if ok else "  ✗ ") + name + (f"  [{detail}]" if detail and not ok else ""))

with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 1280, "height": 860})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))

    print("\nWordPress front end")
    page.goto(BASE + "/tonight/", wait_until="load")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SHOTS}/wp-01-preloader.png")
    page.wait_for_function("() => { const l = document.querySelector('[data-fx~=preloader]'); return !l || l.hasAttribute('data-fx-done') }", timeout=15000)
    page.wait_for_timeout(900)
    info = page.evaluate("() => ({ v: window.lumafx && lumafx.version, stats: lumafx.stats() })")
    want = ["preloader", "page-transition", "scrollbar", "scroll-progress", "chat", "smart-header", "hover-icon", "text-reveal", "border-beam", "reveal", "modal", "lightbox", "rotate-words", "clock", "video-scrub"]
    missing = [n for n in want if n not in info["stats"]]
    check("runtime loads from the plugin and mounts every configured effect", info["v"] == "0.2.0" and not missing, f"{info} missing={missing}")
    page.screenshot(path=f"{SHOTS}/wp-02-post.png")

    h = page.evaluate("() => { const h = document.querySelector('h2.wp-block-heading'); return [h.getAttribute('data-fx-state'), h.querySelectorAll('.fx-u').length, h.getAttribute('aria-label')] }")
    check("block effect from the editor panel runs (text-reveal on a Heading)", "in" in (h[0] or "") and h[1] > 10 and h[2] == "Tonight in Tirana", str(h))

    page.click("a.wp-block-button__link[href='#join']")
    page.wait_for_timeout(1600)
    md = page.evaluate("() => { const d = document.getElementById('join'); return [d.tagName, d.open, (d.getAttribute('data-fx-state')||''), !!d.querySelector('.fx-md-goo')] }")
    check("a Button linking to #anchor opens the Group block as a liquid modal", md == ["DIALOG", True, "shown", True], str(md))
    page.screenshot(path=f"{SHOTS}/wp-03-modal.png")
    page.click("#join .lumafx-close")
    page.wait_for_timeout(1400)
    check("the added close button closes it", page.evaluate("document.getElementById('join').open") is False)

    page.evaluate("document.querySelector('.wp-block-gallery').scrollIntoView({block:'center', behavior:'instant'})")
    page.wait_for_timeout(500)
    page.click(".wp-block-gallery a >> nth=1")
    page.wait_for_timeout(1100)
    lb = page.evaluate("() => { const d = document.querySelector('dialog.fx-lb'); return d && [d.open, d.querySelector('.fx-lb-img').src.split('/').pop(), d.querySelector('.fx-lb-count').textContent] }")
    check("lightbox on a Gallery pages through its linked images", lb == [True, "ksamil-wide.jpg", "2 / 3"], str(lb))
    page.screenshot(path=f"{SHOTS}/wp-04-lightbox.png")
    page.keyboard.press("Escape")
    page.wait_for_timeout(900)

    page.click(".fx-chat-launch")
    page.wait_for_timeout(900)
    page.click(".fx-chat-quick button >> nth=0")
    page.wait_for_timeout(2600)
    ch = page.evaluate("() => [...document.querySelectorAll('#lumafx-chat .fx-msg')].map(m => m.textContent)")
    check("chat widget from Settings: greeting, quick reply, automatic answer", ch[:1] == ["Përshëndetje! Looking for something tonight?"] and "Concerts" in ch and ch[-1] == "Thanks! A human will reply shortly.", str(ch))
    page.screenshot(path=f"{SHOTS}/wp-05-chat.png")
    page.click(".fx-chat-launch")
    page.wait_for_timeout(500)

    hdr = page.evaluate("() => { const h = document.querySelector('header.wp-block-template-part'); const n = document.querySelector('.wp-block-navigation'); return [h.getAttribute('data-fx'), n && n.getAttribute('data-fx')] }")
    check("smart header and menu icons applied to the theme by selector", hdr == ["smart-header", "hover-icon"], str(hdr))
    page.evaluate("scrollTo({top: 900, behavior: 'instant'})"); page.wait_for_timeout(300)
    page.evaluate("scrollTo({top: 700, behavior: 'instant'})"); page.wait_for_timeout(600)
    st = page.eval_on_selector("header.wp-block-template-part", "el => [el.getAttribute('data-fx-state'), getComputedStyle(el).position]")
    check("theme header becomes sticky glass when scrolling back up", "scrolled" in (st[0] or "") and st[1] == "sticky", str(st))
    page.screenshot(path=f"{SHOTS}/wp-06-header.png")

    vs = page.evaluate("() => { const f = document.querySelector('.wp-block-video'); return [f.getAttribute('data-fx-state'), !!f.querySelector('.fx-pin > video'), getComputedStyle(f).height] }")
    check("video-scrub pins the Video block", "pinned" in (vs[0] or "") and vs[1], str(vs))

    sb = page.evaluate("() => [!!document.querySelector('.fx-sb'), document.querySelectorAll('.fx-sb-marks i').length]")
    check("animated scrollbar marks the post's headings", sb[0] and sb[1] >= 1, str(sb))

    page.evaluate("document.querySelector('a[href=\"/next-week/\"]').scrollIntoView({block:'center', behavior:'instant'})")
    page.wait_for_timeout(400)
    page.click("a[href='/next-week/']")
    page.wait_for_timeout(250)
    covering = page.evaluate("() => [document.querySelector('.fx-pt').hasAttribute('data-active'), sessionStorage.getItem('fx-pt') !== null]")
    page.wait_for_url("**/next-week/", timeout=10000)
    page.wait_for_timeout(3500)
    arrived = page.evaluate("() => [location.pathname, document.querySelector('.fx-pt').hasAttribute('data-active'), sessionStorage.getItem('fx-pt')]")
    check("page transition plays between two WordPress pages", covering == [True, True] and arrived == ["/next-week/", False, None], f"{covering} {arrived}")
    check("no console errors on the front end", not errors, "; ".join(errors[:4]))

    print("\nWordPress admin")
    errors.clear()
    page.goto(BASE + "/wp-login.php")
    page.fill("#user_login", "admin")
    page.fill("#user_pass", "password")
    page.click("#wp-submit")
    page.wait_for_url("**/wp-admin/**", timeout=20000)
    page.goto(BASE + "/wp-admin/options-general.php?page=lumafx")
    fields = page.evaluate("() => ['pt_style','pl_style','sb_on','chat_on','chat_whatsapp','header_selector','menu_selector'].map(k => !!document.getElementById('lumafx-' + k))")
    check("Settings → lumafx shows every site-wide option", all(fields), str(fields))
    page.select_option("#lumafx-pt_style", "curtain")
    page.click("#submit")
    page.wait_for_load_state("load")
    saved = page.evaluate("document.getElementById('lumafx-pt_style').value")
    check("settings save through the Settings API", saved == "curtain", saved)
    page.screenshot(path=f"{SHOTS}/wp-07-settings.png", full_page=True)

    pid = page.evaluate("fetch('/wp-json/wp/v2/posts?slug=tonight&_fields=id', {credentials: 'same-origin'}).then(r => r.json()).then(j => j[0].id)")
    page.goto(BASE + f"/wp-admin/post.php?post={pid}&action=edit")
    page.wait_for_selector("iframe[name='editor-canvas']", timeout=60000)
    canvas = page.frame_locator("iframe[name='editor-canvas']")
    canvas.locator("p:has-text('Concerts, theatre')").first.wait_for(timeout=60000)
    page.wait_for_timeout(1500)
    for sel in ["button[aria-label='Close']"]:
        try:
            if page.locator(".components-modal__frame").count():
                page.keyboard.press("Escape")
        except Exception:
            pass
    badge = canvas.locator("[data-lumafx]").count()
    check("blocks with effects show a badge in the editor canvas", badge >= 5, str(badge))
    canvas.locator("p:has-text('Concerts, theatre')").first.click()
    page.wait_for_timeout(800)
    # Make sure the block settings sidebar is open.
    if not page.locator(".lumafx-panel").count():
        settings_btn = page.locator("button[aria-label='Settings']").first
        if settings_btn.count():
            settings_btn.click()
            page.wait_for_timeout(600)
        tab = page.locator("button[role='tab']:has-text('Block')")
        if tab.count():
            tab.first.click()
            page.wait_for_timeout(400)
    panel = page.locator(".lumafx-panel")
    check("the Effects panel appears in the block sidebar", panel.count() == 1, str(panel.count()))
    toggle = panel.locator("button.components-panel__body-toggle")
    if toggle.get_attribute("aria-expanded") == "false":
        toggle.click()
    inp = panel.locator("input.components-form-token-field__input")
    inp.click()
    inp.fill("glas")
    page.wait_for_timeout(400)
    page.keyboard.press("Enter")
    page.wait_for_timeout(600)
    inp.fill("tilt")
    page.keyboard.press("Enter")
    page.wait_for_timeout(600)
    tokens = [t.strip().split("\n")[-1] for t in panel.locator(".components-form-token-field__token-text").all_inner_texts()]
    opts = panel.locator(".lumafx-effect").count()
    check("picking effects adds them with their option controls", [t.strip() for t in tokens] == ["glass", "tilt"] and opts == 2, f"{tokens} {opts}")
    page.screenshot(path=f"{SHOTS}/wp-08-editor-panel.png")
    # Set one option: tilt max
    mx = panel.locator(".lumafx-effect:has(code:text-is('tilt')) input[type='text']").first
    mx.fill("14")
    page.wait_for_timeout(300)
    page.keyboard.press("Control+s")
    page.wait_for_timeout(2500)
    raw = page.evaluate(f"fetch('/wp-json/wp/v2/posts/{pid}?context=edit', {{credentials: 'same-origin', headers: {{'X-WP-Nonce': wpApiSettings.nonce}}}}).then(r => r.json()).then(j => j.content.raw)")
    m = re.search(r'<!-- wp:paragraph (\{[^\n]*?\}) -->\s*<p>Concerts, theatre', raw)
    attrs = json.loads(m.group(1)) if m else {}
    check("saving stores the choice as a block attribute, not in the markup", attrs.get("lumafx", {}).get("effects") == ["glass", "tilt"] and len(attrs["lumafx"].get("options", {})) == 1 and "data-fx" not in raw.split("Concerts, theatre")[0][-200:], json.dumps(attrs))
    page.goto(BASE + "/tonight/")
    page.wait_for_timeout(500)
    fr = page.evaluate("() => { const p = [...document.querySelectorAll('p')].find(p => p.textContent.startsWith('Concerts, theatre')); return [p.getAttribute('data-fx'), [...p.attributes].filter(a => a.name.startsWith('data-fx-') && a.name !== 'data-fx-state').map(a => a.name + '=' + a.value).join(',')] }")
    check("the front end renders the new effects with the option", fr[0] == "glass tilt" and "=14" in fr[1], str(fr))
    # The sandbox has no internet: ignore the admin's own external requests (fonts, avatars).
    editor_errors = [e for e in errors if "favicon" not in e and "ERR_TUNNEL_CONNECTION_FAILED" not in e]
    check("no console errors in the admin and editor", not editor_errors, "; ".join(editor_errors[:4]))
    b.close()

print(f"\n{sum(results)}/{len(results)} WordPress browser checks passed")
sys.exit(0 if all(results) else 1)
