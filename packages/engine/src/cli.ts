#!/usr/bin/env node
/**
 * chronomap-check — validate campaign files and dry-run playback.
 *   chronomap-check <campaign.json>... [--frames] [--strict] [--quiet] [--json]
 * Structural (JSON Schema) validation runs when ajv is installed; semantics always run.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCampaign } from './campaign.js';
import { chapterTime, resolveFrame } from './resolve.js';
import { pickText } from './format.js';
import type { CampaignFile, Diagnostic } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: chronomap-check <campaign.json>... [--frames] [--strict] [--quiet] [--json]');
  process.exit(2);
}

async function schemaErrors(raw: unknown): Promise<Diagnostic[]> {
  let Ajv: any, addFormats: any;
  try {
    Ajv = (await import('ajv/dist/2020.js')).default;
    addFormats = (await import('ajv-formats')).default;
  } catch { return []; } // ajv not installed: semantics only
  const schemaPath = resolvePath(here, '../../../schema/campaign.schema.json');
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));
  if (validate(raw)) return [];
  const byPath = new Map<string, string[]>();
  for (const e of validate.errors ?? []) {
    if (['oneOf', 'anyOf', 'if', 'allOf'].includes(e.keyword)) continue;
    const msg = e.keyword === 'additionalProperties'
      ? `unknown property "${e.params.additionalProperty}" (custom fields must start with "x-")`
      : e.keyword === 'enum' ? `must be one of ${e.params.allowedValues.join(', ')}` : e.message;
    const list = byPath.get(e.instancePath) ?? [];
    if (!list.includes(msg)) list.push(msg);
    byPath.set(e.instancePath, list);
  }
  return [...byPath].map(([path, msgs]) => ({ level: 'error' as const, code: 'S001', path: path || '/', message: msgs.join('; ') }));
}

const fmtCoord = (c?: [number, number] | null) => (c ? `[${c[0].toFixed(3)}, ${c[1].toFixed(3)}]` : '—');
let exitCode = 0;
const report: unknown[] = [];

for (const file of files) {
  let raw: CampaignFile;
  try { raw = JSON.parse(readFileSync(file, 'utf8')); } catch (e) {
    report.push({ file, diagnostics: [{ level: 'error', code: 'E000', path: '', message: `Cannot read JSON: ${(e as Error).message}` }] });
    exitCode = 1; continue;
  }
  const diagnostics = [...(await schemaErrors(raw)), ...loadCampaign(raw).diagnostics];
  const { campaign } = loadCampaign(raw);
  const counts = { error: 0, warning: 0, info: 0 } as Record<string, number>;
  diagnostics.forEach((d) => { counts[d.level]++; });
  if (counts.error || (flags.has('--strict') && counts.warning)) exitCode = 1;
  report.push({ file, counts, diagnostics });
  if (flags.has('--json')) continue;

  console.log(`\n${file}`);
  console.log(`  ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info`);
  for (const d of diagnostics) {
    if (flags.has('--quiet') && d.level !== 'error') continue;
    if (d.level === 'info' && !flags.has('--frames')) continue;
    console.log(`  ${d.level.padEnd(7)} ${d.code} ${d.path}  ${d.message}`);
  }
  if (!campaign) continue;
  console.log(`  ${campaign.factions.size} factions · ${campaign.places.size} places · ${campaign.entities.length} entities · ${campaign.events.length} events · ${campaign.chapters.length} chapters`);

  if (flags.has('--frames')) {
    const lang = campaign.defaultLanguage;
    console.log('\n  Playback dry-run (p = scroll progress through the chapter):');
    for (const ch of campaign.chapters) {
      console.log(`\n  ▸ ${ch.id} — ${pickText(ch.raw.title, lang)}  [${ch.raw.when}]`);
      for (const p of [0, 0.5, 1]) {
        const t = chapterTime(ch, p);
        const f = resolveFrame(campaign, t, { includeTrail: false });
        const active = f.events.filter((e) => e.phase === 'active').map((e) => e.id);
        const units = f.entities.filter((e) => e.kind === 'unit')
          .map((u) => `${u.id}@${fmtCoord(u.position)}${u.moving ? `→${((u.legProgress ?? 0) * 100).toFixed(0)}%` : ''}${u.status !== 'active' ? `(${u.status})` : ''}${u.strength ? ` n=${u.strength}` : ''}`);
        console.log(`    p=${p.toFixed(1)} ${f.iso.slice(0, 16)}  active: ${active.join(', ') || '—'}`);
        if (units.length) console.log(`           units: ${units.join('; ')}`);
      }
    }
  }
}
if (flags.has('--json')) console.log(JSON.stringify(report, null, 2));
process.exit(exitCode);
