import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCampaign } from '../dist/index.js';

const base = JSON.parse(readFileSync(new URL('../../../data/campaigns/fixtures/null-island.json', import.meta.url), 'utf8'));
const mutate = (fn) => { const c = structuredClone(base); fn(c); return loadCampaign(c).diagnostics.map((d) => d.code); };

test('the loader catches contract violations', () => {
  assert.ok(mutate((c) => { c.places[1].id = 'harbor'; }).includes('E001'), 'duplicate id');
  assert.ok(mutate((c) => { c.chapters[0].focus.push('nowhere'); }).includes('E002'), 'dangling reference');
  assert.ok(mutate((c) => { c.entities[0].faction = 'harbor'; }).includes('E003'), 'wrong reference type');
  assert.ok(mutate((c) => { c.events[0].when = '1825-7-20'; }).includes('E004'), 'bad when');
  assert.ok(mutate((c) => { c.events[0].when = '1825-07-20'; }).includes('E005'), 'outside extent');
  assert.ok(mutate((c) => { c.entities[0].track[1].when = '-0010-04-01'; }).includes('E006'), 'track out of order');
  assert.ok(mutate((c) => { c.chapters[0].title = { id: 'Berkumpul' }; }).includes('E008'), 'missing default language');
  assert.ok(mutate((c) => { c.chapters[0].title.fr = 'Rassemblement'; }).includes('E009'), 'undeclared language');
  assert.ok(mutate((c) => { c.entities[2].geometry.coordinates[0].pop(); }).includes('E010'), 'open polygon ring');
  assert.ok(mutate((c) => { c.events[0].participants[0].losses = { min: 9, max: 1 }; }).includes('E012'), 'min > max');
  assert.ok(mutate((c) => { c.chronomap = '2.0'; }).includes('E013'), 'unsupported version');
  assert.ok(mutate((c) => { c.chapters[1].body.en = 'Click [here](javascript:alert(1))'; }).includes('E015'), 'unsafe url');
  assert.ok(mutate((c) => { c.chapters[1].body.en = '<img src=x onerror=alert(1)>'; }).includes('E017'), 'raw html');
  assert.ok(mutate((c) => { c.places[2].coordinates = [50, 0.4]; }).includes('W102'), 'outside map bounds');
});

test('the shipped campaigns load without errors', () => {
  for (const p of ['java-war-1825.json', 'napoleon-russia-1812.json']) {
    const raw = JSON.parse(readFileSync(new URL(`../../../data/campaigns/${p}`, import.meta.url), 'utf8'));
    const { campaign, diagnostics } = loadCampaign(raw);
    assert.ok(campaign, p);
    assert.equal(diagnostics.filter((d) => d.level === 'error').length, 0, p);
  }
});
