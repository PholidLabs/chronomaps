import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseWhen, ticksToIso, daysFromCivil, civilFromDays } from '../dist/index.js';

const vectors = JSON.parse(readFileSync(new URL('../../../test-vectors/time.json', import.meta.url), 'utf8'));

test('When parsing matches the golden vectors', () => {
  for (const c of vectors.cases) {
    if (c.ok) {
      const w = parseWhen(c.input);
      assert.equal(w.isInterval, c.isInterval, c.input);
      assert.equal(w.start, c.start, `${c.input} start`);
      assert.equal(w.end, c.end, `${c.input} end`);
      assert.equal(w.from?.precision ?? null, c.fromPrecision, `${c.input} fromPrecision`);
      assert.equal(w.to?.precision ?? null, c.toPrecision, `${c.input} toPrecision`);
      assert.equal(w.from?.qualifier ?? null, c.fromQualifier, `${c.input} fromQualifier`);
      if (w.start !== null) assert.equal(ticksToIso(w.start), c.startIso, `${c.input} iso`);
    } else {
      assert.throws(() => parseWhen(c.input), undefined, `${c.input} should be rejected`);
    }
  }
});

test('civil calendar round-trips against JS Date across ±2000 years', () => {
  for (let d = -800000; d < 800000; d += 997) {
    const c = civilFromDays(d);
    assert.equal(daysFromCivil(c.year, c.month, c.day), d);
    const js = new Date(d * 86400000);
    assert.equal(js.getUTCFullYear(), c.year);
    assert.equal(js.getUTCMonth() + 1, c.month);
    assert.equal(js.getUTCDate(), c.day);
  }
});
