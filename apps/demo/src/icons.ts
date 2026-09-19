/** Theme-switcher glyphs: half-disc (follow the system), sun, crescent.
 *  Stroked in `currentColor` so they invert for free under
 *  `.seg button[aria-pressed="true"]`, which swaps --ink for --on-teal.
 *  Drawn on a 16px grid and scaled to 1em, so they track the button's font size. */
import { svgEl } from './dom.js';

export type ThemeMode = 'auto' | 'light' | 'dark';

const FRAME = { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' };
const STROKE = { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

/** Eight rays as one path — cheaper than eight <line> nodes and easier to keep even. */
function rays(): string {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, dx = Math.cos(a), dy = Math.sin(a);
    const at = (r: number) => `${(8 + r * dx).toFixed(2)} ${(8 + r * dy).toFixed(2)}`;
    d += `M${at(4.9)}L${at(6.6)}`;
  }
  return d;
}

export function themeIcon(mode: ThemeMode): SVGElement {
  const root = svgEl('svg', FRAME);
  if (mode === 'light') {
    root.append(svgEl('circle', { cx: '8', cy: '8', r: '3.1', ...STROKE }), svgEl('path', { d: rays(), ...STROKE }));
  } else if (mode === 'dark') {
    root.append(svgEl('path', { d: 'M14 8.53A6 6 0 1 1 7.47 2 4.67 4.67 0 0 0 14 8.53z', ...STROKE }));
  } else {
    // Outline plus a filled semicircle: the conventional "follows the system" mark.
    root.append(
      svgEl('circle', { cx: '8', cy: '8', r: '5.3', ...STROKE }),
      svgEl('path', { d: 'M8 2.7A5.3 5.3 0 0 1 8 13.3Z', fill: 'currentColor' }),
    );
  }
  return root;
}
