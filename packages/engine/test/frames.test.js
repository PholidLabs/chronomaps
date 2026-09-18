import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCampaign, resolveFrame } from '../dist/index.js';

const CASES = [
  ['../../../test-vectors/null-island.frames.json', '../../../data/campaigns/fixtures/null-island.json', true],
  ['../../../test-vectors/java-war-1825.frames.json', '../../../data/campaigns/java-war-1825.json', false],
  ['../../../test-vectors/napoleon-russia-1812.frames.json', '../../../data/campaigns/napoleon-russia-1812.json', false],
];
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const close = (a, b, path) => {
  if (typeof a === 'number' && typeof b === 'number') { assert.ok(Math.abs(a - b) <= 1e-6, `${path}: ${a} vs ${b}`); return; }
  if (Array.isArray(a)) { assert.equal(a.length, b.length, `${path} length`); a.forEach((v, i) => close(v, b[i], `${path}/${i}`)); return; }
  if (a && typeof a === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b ?? {})]);
    for (const k of keys) close(a[k], b?.[k], `${path}/${k}`);
    return;
  }
  assert.deepEqual(a, b, path);
};

for (const [vectorPath, campaignPath, includeTrail] of CASES) {
  test(`frames match vectors: ${campaignPath.split('/').pop()}`, () => {
    const vectors = read(vectorPath);
    const { campaign, diagnostics } = loadCampaign(read(campaignPath));
    assert.ok(campaign, `campaign failed to load: ${JSON.stringify(diagnostics.filter((d) => d.level === 'error'))}`);
    const codes = (list) => list.map((d) => `${d.level} ${d.code} ${d.path}`).sort();
    assert.deepEqual(codes(diagnostics), codes(vectors.diagnostics), 'diagnostics drifted from the vectors');
    for (const expected of vectors.frames) {
      const frame = resolveFrame(campaign, expected.t, { includeTrail });
      close(frame, expected.frame, `${expected.chapter}@p=${expected.p}`);
    }
  });
}
