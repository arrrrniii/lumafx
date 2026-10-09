"""The lumafx view inside the official MCP Apps host bridge (AppBridge from @modelcontextprotocol/ext-apps):
handshake, streaming partial input, the final result, sizing, links, follow-up messages, model context.
Usage: npm run test:view (builds test/host.js first). Screenshots go to test/shots/."""
import functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.path.join(HERE, "shots")
os.makedirs(SHOTS, exist_ok=True)
results = []
def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("  ✓ " if ok else "  ✗ ") + name + (f"  [{detail}]" if detail and not ok else ""))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_address[1]}/mcp/test/host.html"
SAMPLES = ["orbit", "sports", "answers", "events"]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    for theme in ["light", "dark"]:
        ctx = b.new_context(viewport={"width": 820, "height": 900}, color_scheme=theme)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        for doc in SAMPLES:
            pg.goto(f"{BASE}?doc={doc}&theme={theme}&locale={'sq-AL' if doc == 'orbit' else 'en-GB'}")
            pg.wait_for_function("window.__state === 'done'", timeout=30000)
            fr = pg.frame_locator("iframe")
            got = fr.locator(".fxui > .fxui-b").count()
            n = pg.evaluate(f"window.FXUI_SAMPLES['{doc}'].blocks.length")
            busy = fr.locator(".fxui[aria-busy]").count()
            h = pg.evaluate("document.querySelector('iframe').getBoundingClientRect().height")
            dark = fr.locator("html").get_attribute("data-theme")
            check(f"{doc} ({theme}): {got} blocks, settled, sized to {round(h)}px, host theme applied", got == n and busy == 0 and h > 400 and dark == theme, f"{got}/{n} busy={busy} h={h} theme={dark}")
            pg.screenshot(path=os.path.join(SHOTS, f"view-{doc}-{theme}.png"), full_page=True)
        check(f"no console errors ({theme})", not errs, "; ".join(errs[:4]))
        ctx.close()
    ctx = b.new_context(viewport={"width": 820, "height": 900})
    pg = ctx.new_page()
    pg.goto(f"{BASE}?doc=orbit&locale=sq-AL&pause=0.55")
    pg.wait_for_function("window.__state === 'paused'", timeout=30000)
    pg.wait_for_timeout(600)
    fr = pg.frame_locator("iframe")
    mid = [fr.locator(".fxui > .fxui-b").count(), fr.locator(".fxui[aria-busy]").count(), fr.locator(".fxui-b-lineup [data-k]").count()]
    check("renders while the model is still writing (partial input)", mid[0] >= 2 and mid[1] == 1 and mid[2] >= 11, str(mid))
    pg.screenshot(path=os.path.join(SHOTS, "view-orbit-midstream.png"), full_page=True)
    pg.goto(f"{BASE}?doc=orbit&locale=sq-AL")
    pg.wait_for_function("window.__state === 'done'", timeout=30000)
    fr = pg.frame_locator("iframe")
    date = fr.locator(".fxui-b-match").first.inner_text()
    check("Albanian labels and dates from the document's lang", "tet" in date, date[:80])
    fr.locator(".fxui-b-suggestions button").first.click()
    fr.locator(".fxui-b-sources a").first.click()
    pg.wait_for_timeout(300)
    log = pg.evaluate("window.__log.filter(x => x.type === 'message' || x.type === 'openlink')")
    check("a follow-up chip sends ui/message; a link goes through ui/open-link", len(log) == 2 and log[0]["type"] == "message" and log[0]["content"][0]["text"].startswith("Kush") and log[1]["url"].startswith("https://"), json.dumps(log, ensure_ascii=False))
    pg.goto(f"{BASE}?doc=events")
    pg.wait_for_function("window.__state === 'done'", timeout=30000)
    fr = pg.frame_locator("iframe")
    fr.locator(".fxui-b-tickets input[type=radio]:not([disabled])").first.check(force=True)
    pg.wait_for_timeout(300)
    ctxlog = pg.evaluate("window.__log.filter(x => x.type === 'context').map(x => x.content[0].text)")
    check("picking a ticket tier updates the model context", len(ctxlog) == 1 and "tier" in ctxlog[0], str(ctxlog))
    ctx.close()
    b.close()
srv.shutdown()
print(f"\n{sum(results)}/{len(results)} view checks passed")
sys.exit(0 if all(results) else 1)
