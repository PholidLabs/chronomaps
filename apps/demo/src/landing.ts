/**
 * ChronoMap Landing Page.
 * Implements the scholarly Stitch codex design with:
 * - Living parchment WebGL shader
 * - Real-time Tabula Cartographica simulation & timeline scrubber
 * - Dynamic bilingual switching (ID / EN)
 * - Theme mode switching (Light / Dark) synchronized with the Map app
 * - Smooth anchor navigation and app launch actions
 */
import './style.css';
import { LANDING, type LandingStrings } from './landing-copy.js';
import {
  applyThemeMode, savedLang, savedThemeMode, storeLang, storeThemeMode,
  type ThemeMode,
} from './prefs.js';

const state = {
  lang: savedLang('id'),
  themeMode: savedThemeMode(),
};

// Apply initial theme mode before painting
applyThemeMode(state.themeMode);

const copy = (): LandingStrings => LANDING[state.lang] ?? LANDING.id;

/** ----------------------------------------------------------------
 *  1. Bilingual DOM Updates
 *  ---------------------------------------------------------------- */
function updateLanguage(): void {
  const c = copy();
  document.documentElement.lang = state.lang;
  document.title = c.docTitle;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', c.docDesc);

  // Update text-only nodes with [data-i18n]
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as keyof LandingStrings;
    const val = c[key];
    if (typeof val === 'string') {
      el.textContent = val;
    }
  });

  // Update HTML-allowed nodes with [data-i18n-html]
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml as keyof LandingStrings;
    const val = c[key];
    if (typeof val === 'string') {
      el.innerHTML = val;
    }
  });

  // Update pipeline stages
  const stageNodes = document.querySelectorAll<HTMLElement>('[data-stage-idx]');
  stageNodes.forEach((node) => {
    const idx = Number(node.dataset.stageIdx);
    const stage = c.pipelineStages[idx];
    if (!stage) return;
    const titleEl = node.querySelector<HTMLElement>('.stage-title');
    const descEl = node.querySelector<HTMLElement>('.stage-desc');
    const metaEl = node.querySelector<HTMLElement>('.stage-meta');
    const metricEl = node.querySelector<HTMLElement>('.stage-metric');
    if (titleEl) titleEl.textContent = stage.title;
    if (descEl) descEl.textContent = stage.desc;
    if (metaEl) metaEl.textContent = stage.meta;
    if (metricEl) metricEl.textContent = stage.metric;
  });

  // Update scholarly section steps (I, II, III, IV)
  const stepNodes = document.querySelectorAll<HTMLElement>('[data-step-idx]');
  stepNodes.forEach((node) => {
    const idx = Number(node.dataset.stepIdx);
    const step = c.sectionSteps[idx];
    if (!step) return;
    const numEl = node.querySelector<HTMLElement>('.step-num');
    const titleEl = node.querySelector<HTMLElement>('.step-title');
    const bodyEl = node.querySelector<HTMLElement>('.step-body');
    const noteEl = node.querySelector<HTMLElement>('.step-note');
    if (numEl) numEl.textContent = step.num + '.';
    if (titleEl) titleEl.textContent = step.title;
    if (bodyEl) bodyEl.textContent = step.body;
    if (noteEl) noteEl.textContent = step.note;
  });

  // Update language buttons active state
  const btnEn = document.getElementById('lang-en');
  const btnId = document.getElementById('lang-id');
  if (btnEn && btnId) {
    if (state.lang === 'en') {
      btnEn.className = 'px-2 py-0.5 font-label-sm text-label-sm bg-secondary text-on-secondary rounded-DEFAULT font-semibold';
      btnId.className = 'px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface';
    } else {
      btnEn.className = 'px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface';
      btnId.className = 'px-2 py-0.5 font-label-sm text-label-sm bg-secondary text-on-secondary rounded-DEFAULT font-semibold';
    }
  }
}

function setLanguage(lang: string): void {
  if (lang === state.lang) return;
  state.lang = lang;
  storeLang(lang);
  updateLanguage();
}

/** ----------------------------------------------------------------
 *  2. Theme Toggling
 *  ---------------------------------------------------------------- */
function initThemeToggle(): void {
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-toggle-icon');

  function updateIcon(): void {
    if (!themeIcon) return;
    const isDark = document.documentElement.classList.contains('dark');
    themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
  }

  updateIcon();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      const nextMode: ThemeMode = isCurrentlyDark ? 'light' : 'dark';
      state.themeMode = nextMode;
      storeThemeMode(nextMode);
      applyThemeMode(nextMode);
      updateIcon();
    });
  }
}

/** ----------------------------------------------------------------
 *  3. Living Parchment WebGL Shader
 *  ---------------------------------------------------------------- */
function initParchmentShader(): void {
  const canvas = document.getElementById('shader-canvas-ANIMATION_3') as HTMLCanvasElement | null;
  if (!canvas) return;

  function syncSize(): void {
    const w = canvas?.clientWidth || window.innerWidth || 1280;
    const h = canvas?.clientHeight || window.innerHeight || 720;
    if (canvas && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
  if (!gl) return;

  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_dark;
varying vec2 v_texCoord;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.06;

    float n1 = snoise(st * 2.2 + vec2(t * 0.2, t * 0.15));
    float n2 = snoise(st * 5.0 - vec2(t * 0.35, t * 0.2));
    float n3 = snoise(st * 12.0 + vec2(n1 * 0.8, n2 * 0.8));

    vec2 center = vec2(0.5 * (u_resolution.x / u_resolution.y), 0.5);
    float d = distance(st, center);
    float rings = sin(d * 24.0 - u_time * 0.3) * 0.5 + 0.5;
    rings *= smoothstep(1.5, 0.2, d) * 0.15;

    float blend = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    // Light Mode: Yellow Sand Parchment matched to logo.jpeg (#F2EBD9 / #ECE1C3)
    vec3 lightBase = vec3(0.949, 0.922, 0.851);
    vec3 lightShadow = vec3(0.902, 0.863, 0.776);
    vec3 lightGold = vec3(0.79, 0.64, 0.35);

    // Dark Mode: Obsidian Charcoal with subtle warm gold dust
    vec3 darkBase = vec3(0.078, 0.071, 0.063);
    vec3 darkShadow = vec3(0.110, 0.094, 0.082);
    vec3 darkGold = vec3(0.788, 0.635, 0.353);

    vec3 parchmentBase = mix(lightBase, darkBase, u_dark);
    vec3 parchmentShadow = mix(lightShadow, darkShadow, u_dark);
    vec3 goldDust = mix(lightGold, darkGold, u_dark);

    vec3 col = mix(parchmentBase, parchmentShadow, smoothstep(-0.4, 0.6, blend));

    col += goldDust * pow(max(0.0, n2 * rings * 3.0), 2.0) * (0.25 + u_dark * 0.15);
    col -= vec3(0.08, 0.06, 0.05) * (1.0 - smoothstep(0.0, 1.2, distance(gl_FragCoord.xy / u_resolution.xy, vec2(0.5)))) * 0.12;

    gl_FragColor = vec4(col, 1.0);
}`;

  const glContext = gl;
  function compileShader(type: number, src: string): WebGLShader | null {
    const s = glContext.createShader(type);
    if (!s) return null;
    glContext.shaderSource(s, src);
    glContext.compileShader(s);
    return s;
  }

  const vShader = compileShader(glContext.VERTEX_SHADER, vs);
  const fShader = compileShader(glContext.FRAGMENT_SHADER, fs);
  if (!vShader || !fShader) return;

  const prog = gl.createProgram();
  if (!prog) return;
  gl.attachShader(prog, vShader);
  gl.attachShader(prog, fShader);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uDark = gl.getUniformLocation(prog, 'u_dark');

  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  window.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  });

  function render(t: number): void {
    if (!gl || !canvas) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const isDark = document.documentElement.classList.contains('dark') ? 1.0 : 0.0;
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
    if (uDark) gl.uniform1f(uDark, isDark);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

/** ----------------------------------------------------------------
 *  4. Real-time Map Simulation & Scrubber
 *  ---------------------------------------------------------------- */
function initMapPlayground(): void {
  const playBtn = document.getElementById('play-pause-btn');
  const timeSlider = document.getElementById('time-slider') as HTMLInputElement | null;
  const clockTimestamp = document.getElementById('clock-timestamp');
  const subutaiMarker = document.getElementById('marker-subutai');
  const tickCounter = document.getElementById('tick-counter');

  let isPlaying = false;
  let animInterval: number | null = null;
  let speedMultiplier = 1.0;

  function updateMapState(val: number): void {
    // Interpolate Subutai troop marker along march corridor
    if (subutaiMarker) {
      const posX = 40 + (val * 0.35);
      const posY = 58 - (val * 0.22);
      subutaiMarker.style.left = `${posX}%`;
      subutaiMarker.style.top = `${posY}%`;
    }

    if (clockTimestamp) {
      const hour = Math.floor((val / 100) * 18) + 4;
      const min = (val * 7) % 60;
      const padH = hour < 10 ? '0' + hour : String(hour);
      const padM = min < 10 ? '0' + min : String(min);
      clockTimestamp.textContent = `1241-04-09 ${padH}:${padM}:00 UTC`;
    }

    if (tickCounter) {
      const tick = 1842000 + Math.floor(val * 14.5);
      tickCounter.textContent = `#${tick.toLocaleString()}`;
    }
  }

  function startAnimation(): void {
    if (animInterval) clearInterval(animInterval);
    const baseDelay = 120 / speedMultiplier;
    animInterval = window.setInterval(() => {
      if (!timeSlider) return;
      let cur = parseInt(timeSlider.value, 10);
      cur = (cur + 1) % 101;
      timeSlider.value = String(cur);
      updateMapState(cur);
    }, baseDelay);
  }

  if (playBtn && timeSlider) {
    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      const icon = playBtn.querySelector<HTMLElement>('.material-symbols-outlined');
      if (isPlaying) {
        if (icon) icon.textContent = 'pause';
        startAnimation();
      } else {
        if (icon) icon.textContent = 'play_arrow';
        if (animInterval) clearInterval(animInterval);
      }
    });

    timeSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      updateMapState(parseInt(target.value, 10));
    });

    // Speed multiplier buttons
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-speed]').forEach((b) => {
          b.className = 'px-2 py-0.5 rounded font-label-sm text-[11px] text-on-surface-variant hover:text-on-surface';
        });
        btn.className = 'px-2 py-0.5 rounded font-label-sm text-[11px] bg-secondary text-on-secondary font-semibold';
        speedMultiplier = parseFloat(btn.dataset.speed || '1.0');
        if (isPlaying) {
          startAnimation();
        }
      });
    });
  }
}

/** ----------------------------------------------------------------
 *  5. App Launch & Navigation Wiring
 *  ---------------------------------------------------------------- */
function initActions(): void {
  // Direct launch buttons to /app/
  const launchSelectors = ['#btn-open-map', '#btn-start-nav', '#btn-studio-cta'];
  launchSelectors.forEach((sel) => {
    document.querySelector(sel)?.addEventListener('click', () => {
      window.location.href = '/app/';
    });
  });

  // Example file button launches the map with Java War campaign
  document.getElementById('btn-load-demo')?.addEventListener('click', () => {
    window.location.href = '/app/';
  });

  // Schema doc button smoothly scrolls to specification section
  document.getElementById('btn-schema-doc')?.addEventListener('click', () => {
    document.getElementById('schema')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Language selectors
  document.getElementById('lang-en')?.addEventListener('click', () => setLanguage('en'));
  document.getElementById('lang-id')?.addEventListener('click', () => setLanguage('id'));
}

/** ----------------------------------------------------------------
 *  Main Initialization
 *  ---------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  updateLanguage();
  initThemeToggle();
  initParchmentShader();
  initMapPlayground();
  initActions();
});
