/** Renderer theme. Campaign files carry no paint properties (contract §1); themes map kinds to looks. */
export interface ChronoTheme {
  name: string; dark: boolean;
  sea: string; land: string; coast: string; coastOuter: string;
  coastRipple1: string; coastRipple2: string; coastRipple3: string;
  river: string; lake: string;
  ink: string; inkSoft: string; inkFaint: string; grid: string; halo: string;
  event: string; eventPast: string;
  peak: string; mountainStroke: string; mountainHatch: string; mountainFill: string;
  treeStroke: string; treeCanopy: string;
  watermark: string;
  hillshadeShadow: string; hillshadeHighlight: string;
  cityDot: string; cityRing: string;
}
export const parchmentLight: ChronoTheme = {
  name: 'parchment-sepia', dark: false,
  sea: '#BDCCC6', land: '#E2C99D', coast: '#28211A', coastOuter: 'rgba(40,33,26,0.42)',
  coastRipple1: 'rgba(44,60,56,0.65)', coastRipple2: 'rgba(48,68,64,0.38)', coastRipple3: 'rgba(52,76,72,0.20)',
  river: '#608682', lake: '#BDCCC6',
  ink: '#221C16', inkSoft: '#564937', inkFaint: '#887963', grid: 'rgba(40,33,26,0.11)', halo: '#E2C99D',
  event: '#221C16', eventPast: 'rgba(40,33,26,0.45)',
  peak: '#4E4030', mountainStroke: '#221C16', mountainHatch: 'rgba(34,28,22,0.65)', mountainFill: '#EADBBE',
  treeStroke: '#2D3A2C', treeCanopy: 'rgba(102,128,102,0.35)',
  watermark: 'rgba(40,55,50,0.22)',
  hillshadeShadow: '#554230', hillshadeHighlight: '#FFF7EA',
  cityDot: '#5E4E3A', cityRing: '#8A662D',
};
export const parchmentDark: ChronoTheme = {
  name: 'parchment-sepia-dark', dark: true,
  sea: '#101516', land: '#221E19', coast: '#8F826C', coastOuter: 'rgba(201,162,90,0.30)',
  coastRipple1: 'rgba(201,162,90,0.40)', coastRipple2: 'rgba(201,162,90,0.22)', coastRipple3: 'rgba(201,162,90,0.11)',
  river: '#4A6C69', lake: '#101516',
  ink: '#EDE4D8', inkSoft: '#C2B5A0', inkFaint: '#8C8071', grid: 'rgba(236,227,207,0.10)', halo: '#221E19',
  event: '#EDE4D8', eventPast: 'rgba(236,227,207,0.38)',
  peak: '#C9A25A', mountainStroke: '#C9A25A', mountainHatch: 'rgba(201,162,90,0.55)', mountainFill: '#2E2822',
  treeStroke: '#7A9A78', treeCanopy: 'rgba(122,154,120,0.28)',
  watermark: 'rgba(201,162,90,0.18)',
  hillshadeShadow: '#0A0807', hillshadeHighlight: '#2E2B25',
  cityDot: '#C2B5A0', cityRing: '#C9A25A',
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
