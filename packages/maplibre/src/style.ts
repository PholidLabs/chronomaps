/** Basemap style: self-hosted Natural Earth GeoJSON, no tile keys, works offline. */
import type { StyleSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import type { ChronoTheme } from './theme.js';

export interface BasemapOptions {
  /** Where land.geojson / rivers.geojson / lakes.geojson are served from. */
  basemapPath?: string;
  theme: ChronoTheme;
  /** Optional open DEM for 3D terrain, e.g. AWS terrain tiles. Off by default: no network needed. */
  terrain?: { tiles: string[]; encoding?: 'terrarium' | 'mapbox'; tileSize?: number; exaggeration?: number; attribution?: string };
}

export function createBasemapStyle(opts: BasemapOptions): StyleSpecification {
  const { theme, basemapPath = '/data/basemap' } = opts;
  const layers: StyleSpecification['layers'] = [
    { id: 'sea', type: 'background', paint: { 'background-color': theme.sea } },
    // Antique coastal water-lining / bathymetric ribbons
    {
      id: 'coast-wash-outer', type: 'line', source: 'land',
      paint: {
        'line-color': theme.coastOuter,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2.6, 10, 5.2],
        'line-offset': ['interpolate', ['linear'], ['zoom'], 3, -1.8, 10, -3.6],
        'line-opacity': 0.3,
      },
    },
    {
      id: 'coast-wash-inner', type: 'line', source: 'land',
      paint: {
        'line-color': theme.coastOuter,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.3, 10, 2.6],
        'line-offset': ['interpolate', ['linear'], ['zoom'], 3, -0.8, 10, -1.6],
        'line-opacity': 0.5,
      },
    },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': theme.land } },
  ];

  if (opts.terrain) {
    layers.push({
      id: 'hillshade', type: 'hillshade', source: 'terrain',
      paint: {
        'hillshade-illumination-direction': 315,
        'hillshade-exaggeration': 0.45,
        'hillshade-shadow-color': theme.hillshadeShadow,
        'hillshade-highlight-color': theme.hillshadeHighlight,
        'hillshade-accent-color': theme.inkFaint,
      },
    });
  }

  layers.push(
    { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': theme.lake } },
    {
      id: 'lakes-outline', type: 'line', source: 'lakes',
      paint: {
        'line-color': theme.coast,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 10, 0.9],
        'line-opacity': 0.7,
      },
    },
    {
      id: 'rivers', type: 'line', source: 'rivers',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': theme.river,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          3, ['case', ['<=', ['get', 'rank'], 2], 1.0, 0.5],
          7, ['case', ['<=', ['get', 'rank'], 1], 2.4, ['<=', ['get', 'rank'], 2], 1.8, ['<=', ['get', 'rank'], 3], 1.2, 0.7],
          11, ['case', ['<=', ['get', 'rank'], 1], 4.2, ['<=', ['get', 'rank'], 2], 3.2, ['<=', ['get', 'rank'], 3], 2.2, 1.4],
        ],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 7, 0.92],
      },
      filter: ['any', ['<=', ['get', 'rank'], 2], ['all', ['<=', ['get', 'rank'], 4], ['>=', ['zoom'], 6]], ['>=', ['zoom'], 8]],
    },
    { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': theme.coast, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 10, 1.1], 'line-opacity': 0.85 } },
    ...graticuleLayers(theme.grid),
    {
      id: 'basemap-peaks-dot', type: 'circle', source: 'peaks',
      filter: ['any', ['<=', ['get', 'rank'], 1], ['>=', ['zoom'], 7.5]],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 10, 4.5],
        'circle-color': theme.peak,
        'circle-stroke-width': 1.2,
        'circle-stroke-color': theme.land,
      },
    },
    {
      id: 'basemap-places-dot', type: 'circle', source: 'places',
      filter: ['any', ['<=', ['get', 'rank'], 1], ['all', ['<=', ['get', 'rank'], 2], ['>=', ['zoom'], 6.5]], ['>=', ['zoom'], 8.2]],
      paint: {
        'circle-radius': ['case', ['<=', ['get', 'rank'], 1], 4.0, ['<=', ['get', 'rank'], 2], 3.0, 2.2],
        'circle-color': ['case', ['<=', ['get', 'rank'], 1], theme.cityRing, theme.cityDot],
        'circle-stroke-width': ['case', ['<=', ['get', 'rank'], 1], 1.8, 1.2],
        'circle-stroke-color': theme.land,
      },
    },
  );

  const style: StyleSpecification = {
    version: 8,
    name: theme.name,
    // No glyphs or sprite on purpose: labels are DOM elements, so the style needs no binary assets.
    sources: {
      land: { type: 'geojson', data: `${basemapPath}/land.geojson`, attribution: 'Natural Earth' },
      lakes: { type: 'geojson', data: `${basemapPath}/lakes.geojson` },
      rivers: { type: 'geojson', data: `${basemapPath}/rivers.geojson` },
      peaks: { type: 'geojson', data: `${basemapPath}/peaks.geojson` },
      places: { type: 'geojson', data: `${basemapPath}/places.geojson` },
      graticule: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers,
  };
  if (opts.terrain) {
    style.sources.terrain = {
      type: 'raster-dem', tiles: opts.terrain.tiles, tileSize: opts.terrain.tileSize ?? 256,
      encoding: opts.terrain.encoding ?? 'terrarium', maxzoom: 14, attribution: opts.terrain.attribution,
    } as never;
    style.terrain = { source: 'terrain', exaggeration: opts.terrain.exaggeration ?? 1.4 };
  }
  return style;
}

/**
 * Degree-grid steps, coarse to fine. A step is "active" from the zoom at which
 * its lines sit at least ~110 px apart, so each step owns one zoom band.
 */
export const GRATICULE_STEPS = [30, 15, 10, 5, 2, 1, 0.5, 0.25, 1 / 6, 1 / 12, 1 / 30, 1 / 60] as const;

/** Zoom at which `step` degrees first spans ~110 px. */
export function zoomForStep(step: number): number {
  return Math.log2((110 * 360) / (512 * step));
}

/**
 * One line layer per step, banded by zoom. The data carries every line once,
 * tagged with the coarsest step it belongs to, so a 10° meridian is drawn by
 * whichever band is active rather than duplicated. Banding by layer minzoom
 * (rather than regenerating the grid on every move) keeps the grid stable
 * during a camera flight: there is no moment where the map shows a rectangle
 * of grid left over from the previous view.
 */
export function graticuleLayers(color: string): StyleSpecification['layers'] {
  return GRATICULE_STEPS.map((step, i) => ({
    id: `graticule-${i}`,
    type: 'line' as const,
    source: 'graticule',
    minzoom: i === 0 ? 0 : zoomForStep(step),
    maxzoom: i === GRATICULE_STEPS.length - 1 ? 24 : zoomForStep(GRATICULE_STEPS[i + 1]),
    filter: ['>=', ['get', 'level'], step] as never,
    paint: { 'line-color': color, 'line-width': 0.7 },
  }));
}

/**
 * Static degree grid for a campaign. Generated once, over the campaign bounds
 * padded generously so that zooming out never reveals the edge of the grid,
 * and down to the finest step that stays inside `budget` lines.
 */
export function graticuleFor(
  bounds: { west: number; south: number; east: number; north: number },
  opts: { padFraction?: number; minPadDeg?: number; budget?: number } = {},
): FeatureCollection {
  const { padFraction = 0.75, minPadDeg = 8, budget = 3000 } = opts;
  const padLng = Math.max((bounds.east - bounds.west) * padFraction, minPadDeg);
  const padLat = Math.max((bounds.north - bounds.south) * padFraction, minPadDeg);
  const w = Math.max(-180, bounds.west - padLng), e = Math.min(180, bounds.east + padLng);
  const s = Math.max(-85, bounds.south - padLat), n = Math.min(85, bounds.north + padLat);

  // Finest step we can afford over that box.
  let finest: number = GRATICULE_STEPS[0];
  for (const step of GRATICULE_STEPS) {
    const lines = (e - w) / step + (n - s) / step;
    if (lines > budget) break;
    finest = step;
  }

  // Coarsest step a degree value belongs to; 1/60° values are compared in
  // arc-seconds so that 1/6 and 1/12 divide exactly in integer arithmetic.
  const unit = 1 / 3600;
  const levelOf = (deg: number): number => {
    const secs = Math.round(deg / unit);
    for (const step of GRATICULE_STEPS) {
      if (step < finest) break;
      if (secs % Math.round(step / unit) === 0) return step;
    }
    return finest;
  };

  const features: Feature[] = [];
  const firstMultiple = (from: number, step: number) => Math.ceil(from / step - 1e-9) * step;
  for (let lng = firstMultiple(w, finest); lng <= e + 1e-9; lng += finest) {
    const deg = Math.round(lng / unit) * unit;
    features.push({ type: 'Feature', properties: { deg, axis: 'lng', level: levelOf(deg) }, geometry: { type: 'LineString', coordinates: [[deg, s], [deg, n]] } });
  }
  for (let lat = firstMultiple(s, finest); lat <= n + 1e-9; lat += finest) {
    const deg = Math.round(lat / unit) * unit;
    features.push({ type: 'Feature', properties: { deg, axis: 'lat', level: levelOf(deg) }, geometry: { type: 'LineString', coordinates: [[w, deg], [e, deg]] } });
  }
  return { type: 'FeatureCollection', features };
}
