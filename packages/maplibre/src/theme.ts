/** Renderer theme. Campaign files carry no paint properties (contract §1); themes map kinds to looks. */
export interface ChronoTheme {
  name: string; dark: boolean;
  sea: string; land: string; coast: string; coastOuter: string; river: string; lake: string;
  ink: string; inkSoft: string; inkFaint: string; grid: string; halo: string;
  event: string; eventPast: string;
  peak: string; hillshadeShadow: string; hillshadeHighlight: string;
  cityDot: string; cityRing: string;
}
export const parchmentLight: ChronoTheme = {
  name: 'parchment-sepia', dark: false,
  sea: '#C5D1CB', land: '#ECE3CD', coast: '#7E6F58', coastOuter: 'rgba(126,111,88,0.25)',
  river: '#7C9A98', lake: '#C5D1CB',
  ink: '#28211A', inkSoft: '#5E5140', inkFaint: '#8C7D67', grid: 'rgba(40,33,26,0.13)', halo: '#ECE3CD',
  event: '#28211A', eventPast: 'rgba(40,33,26,0.45)',
  peak: '#5E5140', hillshadeShadow: '#5C4A38', hillshadeHighlight: '#FFF8EC',
  cityDot: '#685945', cityRing: '#8B1E1E',
};
export const parchmentDark: ChronoTheme = {
  name: 'parchment-sepia-dark', dark: true,
  sea: '#101617', land: '#262520', coast: '#8F826C', coastOuter: 'rgba(143,130,108,0.22)',
  river: '#4F6F6C', lake: '#101617',
  ink: '#ECE3CF', inkSoft: '#BDB09A', inkFaint: '#847866', grid: 'rgba(236,227,207,0.12)', halo: '#262520',
  event: '#ECE3CF', eventPast: 'rgba(236,227,207,0.4)',
  peak: '#BDB09A', hillshadeShadow: '#0E0C0A', hillshadeHighlight: '#2A2924',
  cityDot: '#BDB09A', cityRing: '#C9A25A',
};

const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (c: [number, number, number]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/** Faction colours come from the data; on a dark ground they are lifted so both sides stay readable. */
export function factionColor(hex: string, theme: ChronoTheme): string {
  let c = hexToRgb(hex || '#7a6a58');
  if (theme.dark && lum(c) < 0.55) {
    const k = 0.45 + (0.55 - lum(c)) * 0.4;
    c = c.map((v) => Math.round(v + (255 - v) * k)) as [number, number, number];
  }
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
export const withAlpha = (rgb: string, a: number): string => rgb.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
