import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const readJson = (rel) => JSON.parse(readFileSync(new URL(`../../../data/basemap/${rel}`, import.meta.url), 'utf8'));

test('basemap geojson assets are well-formed and contain detailed features', () => {
  for (const file of ['land.geojson', 'lakes.geojson', 'rivers.geojson', 'peaks.geojson', 'places.geojson']) {
    assert.ok(existsSync(new URL(`../../../data/basemap/${file}`, import.meta.url)), `${file} exists`);
    const data = readJson(file);
    assert.equal(data.type, 'FeatureCollection', `${file} is a FeatureCollection`);
    assert.ok(Array.isArray(data.features), `${file} has features array`);
    assert.ok(data.features.length > 0, `${file} features is non-empty`);
  }

  // Verify Java rivers are present
  const rivers = readJson('rivers.geojson');
  const solo = rivers.features.find((f) => f.properties?.name === 'Bengawan Solo');
  assert.ok(solo, 'Bengawan Solo river exists');
  const progo = rivers.features.find((f) => f.properties?.name === 'Kali Progo');
  assert.ok(progo, 'Kali Progo river exists');

  // Verify volcanic peaks are present
  const peaks = readJson('peaks.geojson');
  const merapi = peaks.features.find((f) => f.properties?.id === 'merapi');
  assert.ok(merapi, 'Gunung Merapi peak exists');
  assert.equal(merapi.properties.elevation, 2911);

  // Verify historical settlements are present
  const places = readJson('places.geojson');
  const batavia = places.features.find((f) => f.properties?.id === 'batavia');
  assert.ok(batavia, 'Batavia settlement exists');
  const yk = places.features.find((f) => f.properties?.id === 'yogyakarta-keraton');
  assert.ok(yk, 'Keraton Yogyakarta exists');
});
