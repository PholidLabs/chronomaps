/** Landing page. Deliberately light: no MapLibre, no engine — just the shared
 *  style tokens, the theme/language controls, and prose rendered in both languages. */
import './style.css';
import { el, svgEl } from './dom.js';
import { UI, type UIStrings } from './i18n.js';
import { FILE_SNIPPET, LANDING, PIPELINE, type LandingStrings } from './landing-copy.js';
import {
  applyThemeMode, buildLangSeg, buildThemeSeg, savedLang, savedThemeMode, storeLang, storeThemeMode,
  type ThemeMode,
} from './prefs.js';

const LANGS = ['en', 'id'];
const state = { lang: savedLang('id'), themeMode: savedThemeMode() };
applyThemeMode(state.themeMode);   // before first paint

const $ = (id: string) => document.getElementById(id)!;
const copy = (): LandingStrings => LANDING[state.lang] ?? LANDING.id;
const ui = (): UIStrings => UI[state.lang] ?? UI.id;

/** campaign.json → loader → resolveFrame → MapLibre, as four boxes and three arrows. */
function pipeline(): SVGElement {
  const W = 748, H = 92, boxW = 160, boxH = 46, gap = (W - 4 * boxW) / 3, y = 18;
  const root = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pipe', role: 'img', 'aria-label': PIPELINE.join(' → ') });
  PIPELINE.forEach((label, i) => {
    const x = i * (boxW + gap);
    root.append(svgEl('rect', {
      x: String(x), y: String(y), width: String(boxW), height: String(boxH), rx: '3',
      fill: 'none', stroke: 'currentColor', 'stroke-width': i === 3 ? '2' : '1',
    }));
    const t = svgEl('text', {
      x: String(x + boxW / 2), y: String(y + boxH / 2 + 4), 'text-anchor': 'middle',
      fill: 'currentColor', 'font-size': '13', 'font-family': 'ui-monospace, Menlo, monospace',
    });
    t.textContent = label;
    root.append(t);
    if (i < 3) {
      const ax = x + boxW, mid = y + boxH / 2;
      root.append(svgEl('path', {
        d: `M${ax + 6} ${mid}L${ax + gap - 10} ${mid}M${ax + gap - 16} ${mid - 4}L${ax + gap - 10} ${mid}L${ax + gap - 16} ${mid + 4}`,
        fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }));
    }
  });
  return root;
}

function section(id: string, title: string, ...kids: unknown[]): HTMLElement {
  return el('section', { class: 'lx', id }, el('h2', { text: title }), ...kids);
}

function render(): void {
  const c = copy();
  document.documentElement.lang = state.lang;
  document.title = c.docTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', c.docDesc);

  buildLangSeg($('seg-lang'), LANGS, state.lang, setLang);
  buildThemeSeg($('seg-theme'), ui(), state.themeMode, setThemeMode);

  const main = $('landing');
  main.replaceChildren(
    el('section', { class: 'hero' },
      el('h1', { text: c.heroTitle }),
      el('p', { class: 'lede', text: c.heroLede }),
      el('p', { class: 'cta' },
        el('a', { class: 'btn primary', href: '/app/' }, el('i', { class: 'hand', 'aria-hidden': 'true', text: '☞' }), c.heroCta),
        el('a', { class: 'btn', href: '#how' }, c.heroAlt)),
    ),
    section('how', c.howTitle,
      el('p', { class: 'lede', text: c.howLede }),
      el('figure', { class: 'diagram' }, pipeline(), el('figcaption', { text: c.diagramCaption })),
      el('ol', { class: 'steps' },
        ...c.steps.map((s) => el('li', {}, el('h3', { text: s.title }), el('p', { text: s.body })))),
    ),
    section('file', c.fileTitle,
      el('p', { text: c.fileBody }),
      el('pre', { class: 'snippet' }, el('code', { text: FILE_SNIPPET })),
      el('p', { class: 'note', text: c.fileNote }),
    ),
    section('time', c.timeTitle, el('p', { text: c.timeBody }), el('p', { class: 'note', text: c.timeNote })),
    section('engines', c.enginesTitle, el('p', { text: c.enginesBody }), el('p', { class: 'note', text: c.enginesNote })),
    section('offline', c.offlineTitle, el('p', { text: c.offlineBody })),
    section('about', c.aboutTitle,
      el('p', { text: c.aboutBody }),
      el('p', { class: 'colophon', text: c.aboutLicence }),
      el('p', { class: 'cta' }, el('a', { class: 'btn primary', href: '/app/' }, el('i', { class: 'hand', 'aria-hidden': 'true', text: '☞' }), c.heroCta)),
    ),
  );
}

function setLang(lang: string): void {
  if (lang === state.lang) return;
  state.lang = lang;
  storeLang(lang);
  render();
}
function setThemeMode(mode: ThemeMode): void {
  if (mode === state.themeMode) return;
  state.themeMode = mode;
  storeThemeMode(mode);
  applyThemeMode(mode);
  render();
}

render();
