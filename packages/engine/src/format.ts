/** Localized text and date formatting for campaign data. Dates keep the precision the file declared. */
import { civilFromDays, parseWhen } from './time.js';
import type { LocalizedText, Ticks } from './types.js';
import type { ParsedDate, Precision, Qualifier } from './time.js';

const DAY = 86400;
const ERA: Record<string, string> = { en: 'BCE', id: 'SM' };
const CIRCA: Record<string, string> = { en: 'c. ', id: 'sekitar ' };
const monthCache = new Map<string, string[]>();

function monthNames(lang: string): string[] {
  let names = monthCache.get(lang);
  if (!names) {
    const fmt = new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' });
    names = Array.from({ length: 12 }, (_, m) => fmt.format(new Date(Date.UTC(2001, m, 15))));
    monthCache.set(lang, names);
  }
  return names;
}

/** Pick a language out of a localized string, falling back to the campaign default. */
export function pickText(text: LocalizedText | undefined | null, lang: string, fallback?: string): string {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return text[lang] ?? (fallback ? text[fallback] : undefined) ?? Object.values(text)[0] ?? '';
}

export const yearText = (year: number, lang: string): string =>
  year > 0 ? String(year) : `${1 - year} ${ERA[lang.split('-')[0]] ?? ERA.en}`;

export function formatDateParts(
  d: { precision: Precision; year: number; month?: number | null; day?: number | null; hour?: number | null; minute?: number | null },
  lang: string, withYear = true,
): string {
  const M = monthNames(lang);
  const Y = withYear ? ' ' + yearText(d.year, lang) : '';
  if (d.precision === 'year') return yearText(d.year, lang);
  if (d.precision === 'month') return M[(d.month as number) - 1] + Y;
  const pad = (n: number) => String(n).padStart(2, '0');
  let s = `${d.day} ${M[(d.month as number) - 1]}${Y}`;
  if (d.precision === 'minute' || d.precision === 'second') s += `, ${pad(d.hour as number)}:${pad(d.minute as number)}`;
  return s;
}

const qualify = (text: string, q: Qualifier | null, lang: string): string => {
  if (!q) return text;
  const c = CIRCA[lang.split('-')[0]] ?? CIRCA.en;
  if (q === 'approximate') return c + text;
  if (q === 'uncertain') return `${text} (?)`;
  return `${c}${text} (?)`;
};

/** Human-readable form of a When, collapsing ranges inside one month or year. */
export function formatWhen(when: string, lang: string): string {
  let w;
  try { w = parseWhen(when); } catch { return String(when); }
  if (!w.isInterval) return qualify(formatDateParts(w.from as ParsedDate, lang), w.from!.qualifier, lang);
  if (!w.from) return `… – ${qualify(formatDateParts(w.to as ParsedDate, lang), w.to!.qualifier, lang)}`;
  if (!w.to) return `${qualify(formatDateParts(w.from, lang), w.from.qualifier, lang)} – …`;
  const a = w.from, b = w.to;
  if (a.start === b.start && a.precision === b.precision) return qualify(formatDateParts(a, lang), a.qualifier ?? b.qualifier, lang);
  const sameYear = a.year === b.year && a.precision !== 'year' && b.precision !== 'year';
  if (sameYear && a.precision === 'day' && b.precision === 'day' && a.month === b.month && !a.qualifier && !b.qualifier) {
    return `${a.day}–${formatDateParts(b, lang)}`;
  }
  return `${qualify(formatDateParts(a, lang, !sameYear), a.qualifier, lang)} – ${qualify(formatDateParts(b, lang), b.qualifier, lang)}`;
}

/** Calendar parts of a tick (proleptic Gregorian, no time zone). */
export function tickParts(t: Ticks): { year: number; month: number; day: number; hour: number; minute: number } {
  const days = Math.floor(t / DAY), c = civilFromDays(days), rem = t - days * DAY;
  return { ...c, hour: Math.floor(rem / 3600), minute: Math.floor((rem % 3600) / 60) };
}
export const formatTicks = (t: Ticks, lang: string, precision: Precision = 'day'): string =>
  formatDateParts({ precision, ...tickParts(t) }, lang);
