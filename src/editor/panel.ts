/**
 * <fx-panel>: a drop-in animation panel for any page or email-free website builder.
 * Point it at the selected block; people pick presets (previewed live on the block while they
 * hover), fine-tune options, replay, and the panel tells your builder what to save.
 *
 *   <fx-panel></fx-panel>
 *   panel.target = selectedBlock;
 *   panel.addEventListener('fx-change', (e) => save(block.id, e.detail.fx));
 */
import { META } from '../meta';
import { GROUPS, PRESETS, fields, groupOf, presetsFor, suggest, type Field, type FxSpec, type GroupId, type Preset } from './catalog';
import { apply, normalize, preview, read, replay, resolve, toAttributes, toAttributeString } from './attrs';

/** Little motion previews on the preset tiles, by preset id (anything else gets a gentle pulse). */
const GLYPH: Record<string, string> = {
  'fade-up': 'up', 'fade-down': 'down', 'from-left': 'left', 'from-right': 'right', 'zoom-in': 'zoom', 'blur-in': 'blur',
  book: 'book', 'wipe-up': 'clip', cascade: 'cascade', 'cascade-zoom': 'cascade', 'words-blur': 'words', 'chars-flip': 'words',
  'lines-rise': 'words', decode: 'words', 'type-on': 'type', 'count-up': 'type', 'image-curtain': 'clip', 'image-circle': 'circle',
  'draw-lines': 'draw', tilt: 'tilt', 'tilt-soft': 'tilt', magnetic: 'magnet', spotlight: 'spot', lift: 'lift', 'ripple-click': 'ripple',
  'burst-click': 'ripple', 'fill-hover': 'fill', squish: 'squish', 'arrow-link': 'arrow', 'card-pop': 'zoom', 'cta-glow': 'beam',
  'parallax-soft': 'parallax', 'parallax-deep': 'parallax', 'stack-cards': 'stack', 'side-scroll': 'side', expand: 'expand',
  'liquid-glass': 'glass', frost: 'glass', squircle: 'squircle', beam: 'beam', 'beam-full': 'beam', shine: 'shine', 'shine-hover': 'shine',
  shimmer: 'shine', aurora: 'aurora', leaves: 'aurora', dots: 'dots', marquee: 'side', 'marquee-back': 'side', carousel: 'side',
  'rotate-words': 'words', ring: 'tilt', loader: 'stack',
};

const CSS = `
:host{min-width:0;--fxp-bg:#14161f;--fxp-panel:#1b1e29;--fxp-line:rgb(255 255 255/.08);--fxp-fg:#eef0f6;--fxp-muted:#8d93a8;--fxp-accent:#ffb547;--fxp-accent-ink:#1a1408;--fxp-radius:16px;
  display:block;color:var(--fxp-fg);font:13px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}
:host([theme=light]){--fxp-bg:#ffffff;--fxp-panel:#f4f5f9;--fxp-line:rgb(10 14 30/.09);--fxp-fg:#141726;--fxp-muted:#6a7086;color-scheme:light}
@media (prefers-color-scheme:light){:host(:not([theme])),:host([theme=auto]){--fxp-bg:#ffffff;--fxp-panel:#f4f5f9;--fxp-line:rgb(10 14 30/.09);--fxp-fg:#141726;--fxp-muted:#6a7086;color-scheme:light}}
*{box-sizing:border-box}
button,input,select{font:inherit;color:inherit}
.p{background:var(--fxp-bg);border:1px solid var(--fxp-line);border-radius:var(--fxp-radius);overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);min-width:0}
header{display:flex;align-items:center;gap:10px;padding:14px 14px 10px}
header h3{margin:0;font-size:13px;font-weight:650;letter-spacing:.01em;flex:1;display:flex;align-items:center;gap:8px}
header h3 i{width:8px;height:8px;border-radius:50%;background:var(--fxp-accent);box-shadow:0 0 12px var(--fxp-accent)}
.btn{border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:999px;padding:6px 11px;cursor:pointer;font-size:12px;font-weight:550;display:inline-flex;gap:6px;align-items:center;transition:background .15s,transform .15s}
.btn:hover{background:color-mix(in oklab,var(--fxp-panel),var(--fxp-fg) 7%)}
.btn:active{transform:scale(.96)}
.btn.primary{background:var(--fxp-accent);color:var(--fxp-accent-ink);border-color:transparent}
.btn:disabled{opacity:.4;pointer-events:none}
.who{padding:0 14px 10px;color:var(--fxp-muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who b{color:var(--fxp-fg);font-weight:600;font-family:ui-monospace,Menlo,monospace;font-size:11.5px}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 12px;min-height:30px}
.chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 4px 4px 10px;background:var(--fxp-panel);border:1px solid var(--fxp-line);font-size:12px;cursor:pointer;animation:pop .35s cubic-bezier(.2,.9,.3,1.3) both}
.chip[aria-pressed=true]{border-color:var(--fxp-accent);box-shadow:0 0 0 1px var(--fxp-accent) inset}
.chip small{color:var(--fxp-muted);font-size:10.5px}
.chip button{border:0;background:none;width:20px;height:20px;border-radius:50%;cursor:pointer;color:var(--fxp-muted);display:grid;place-items:center;padding:0}
.chip button:hover{background:var(--fxp-line);color:var(--fxp-fg)}
.empty{color:var(--fxp-muted);font-size:12px;padding:4px 0}
.search{padding:0 14px 10px}
.search input{width:100%;border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:10px;padding:8px 10px;outline:none}
.search input:focus{border-color:var(--fxp-accent)}
.tabs{display:flex;gap:2px;padding:0 10px;border-bottom:1px solid var(--fxp-line);overflow-x:auto;scrollbar-width:none}
.tab{border:0;background:none;padding:8px 8px 10px;cursor:pointer;color:var(--fxp-muted);font-size:12px;font-weight:600;position:relative;white-space:nowrap}
.tab[aria-selected=true]{color:var(--fxp-fg)}
.tab[aria-selected=true]::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--fxp-accent)}
.body{max-height:var(--fxp-max,520px);overflow:auto;scrollbar-width:thin}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;padding:12px 14px}
.tile{border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:12px;padding:8px 8px 9px;cursor:pointer;display:grid;gap:7px;text-align:left;transition:border-color .15s,transform .2s cubic-bezier(.2,.9,.3,1.3)}
.tile:hover{transform:translateY(-2px);border-color:color-mix(in oklab,var(--fxp-line),var(--fxp-fg) 18%)}
.tile[aria-pressed=true]{border-color:var(--fxp-accent);box-shadow:0 0 0 1px var(--fxp-accent) inset}
.tile span{font-size:11.5px;font-weight:550;line-height:1.2}
.stage{height:46px;border-radius:8px;background:color-mix(in oklab,var(--fxp-bg),var(--fxp-fg) 4%);display:grid;place-items:center;overflow:hidden;perspective:200px}
.g{width:30px;height:20px;border-radius:5px;background:linear-gradient(135deg,var(--fxp-accent),color-mix(in oklab,var(--fxp-accent),#ff4f8b 55%));position:relative}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g{animation:var(--a,pulse) 1.5s cubic-bezier(.2,.8,.2,1) infinite}
.g[data-g=up]{--a:g-up}.g[data-g=down]{--a:g-down}.g[data-g=left]{--a:g-left}.g[data-g=right]{--a:g-right}.g[data-g=zoom]{--a:g-zoom}.g[data-g=blur]{--a:g-blur}
.g[data-g=book]{--a:g-book;transform-origin:0 50%}.g[data-g=clip]{--a:g-clip}.g[data-g=circle]{--a:g-circle}.g[data-g=tilt]{--a:g-tilt}.g[data-g=magnet]{--a:g-magnet}
.g[data-g=lift]{--a:g-lift}.g[data-g=squish]{--a:g-squish}.g[data-g=parallax]{--a:g-parallax}.g[data-g=side]{--a:g-side}.g[data-g=expand]{--a:g-expand}
.g[data-g=squircle]{--a:g-squircle}.g[data-g=glass]{--a:g-glass;background:color-mix(in oklab,var(--fxp-fg) 18%,transparent);backdrop-filter:blur(4px);border:1px solid color-mix(in oklab,var(--fxp-fg) 30%,transparent)}
.g[data-g=cascade],.g[data-g=words],.g[data-g=type],.g[data-g=stack]{background:none;display:grid;gap:3px}
.g[data-g=cascade] b,.g[data-g=words] b,.g[data-g=type] b,.g[data-g=stack] b{display:block;height:4px;border-radius:2px;background:var(--fxp-accent)}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=cascade] b{animation:g-up 1.5s cubic-bezier(.2,.8,.2,1) infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=words] b{animation:g-blur 1.5s ease infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=type] b{animation:g-type 1.5s steps(6) infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=stack] b{animation:g-fan 1.5s cubic-bezier(.5,0,.3,1.3) infinite}
.g b:nth-child(2){animation-delay:.12s!important;width:80%}.g b:nth-child(3){animation-delay:.24s!important;width:60%}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g:is([data-g=cascade],[data-g=words],[data-g=type],[data-g=stack]){animation:none}
.g[data-g=spot]{--a:g-spot;background:radial-gradient(circle at var(--x,30%) 40%,#fff,var(--fxp-accent) 60%)}
.g[data-g=ripple]::after,.g[data-g=fill]::after{content:"";position:absolute;inset:0;margin:auto;width:8px;height:8px;border-radius:50%;background:#fff;opacity:0}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=ripple]::after{animation:g-ripple 1.5s ease-out infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=fill]::after{animation:g-fill 1.5s ease-in-out infinite;background:var(--fxp-fg)}
.g[data-g=arrow]{background:none;width:auto;height:auto;font-weight:700;font-size:16px;color:var(--fxp-accent);--a:g-right}
.g[data-g=beam]{background:var(--fxp-panel);border:1.5px solid color-mix(in oklab,var(--fxp-accent),transparent 50%)}
.g[data-g=beam]::after{content:"";position:absolute;inset:-2px;border-radius:6px;padding:2px;background:conic-gradient(from var(--r,0deg),transparent 70%,var(--fxp-accent));-webkit-mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.g[data-g=shine]{overflow:hidden}
.g[data-g=shine]::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgb(255 255 255/.8),transparent 70%);translate:-100% 0}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=shine]::after{animation:g-shine 1.5s ease-in-out infinite}
.g[data-g=aurora]{background:linear-gradient(120deg,#7c3aed,#06b6d4,#ec4899);background-size:200% 200%;--a:g-aurora}
.g[data-g=dots]{background:radial-gradient(circle,var(--fxp-accent) 1.2px,transparent 1.6px) 0 0/6px 6px;--a:g-dots}
.g[data-g=draw]{background:none;border:2px solid var(--fxp-accent);--a:g-draw;clip-path:inset(0 100% 0 0)}
.tile .g[data-g=draw]{clip-path:inset(0 0 0 0)}
.more{padding:0 14px 12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--fxp-muted);font-size:11.5px}
.more button{border:1px dashed var(--fxp-line);background:none;border-radius:999px;padding:3px 9px;cursor:pointer;font-size:11.5px;font-family:ui-monospace,Menlo,monospace}
.more button:hover{border-style:solid;color:var(--fxp-fg)}
.set{border-top:1px solid var(--fxp-line);border-bottom:1px solid var(--fxp-line);padding:0 14px;background:color-mix(in oklab,var(--fxp-bg),var(--fxp-fg) 2.5%)}
.set summary{list-style:none;cursor:pointer;padding:11px 0}
.set summary::-webkit-details-marker{display:none}
.set .rows{display:grid;gap:10px;padding:0 0 14px}
.set h4{margin:0;font-size:12px;font-weight:650;display:flex;gap:8px;align-items:baseline}
.set .chev{color:var(--fxp-muted);transition:rotate .2s;font-size:14px;line-height:1}
.set:not([open]) .chev{rotate:-90deg}
.pick{position:sticky;top:0;z-index:2;background:var(--fxp-bg);padding-top:12px}
.set h4 code{font-family:ui-monospace,Menlo,monospace;color:var(--fxp-accent);font-size:11.5px}
.set h4 small{color:var(--fxp-muted);font-weight:500;flex:1}
.f{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:center}
.f>label{color:var(--fxp-muted);font-size:12px;cursor:help}
.f .c{display:flex;gap:8px;align-items:center;min-width:0}
.f input[type=text],.f input[type=number],.f select{width:100%;border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:8px;padding:6px 8px;outline:none;min-width:0}
.f input:focus,.f select:focus{border-color:var(--fxp-accent)}
.f input[type=range]{flex:1;accent-color:var(--fxp-accent);min-width:0}
.f output{font:11.5px ui-monospace,Menlo,monospace;color:var(--fxp-muted);min-width:56px;text-align:right}
.f input[type=color]{width:30px;height:30px;border:1px solid var(--fxp-line);border-radius:8px;padding:2px;background:var(--fxp-panel);flex:none}
.sw{position:relative;width:36px;height:20px;flex:none}
.sw input{appearance:none;margin:0;width:36px;height:20px;border-radius:99px;background:var(--fxp-line);cursor:pointer;transition:background .2s}
.sw input::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:translate .25s cubic-bezier(.2,.9,.3,1.3);box-shadow:0 1px 3px rgb(0 0 0/.3)}
.sw input:checked{background:var(--fxp-accent)}
.sw input:checked::after{translate:16px 0}
.code{border-top:1px solid var(--fxp-line);padding:10px 14px;display:flex;gap:8px;align-items:center;background:color-mix(in oklab,var(--fxp-bg),var(--fxp-fg) 4%);min-width:0}
.code code{flex:1;min-width:0;font:11px/1.5 ui-monospace,Menlo,monospace;color:var(--fxp-muted);white-space:nowrap;overflow:auto;scrollbar-width:none}
.none{padding:30px 18px;text-align:center;color:var(--fxp-muted)}
.none b{display:block;color:var(--fxp-fg);font-size:14px;margin-bottom:4px}
@keyframes pop{from{opacity:0;scale:.8}}
@keyframes pulse{50%{scale:.9;opacity:.7}}
@keyframes g-up{0%{opacity:0;translate:0 12px}45%,100%{opacity:1;translate:0 0}}
@keyframes g-down{0%{opacity:0;translate:0 -12px}45%,100%{opacity:1;translate:0 0}}
@keyframes g-left{0%{opacity:0;translate:-16px 0}45%,100%{opacity:1;translate:0 0}}
@keyframes g-right{0%{opacity:0;translate:16px 0}45%,100%{opacity:1;translate:0 0}}
@keyframes g-zoom{0%{opacity:0;scale:.4}45%,100%{opacity:1;scale:1}}
@keyframes g-blur{0%{opacity:0;filter:blur(6px)}50%,100%{opacity:1;filter:blur(0)}}
@keyframes g-book{0%{transform:rotateY(-85deg)}50%,100%{transform:rotateY(0)}}
@keyframes g-clip{0%{clip-path:inset(100% 0 0)}50%,100%{clip-path:inset(0)}}
@keyframes g-circle{0%{clip-path:circle(0)}50%,100%{clip-path:circle(80%)}}
@keyframes g-draw{0%{clip-path:inset(0 100% 0 0)}60%,100%{clip-path:inset(0)}}
@keyframes g-type{0%{width:0}60%,100%{width:100%}}
@keyframes g-fan{0%,15%{translate:0 0;rotate:0deg}50%,70%{translate:-4px -2px;rotate:-14deg}}
@keyframes g-tilt{25%{transform:rotateX(18deg) rotateY(-22deg)}75%{transform:rotateX(-14deg) rotateY(20deg)}}
@keyframes g-magnet{30%{translate:7px -5px}60%{translate:-6px 4px}}
@keyframes g-spot{0%,100%{--x:15%}50%{--x:85%}}
@keyframes g-lift{50%{translate:0 -5px;box-shadow:0 8px 12px -4px rgb(0 0 0/.5)}}
@keyframes g-squish{20%{scale:.82 .9}40%{scale:1.06 1}60%{scale:1}}
@keyframes g-ripple{0%{opacity:.9;scale:.5}70%,100%{opacity:0;scale:5}}
@keyframes g-fill{0%{opacity:.25;scale:0}50%,100%{opacity:.25;scale:6}}
@keyframes g-parallax{50%{translate:0 -7px}}
@keyframes g-side{0%{translate:18px 0;opacity:0}20%,80%{opacity:1}100%{translate:-18px 0;opacity:0}}
@keyframes g-expand{50%{width:52px;height:28px;border-radius:2px}}
@keyframes g-squircle{50%{border-radius:10px}}
@keyframes g-glass{50%{translate:4px -3px}}
@keyframes g-shine{to{translate:100% 0}}
@keyframes g-aurora{50%{background-position:100% 100%}}
@keyframes g-dots{50%{background-size:8px 8px}}
@property --x{syntax:"<percentage>";inherits:false;initial-value:30%}
@property --r{syntax:"<angle>";inherits:false;initial-value:0deg}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=beam]::after{animation:g-beam 1.5s linear infinite}
@keyframes g-beam{to{--r:360deg}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

export interface PanelChange {
  target: Element;
  fx: FxSpec[];
  attributes: Record<string, string>;
  html: string;
}

const describe = (el: Element) => {
  const named = el.getAttribute('data-label') || el.getAttribute('aria-label');
  if (named) return named;
  const cls = Array.from(el.classList).filter((c) => !c.startsWith('fx-'))[0];
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : cls ? '.' + cls : '');
};

const toMs = (v: unknown) => {
  const m = /^(-?[\d.]+)\s*(ms|s)?$/.exec(String(v ?? '').trim());
  return m ? parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1) : NaN;
};

/** Registers <fx-panel> (or your own tag name). Safe to call more than once and on the server. */
export function definePanel(tag = 'fx-panel') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;

  class FxPanel extends HTMLElement {
    static observedAttributes = ['target', 'theme', 'groups', 'all'];
    private root: ShadowRoot;
    private el: Element | null = null;
    private fx: FxSpec[] = [];
    private selected = '';
    private tab: GroupId = 'entrance';
    private query = '';
    private undoPreview: (() => void) | null = null;
    private hoverTimer = 0;
    private collapsed = false;

    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
      this.root.addEventListener('click', (e) => this.onClick(e));
      this.root.addEventListener('change', (e) => this.onField(e, true));
      this.root.addEventListener('input', (e) => this.onField(e, false));
      this.root.addEventListener('pointerover', (e) => this.onHover(e));
      this.root.addEventListener('pointerout', (e) => this.onOut(e));
      this.root.addEventListener('focusin', (e) => this.onHover(e));
      this.root.addEventListener('focusout', (e) => this.onOut(e));
      this.root.addEventListener('toggle', (e) => {
        const d = e.target as HTMLDetailsElement;
        if (d.classList?.contains('set')) this.collapsed = !d.open;
      }, true);
      this.root.addEventListener('keydown', (e) => {
        const k = e as KeyboardEvent;
        const chip = (k.target as Element).closest?.('[data-chip]');
        if (chip && k.target === chip && (k.key === 'Enter' || k.key === ' ')) {
          k.preventDefault();
          (chip as HTMLElement).click();
        }
      });
    }

    connectedCallback() {
      if (!this.el && this.hasAttribute('target')) this.target = document.querySelector(this.getAttribute('target')!);
      this.render();
    }

    disconnectedCallback() {
      this.endPreview();
    }

    attributeChangedCallback(name: string) {
      if (name === 'target' && this.isConnected) this.target = document.querySelector(this.getAttribute('target') || '');
      else if (this.isConnected) this.render();
    }

    /** The element being edited. */
    get target(): Element | null {
      return this.el;
    }
    set target(el: Element | null) {
      this.endPreview();
      this.el = el;
      this.fx = el ? read(el) : [];
      this.selected = this.fx.at(-1)?.effect ?? '';
      if (el && this.fx.length) this.tab = groupOf(this.fx[0].effect);
      this.render();
    }

    /** The effects on the target, as data to store. Setting it applies them. */
    get value(): FxSpec[] {
      return this.fx.map((s) => ({ effect: s.effect, ...(s.options ? { options: { ...s.options } } : {}) }));
    }
    set value(v: FxSpec[]) {
      this.commit(resolve(v));
    }

    /** Re-reads the target, after your builder changed its attributes. */
    refresh() {
      this.target = this.el;
    }

    private groups() {
      const only = (this.getAttribute('groups') || '').split(',').map((s) => s.trim()).filter(Boolean);
      return GROUPS.filter((g) => (only.length ? only.includes(g.id) : g.id !== 'components'));
    }

    private commit(next: FxSpec[], replayAfter = false) {
      if (!this.el) return;
      this.endPreview();
      this.fx = apply(this.el, next);
      if (!this.fx.some((s) => s.effect === this.selected)) this.selected = this.fx.at(-1)?.effect ?? '';
      if (replayAfter) replay(this.el);
      this.render();
      const detail: PanelChange = { target: this.el, fx: this.value, attributes: toAttributes(this.fx), html: toAttributeString(this.fx) };
      this.dispatchEvent(new CustomEvent('fx-change', { detail, bubbles: true, composed: true }));
    }

    private withPreset(p: Preset): FxSpec[] {
      const groups = new Set(p.fx.map((s) => groupOf(s.effect)));
      const names = new Set(p.fx.map((s) => s.effect));
      return [...this.fx.filter((s) => !groups.has(groupOf(s.effect)) && !names.has(s.effect)), ...p.fx];
    }

    private isOn(p: Preset) {
      return p.fx.every((s) => {
        const want = JSON.stringify(normalize(s).options ?? {});
        return this.fx.some((c) => c.effect === s.effect && JSON.stringify(c.options ?? {}) === want);
      });
    }

    private endPreview() {
      clearTimeout(this.hoverTimer);
      if (this.undoPreview) {
        this.undoPreview();
        this.undoPreview = null;
      }
    }

    private onHover(e: Event) {
      const tile = (e.target as Element).closest?.('[data-preset]');
      if (!tile || !this.el) return;
      const p = PRESETS.find((x) => x.id === tile.getAttribute('data-preset'));
      if (!p || this.isOn(p)) return;
      clearTimeout(this.hoverTimer);
      this.hoverTimer = window.setTimeout(() => {
        if (!this.el) return;
        this.undoPreview?.();
        this.undoPreview = preview(this.el, this.withPreset(p));
      }, 140);
    }

    private onOut(e: Event) {
      const tile = (e.target as Element).closest?.('[data-preset]');
      const to = (e as PointerEvent | FocusEvent).relatedTarget as Element | null;
      if (!tile || (to && tile.contains(to))) return;
      this.endPreview();
    }

    private onClick(e: Event) {
      const t = e.target as Element;
      const b = t.closest('button, [data-chip]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      if (b.hasAttribute('data-tab')) {
        this.tab = b.getAttribute('data-tab') as GroupId;
        this.render();
      } else if (b.hasAttribute('data-preset')) {
        const p = PRESETS.find((x) => x.id === b.getAttribute('data-preset'))!;
        const on = this.isOn(p);
        this.commit(on ? this.fx.filter((s) => !p.fx.some((x) => x.effect === s.effect)) : this.withPreset(p));
        if (!on) this.selected = p.fx[p.fx.length - 1].effect;
        this.render();
      } else if (act === 'add') {
        const name = b.getAttribute('data-effect')!;
        this.selected = name;
        this.commit([...this.fx.filter((s) => s.effect !== name), { effect: name }]);
      } else if (act === 'remove') {
        e.stopPropagation();
        const name = b.getAttribute('data-effect')!;
        this.commit(this.fx.filter((s) => s.effect !== name));
      } else if (b.hasAttribute('data-chip')) {
        this.selected = b.getAttribute('data-chip')!;
        this.render();
      } else if (act === 'replay' && this.el) {
        replay(this.el);
      } else if (act === 'clear') {
        this.commit([]);
      } else if (act === 'copy') {
        navigator.clipboard?.writeText(toAttributeString(this.fx)).then(() => {
          b.textContent = 'Copied';
          setTimeout(() => (b.textContent = 'Copy'), 1200);
        });
      }
    }

    private onField(e: Event, committed: boolean) {
      const t = e.target as HTMLInputElement | HTMLSelectElement;
      if (t.name === 'q') {
        this.query = t.value.trim().toLowerCase();
        this.renderGrid();
        return;
      }
      const key = t.getAttribute('data-key');
      if (!key || !this.selected) return;
      const field = fields(this.selected).find((f) => f.key === key);
      if (!field) return;
      let v: string | number | boolean;
      if (field.type === 'toggle') v = (t as HTMLInputElement).checked;
      else if (field.type === 'range' || field.type === 'number' || field.type === 'time' || field.type === 'percent') v = Number(t.value);
      else v = t.value;
      // Sliders show their value as you drag and apply when you let go.
      const out = t.parentElement?.querySelector('output');
      if (out) out.textContent = this.show(field, v);
      if (t.type === 'color') {
        const text = t.parentElement?.querySelector<HTMLInputElement>('input[type=text]');
        if (text) text.value = String(v);
      }
      // Changing an option restarts the effect on its own, so entrance effects replay with the new values.
      if (!committed) return;
      const next = this.fx.map((s) => (s.effect === this.selected ? { effect: s.effect, options: { ...s.options, [key]: v } } : s));
      this.commit(next);
    }

    private show(f: Field, v: unknown) {
      if (f.type === 'time') return `${Math.round(Number(v))} ms`;
      if (f.type === 'percent') return `${Math.round(Number(v))}%`;
      return String(v);
    }

    /* ---------------- rendering ---------------- */

    private render() {
      // Keep keyboard focus on the same control across re-renders.
      const a = this.root.activeElement as HTMLElement | null;
      const keep = a
        ? a.id
          ? '#' + a.id
          : (['data-preset', 'data-tab', 'data-chip', 'data-act'].map((k) => (a.hasAttribute(k) ? `[${k}="${a.getAttribute(k)}"]` : '')).find(Boolean) ?? '')
        : '';
      this.draw();
      if (keep) this.root.querySelector<HTMLElement>(keep)?.focus({ preventScroll: true });
    }

    private draw() {
      const el = this.el;
      if (!el) {
        this.root.innerHTML = `<style>${CSS}</style><div class="p" part="panel"><header><h3><i></i>Animation</h3></header><div class="none"><b>Select a block</b>Pick any element on the canvas to animate it.</div></div>`;
        return;
      }
      const sel = this.fx.find((s) => s.effect === this.selected);
      this.root.innerHTML = `<style>${CSS}</style>
<div class="p" part="panel">
  <header><h3><i></i>Animation</h3>
    <button class="btn" data-act="clear" ${this.fx.length ? '' : 'disabled'} title="Remove all effects">Clear</button>
    <button class="btn primary" data-act="replay" ${this.fx.length ? '' : 'disabled'}>▶ Replay</button></header>
  <div class="who">Editing <b>${esc(describe(el))}</b></div>
  <div class="chips">${
    this.fx.length
      ? this.fx
          .map(
            (s) =>
              `<span class="chip" data-chip="${s.effect}" role="button" tabindex="0" aria-pressed="${s.effect === this.selected}">${esc(META[s.effect]?.title || s.effect)} <small>${s.effect}</small><button data-act="remove" data-effect="${s.effect}" aria-label="Remove ${s.effect}">✕</button></span>`,
          )
          .join('')
      : '<span class="empty">No animation yet. Hover a preset to preview it on the block.</span>'
  }</div>
  <div class="body">${sel ? this.settings(sel) : ''}
  <div class="pick"><div class="search"><input name="q" type="search" placeholder="Search effects…" value="${esc(this.query)}" aria-label="Search effects"></div>
  <div class="tabs" role="tablist">${this.groups()
    .map((g) => `<button class="tab" role="tab" data-tab="${g.id}" aria-selected="${g.id === this.tab}" title="${esc(g.desc)}">${g.label}</button>`)
    .join('')}</div></div>
  <div class="grid-wrap"></div></div>
  <div class="code"><code>${esc(toAttributeString(this.fx) || 'No effects')}</code><button class="btn" data-act="copy">Copy</button></div>
</div>`;
      this.renderGrid();
    }

    private renderGrid() {
      const wrap = this.root.querySelector('.grid-wrap');
      if (!wrap || !this.el) return;
      const all = this.hasAttribute('all');
      const fit = new Set(all ? GROUPS.flatMap((g) => g.effects) : suggest(this.el));
      const pool = all ? PRESETS : presetsFor(this.el);
      const q = this.query;
      const presets = q
        ? PRESETS.filter((p) => (p.label + ' ' + p.id + ' ' + p.fx.map((s) => s.effect).join(' ')).toLowerCase().includes(q))
        : pool.filter((p) => p.group === this.tab);
      const covered = new Set(PRESETS.flatMap((p) => p.fx.map((s) => s.effect)));
      const extra = q
        ? []
        : (GROUPS.find((g) => g.id === this.tab)?.effects ?? []).filter((n) => fit.has(n) && !covered.has(n));
      wrap.innerHTML =
        `<div class="grid">${
          presets
            .map((p) => {
              const g = GLYPH[p.id] ?? 'pulse';
              const inner = ['cascade', 'words', 'type', 'stack'].includes(g) ? '<b></b><b></b><b></b>' : g === 'arrow' ? '→' : '';
              return `<button class="tile" data-preset="${p.id}" aria-pressed="${this.isOn(p)}" title="${esc(p.fx.map((s) => s.effect).join(' + '))}"><span class="stage"><i class="g" data-g="${g}">${inner}</i></span><span>${esc(p.label)}</span></button>`;
            })
            .join('') || '<span class="empty">Nothing here fits this element. Try another tab, or search.</span>'
        }</div>` +
        (extra.length
          ? `<div class="more">More: ${extra.map((n) => `<button data-act="add" data-effect="${n}" title="${esc(META[n]?.desc || '')}">${n}</button>`).join('')}</div>`
          : '');
    }

    private settings(s: FxSpec) {
      const fs = fields(s.effect);
      if (!fs.length) return '';
      const rows = fs
        .map((f) => {
          const cur = s.options?.[f.key] ?? f.default;
          const id = 'f-' + f.key;
          let control = '';
          switch (f.type) {
            case 'select':
              control = `<select id="${id}" data-key="${f.key}">${(f.options ?? []).map((o) => `<option value="${esc(o.value)}" ${String(cur) === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
              break;
            case 'toggle':
              control = `<span class="sw"><input id="${id}" type="checkbox" data-key="${f.key}" ${cur === true || cur === '' ? 'checked' : ''}></span>`;
              break;
            case 'color': {
              const hex = /^#[0-9a-f]{6}$/i.test(String(cur)) ? String(cur) : '#ffb547';
              control = `<input type="color" data-key="${f.key}" value="${hex}" aria-label="${esc(f.label)}"><input id="${id}" type="text" data-key="${f.key}" value="${esc(String(cur ?? ''))}" placeholder="any CSS color">`;
              break;
            }
            case 'range':
              control = `<input id="${id}" type="range" data-key="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${Number(cur)}"><output>${this.show(f, cur)}</output>`;
              break;
            case 'time': {
              const ms = toMs(cur);
              const max = Math.max(3000, (toMs(f.default) || 0) * 2.5);
              control = `<input id="${id}" type="range" data-key="${f.key}" min="0" max="${max}" step="${max > 6000 ? 250 : 50}" value="${Number.isFinite(ms) ? ms : 0}"><output>${this.show(f, Number.isFinite(ms) ? ms : 0)}</output>`;
              break;
            }
            case 'percent':
              control = `<input id="${id}" type="range" data-key="${f.key}" min="0" max="100" step="1" value="${parseFloat(String(cur)) || 0}"><output>${this.show(f, parseFloat(String(cur)) || 0)}</output>`;
              break;
            case 'number':
              control = `<input id="${id}" type="number" data-key="${f.key}" step="${f.step ?? 1}" value="${esc(String(cur ?? ''))}">`;
              break;
            default:
              control = `<input id="${id}" type="text" data-key="${f.key}" value="${esc(String(s.options?.[f.key] ?? ''))}" placeholder="${esc(String(f.default ?? ''))}">`;
          }
          return `<div class="f"><label for="${id}" title="${esc(f.help)}">${esc(f.label)}</label><div class="c">${control}</div></div>`;
        })
        .join('');
      return `<details class="set" ${this.collapsed ? '' : 'open'}><summary><h4><code>${s.effect}</code><small>${esc(META[s.effect]?.title || '')}</small><span class="chev">⌄</span></h4></summary><div class="rows">${rows}</div></details>`;
    }
  }

  customElements.define(tag, FxPanel);
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
