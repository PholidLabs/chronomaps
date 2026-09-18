/**
 * Campaign renderer for MapLibre.
 *
 * Static geometry (places, uncertainty halos, territories, routes) is set once at load.
 * Per frame only small things change: trail lines, event circles, unit and fort markers.
 * That is the rule from contract §7.2 — never stream the whole map on every frame.
 */
import { Marker, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { Feature, FeatureCollection, Position } from 'geojson';
import type { FrameState, NormEntity, NormalizedCampaign, Ticks } from '@chronomap/engine';
import { alongPath, pickText } from '@chronomap/engine';
import { factionColor, parchmentLight, withAlpha, type ChronoTheme } from './theme.js';
import { graticuleFor } from './style.js';

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const DAY = 86400;
const BATTLE_KINDS = new Set(['battle', 'siege', 'skirmish', 'raid', 'massacre']);

export interface RendererOptions {
  theme?: ChronoTheme; language?: string; maxStrengthBandMeters?: number;
  /** Elements labels must not sit under — the legend, the cartouche, the timeline. */
  avoidSelector?: string;
}

interface LabelMarker { marker: Marker; el: HTMLElement }
interface Box { left: number; right: number; top: number; bottom: number }
interface Blocker { box: Box; owner: Element | null; symbol: boolean }
function pushBox(into: Blocker[], el: Element | null, owner: Element | null, symbol: boolean): void {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return;
  const r = el.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) into.push({ box: r, owner, symbol });
}

export class ChronoMapRenderer {
  private campaign: NormalizedCampaign | null = null;
  private theme: ChronoTheme;
  private language: string;
  private bandMeters: number;
  private avoidSelector: string;
  private maxStrength = 0;
  private unitMarkers = new Map<string, LabelMarker>();
  private fortMarkers = new Map<string, LabelMarker>();
  private placeLabels = new Map<string, LabelMarker>();
  private eventLabels = new Map<string, LabelMarker>();
  private focus = new Set<string>();
  private lastTerritoryKey = '';
  private ready = false;

  constructor(private map: MapLibreMap, opts: RendererOptions = {}) {
    this.theme = opts.theme ?? parchmentLight;
    this.language = opts.language ?? 'en';
    this.bandMeters = opts.maxStrengthBandMeters ?? 18000;
    this.avoidSelector = opts.avoidSelector ?? '[data-cm-avoid]';
    const install = () => { this.installLayers(); this.ready = true; this.refreshGraticule(); };
    if (this.map.isStyleLoaded()) install(); else this.map.once('load', install);
    this.map.on('zoom', () => this.applyLabelVisibility());
    this.map.on('move', () => this.scheduleDeclutter());
  }

  /* ---------------------------------------------------------------- layers */
  private installLayers(): void {
    const m = this.map, t = this.theme;
    const add = (id: string, data: FeatureCollection = EMPTY) => {
      if (!m.getSource(id)) m.addSource(id, { type: 'geojson', data });
    };
    for (const id of ['cm-halos', 'cm-territories', 'cm-routes', 'cm-trails', 'cm-places', 'cm-events']) add(id);

    m.addLayer({ id: 'cm-territory-fill', type: 'fill', source: 'cm-territories', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.14 } });
    m.addLayer({ id: 'cm-territory-line', type: 'line', source: 'cm-territories', paint: { 'line-color': ['get', 'color'], 'line-opacity': 0.5, 'line-width': 1.2, 'line-dasharray': [4, 3] } });
    m.addLayer({ id: 'cm-route', type: 'line', source: 'cm-routes', paint: { 'line-color': ['get', 'color'], 'line-opacity': 0.5, 'line-width': 1.6, 'line-dasharray': [3, 3] } });
    m.addLayer({ id: 'cm-halo-fill', type: 'fill', source: 'cm-halos', paint: { 'fill-color': t.ink, 'fill-opacity': ['case', ['get', 'focus'], 0.09, 0.04] } });
    m.addLayer({
      id: 'cm-halo-line', type: 'line', source: 'cm-halos',
      filter: ['==', ['get', 'certainty'], 'conjectural'],
      paint: { 'line-color': t.ink, 'line-opacity': ['case', ['get', 'focus'], 0.45, 0.18], 'line-width': 1, 'line-dasharray': [2, 3] },
    });

    // Minard-style band: the width is a real width on the ground, so it doubles
    // with every zoom level. MapLibre only accepts ['zoom'] as the input of a
    // top-level interpolate, so the clamp cannot wrap the interpolation; instead
    // each integer zoom gets its own clamped stop. Between two stops an
    // exponential-base-2 curve is exactly the ground-width curve, so this
    // reproduces `clamp(w0 * 2^zoom)` while staying a legal expression.
    const strengthStops: unknown[] = ['interpolate', ['exponential', 2], ['zoom']];
    for (let z = 0; z <= 22; z += 1) {
      strengthStops.push(z, ['max', 1.2, ['min', 64, ['*', ['get', 'w0'], 2 ** z]]]);
    }
    const strengthWidth: unknown = strengthStops;
    m.addLayer({ id: 'cm-trail-band', type: 'line', source: 'cm-trails', filter: ['all', ['==', ['get', 'dash'], 'none'], ['has', 'w0']],
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': strengthWidth as never } });
    m.addLayer({ id: 'cm-trail-solid', type: 'line', source: 'cm-trails', filter: ['all', ['==', ['get', 'dash'], 'none'], ['!', ['has', 'w0']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2.6 } });
    m.addLayer({ id: 'cm-trail-conjectural', type: 'line', source: 'cm-trails', filter: ['==', ['get', 'dash'], 'conjectural'],
      layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2.4, 'line-dasharray': [3, 2] } });
    m.addLayer({ id: 'cm-trail-sea', type: 'line', source: 'cm-trails', filter: ['==', ['get', 'dash'], 'sea'],
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2.2, 'line-dasharray': [0.6, 2.4] } });

    m.addLayer({
      id: 'cm-place-dot', type: 'circle', source: 'cm-places',
      paint: {
        'circle-radius': ['case', ['get', 'focus'], 4, 2.6],
        'circle-color': ['case', ['get', 'focus'], t.ink, t.inkSoft],
        'circle-stroke-width': 1.2, 'circle-stroke-color': t.land,
      },
    });
    m.addLayer({
      id: 'cm-event-past', type: 'circle', source: 'cm-events', filter: ['==', ['get', 'phase'], 'past'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'importance'], 1, 5, 5, 2.5],
        'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': t.eventPast,
        'circle-stroke-width': 1.4, 'circle-opacity': 0, 'circle-stroke-opacity': ['get', 'fade'],
      },
    });
    m.addLayer({
      id: 'cm-event-active', type: 'circle', source: 'cm-events', filter: ['==', ['get', 'phase'], 'active'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'importance'], 1, 8, 5, 4],
        'circle-color': t.halo, 'circle-opacity': 0.85,
        'circle-stroke-color': t.event, 'circle-stroke-width': 2,
      },
    });
    m.addLayer({
      id: 'cm-event-pulse', type: 'circle', source: 'cm-events', filter: ['==', ['get', 'phase'], 'active'],
      paint: { 'circle-radius': 10, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': t.event, 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.5 },
    });
  }

  /**
   * The grid is built once per campaign, over the campaign's own extent padded
   * out, and banded by layer zoom in the style. Nothing is regenerated while
   * the camera moves, so a flight never leaves a rectangle of stale grid behind.
   */
  private refreshGraticule(): void {
    if (!this.ready) return;
    const src = this.map.getSource('graticule') as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(graticuleFor(this.dataBounds()));
  }

  /** Bounding box of everything the campaign places on the map. */
  private dataBounds(): { west: number; south: number; east: number; north: number } {
    let w = 180, e = -180, s = 85, n = -85, seen = false;
    const add = (lng: number, lat: number): void => {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      seen = true;
      if (lng < w) w = lng; if (lng > e) e = lng;
      if (lat < s) s = lat; if (lat > n) n = lat;
    };
    const walk = (coords: unknown): void => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') { add(coords[0], coords[1]); return; }
      for (const c of coords) walk(c);
    };
    const c = this.campaign;
    if (c) {
      for (const place of c.places.values()) add(place.coord[0], place.coord[1]);
      for (const entity of c.entities) {
        if (entity.coord) add(entity.coord[0], entity.coord[1]);
        walk(entity.polygons);
        walk(entity.path);
        for (const wp of entity.track ?? []) { add(wp.coord[0], wp.coord[1]); walk(wp.leg); }
      }
      for (const ev of c.events) if (ev.coord) add(ev.coord[0], ev.coord[1]);
      const declared = c.meta.map?.bounds;
      if (declared) { add(declared[0], declared[1]); add(declared[2], declared[3]); }
    }
    if (!seen) {
      const b = this.map.getBounds();
      return { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
    }
    return { west: w, south: s, east: e, north: n };
  }

  /* ---------------------------------------------------------------- campaign (static) */
  setCampaign(campaign: NormalizedCampaign): void {
    this.campaign = campaign;
    this.maxStrength = 0;
    for (const e of campaign.entities) for (const w of e.track ?? []) if (w.strength) this.maxStrength = Math.max(this.maxStrength, w.strength);
    this.clearMarkers();
    this.lastTerritoryKey = '';
    const run = () => { this.buildStatic(); this.refreshGraticule(); };
    if (this.ready) run(); else this.map.once('load', run);
  }

  private buildStatic(): void {
    const c = this.campaign;
    if (!c) return;
    const places: Feature[] = [], halos: Feature[] = [], routes: Feature[] = [];
    for (const p of c.places.values()) {
      places.push({
        type: 'Feature', id: p.id,
        properties: { id: p.id, rank: p.raw.rank ?? 4, certainty: p.certainty, focus: false, name: pickText(p.raw.name, this.language, c.defaultLanguage) },
        geometry: { type: 'Point', coordinates: p.coord },
      });
      if (p.certainty !== 'exact') {
        halos.push({
          type: 'Feature', properties: { certainty: p.certainty, focus: false },
          geometry: { type: 'Polygon', coordinates: [circleRing(p.coord, p.radiusMeters)] },
        });
      }
      this.ensurePlaceLabel(p.id, p.coord, pickText(p.raw.name, this.language, c.defaultLanguage));
    }
    for (const e of c.entities) {
      if (!e.path) continue;
      routes.push({
        type: 'Feature', properties: { color: factionColor(c.factions.get(e.faction)?.color ?? '#7a6a58', this.theme) },
        geometry: { type: 'LineString', coordinates: e.path },
      });
    }
    this.setSource('cm-places', { type: 'FeatureCollection', features: places });
    this.setSource('cm-halos', { type: 'FeatureCollection', features: halos });
    this.setSource('cm-routes', { type: 'FeatureCollection', features: routes });
    this.applyLabelVisibility();
  }

  /* ---------------------------------------------------------------- frame (dynamic) */
  setFrame(frame: FrameState, focus: string[] = []): void {
    const c = this.campaign;
    if (!c || !this.ready) return;
    this.focus = new Set(focus);
    const t = frame.t;
    const byId = new Map(c.entities.map((e) => [e.id, e]));

    const trails: Feature[] = [];
    const territories: Feature[] = [];
    const liveUnits = new Set<string>(), liveForts = new Set<string>();

    for (const fe of frame.entities) {
      const ne = byId.get(fe.id);
      if (!ne) continue;
      const color = factionColor(c.factions.get(fe.faction)?.color ?? '#7a6a58', this.theme);
      if (ne.polygons) {
        for (const poly of ne.polygons) {
          territories.push({ type: 'Feature', properties: { color, id: fe.id }, geometry: { type: 'Polygon', coordinates: poly as Position[][] } });
        }
      }
      if (ne.track) {
        trails.push(...this.trailFeatures(ne, fe.strength ?? null, t, color));
        liveUnits.add(fe.id);
        this.updateUnitMarker(ne, fe, color);
      } else if (ne.coord) {
        liveForts.add(fe.id);
        this.updateFortMarker(ne, fe, color);
      }
    }
    for (const [id, m] of this.unitMarkers) if (!liveUnits.has(id)) { m.marker.remove(); this.unitMarkers.delete(id); }
    for (const [id, m] of this.fortMarkers) if (!liveForts.has(id)) { m.marker.remove(); this.fortMarkers.delete(id); }

    const territoryKey = territories.map((f) => `${f.properties!.id}:${f.properties!.color}`).join('|');
    if (territoryKey !== this.lastTerritoryKey) { this.setSource('cm-territories', { type: 'FeatureCollection', features: territories }); this.lastTerritoryKey = territoryKey; }
    this.setSource('cm-trails', { type: 'FeatureCollection', features: trails });

    const events: Feature[] = [];
    const liveEventLabels = new Set<string>();
    for (const ev of frame.events) {
      if (!ev.position) continue;
      const fade = ev.phase === 'active' ? 1 : Math.max(0.22, 0.6 - (ev.sinceEnd / (420 * DAY)) * 0.34);
      events.push({
        type: 'Feature', id: ev.id,
        properties: { id: ev.id, kind: ev.kind, phase: ev.phase, importance: ev.importance, fade, battle: BATTLE_KINDS.has(ev.kind) },
        geometry: { type: 'Point', coordinates: ev.position },
      });
      if (ev.phase === 'active') {
        liveEventLabels.add(ev.id);
        const raw = c.events.find((e) => e.id === ev.id)?.raw;
        if (raw) this.ensureEventLabel(ev.id, ev.position, pickText(raw.name, this.language, c.defaultLanguage));
      }
    }
    for (const [id, m] of this.eventLabels) if (!liveEventLabels.has(id)) { m.marker.remove(); this.eventLabels.delete(id); }
    this.setSource('cm-events', { type: 'FeatureCollection', features: events });

    this.applyLabelVisibility();
  }

  /** Legs travelled so far, with Minard-style width where the data asks for it. */
  private trailFeatures(ne: NormEntity, strength: number | null, t: Ticks, color: string): Feature[] {
    const mode = ne.style?.trail ?? 'full';
    if (mode === 'none') return [];
    const track = ne.track!;
    const segs: { coords: [number, number][]; dash: string; strength: number | null; lat: number }[] = [];
    for (let k = 1; k < track.length; k++) {
      const node = track[k], prev = track[k - 1];
      if (t < prev.depart) break;
      let coords = node.leg!;
      let partial = false;
      if (t < node.arrive) {
        const f = Math.min(1, Math.max(0, (t - prev.depart) / Math.max(1, node.arrive - prev.depart)));
        coords = alongPath(node.leg!, f).travelled;
        partial = true;
      }
      segs.push({
        coords,
        dash: node.mode === 'sea' ? 'sea' : node.certainty === 'conjectural' ? 'conjectural' : 'none',
        strength: partial ? strength ?? node.strength : node.strength ?? prev.strength,
        lat: node.coord[1],
      });
      if (partial) break;
    }
    const drawn = mode === 'leg' ? segs.slice(-1) : segs;
    const useWidth = ne.style?.widthBy === 'strength' && this.maxStrength > 0;
    return drawn.map((seg, i) => {
      const age = drawn.length > 1 ? 0.45 + 0.55 * ((i + 1) / drawn.length) : 1;
      const props: Record<string, unknown> = { color: withAlpha(color, age), dash: seg.dash };
      if (useWidth && seg.strength) {
        const meters = this.bandMeters * (seg.strength / this.maxStrength);
        props.w0 = meters / (156543.03 * Math.cos((seg.lat * Math.PI) / 180));
      }
      return { type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: seg.coords } } as Feature;
    });
  }

  /* ---------------------------------------------------------------- markers */
  private updateUnitMarker(ne: NormEntity, fe: FrameState['entities'][number], color: string): void {
    if (!fe.position) return;
    let entry = this.unitMarkers.get(ne.id);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'cm-unit';
      el.innerHTML = '<span class="cm-unit-icon"></span><span class="cm-unit-text"><span class="cm-unit-name"></span><span class="cm-unit-strength"></span></span>';
      // Anchored on the icon, not the row: hiding the name must not move the dot.
      entry = { marker: new Marker({ element: el, anchor: 'left', offset: [-6.5, 0] }).setLngLat(fe.position).addTo(this.map), el };
      this.unitMarkers.set(ne.id, entry);
    }
    entry.marker.setLngLat(fe.position);
    const icon = entry.el.querySelector('.cm-unit-icon') as HTMLElement;
    const hollow = ['captive', 'exiled', 'surrendered', 'disbanded', 'dead'].includes(fe.status);
    icon.style.setProperty('--cm-colour', color);
    icon.className = `cm-unit-icon${hollow ? ' is-hollow' : ''}${fe.moving ? ' is-moving' : ''}`;
    icon.style.setProperty('--cm-rotate', `${(fe.bearing ?? 0) - this.map.getBearing()}deg`);
    const raw = ne.raw;
    const wpLabel = fe.waypoint != null ? raw.track?.[fe.waypoint]?.label : null;
    const lang = this.language, fallback = this.campaign?.defaultLanguage;
    (entry.el.querySelector('.cm-unit-name') as HTMLElement).textContent = wpLabel ? pickText(wpLabel, lang, fallback) : pickText(raw.name, lang, fallback);
    const strengthEl = entry.el.querySelector('.cm-unit-strength') as HTMLElement;
    strengthEl.textContent = fe.strength ? new Intl.NumberFormat(lang).format(Math.round(fe.strength)) : '';
    entry.el.classList.toggle('is-focus', this.focus.has(ne.id));
  }

  private updateFortMarker(ne: NormEntity, fe: FrameState['entities'][number], color: string): void {
    if (!ne.coord) return;
    let entry = this.fortMarkers.get(ne.id);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'cm-fort';
      el.innerHTML = `<svg viewBox="-12 -12 24 24" width="22" height="22" aria-hidden="true"><polygon points="${starPoints(9)}"/></svg><span class="cm-fort-label"></span>`;
      entry = { marker: new Marker({ element: el, anchor: 'left', offset: [-11, 0] }).setLngLat(ne.coord).addTo(this.map), el };
      this.fortMarkers.set(ne.id, entry);
    }
    entry.el.style.setProperty('--cm-colour', color);
    entry.el.classList.toggle('is-besieged', fe.status === 'besieged');
    entry.el.classList.toggle('is-lost', fe.status === 'destroyed' || fe.status === 'abandoned');
    entry.el.classList.toggle('is-focus', this.focus.has(ne.id));
    (entry.el.querySelector('.cm-fort-label') as HTMLElement).textContent = pickText(ne.raw.name, this.language, this.campaign?.defaultLanguage);
  }

  private ensurePlaceLabel(id: string, coord: [number, number], text: string): void {
    let entry = this.placeLabels.get(id);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'cm-place-label';
      entry = { marker: new Marker({ element: el, anchor: 'left', offset: [7, 0] }).setLngLat(coord).addTo(this.map), el };
      this.placeLabels.set(id, entry);
    }
    entry.el.textContent = text;
  }
  private ensureEventLabel(id: string, coord: [number, number], text: string): void {
    let entry = this.eventLabels.get(id);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'cm-event-label';
      entry = { marker: new Marker({ element: el, anchor: 'bottom', offset: [0, -14] }).setLngLat(coord).addTo(this.map), el };
      this.eventLabels.set(id, entry);
    }
    entry.el.textContent = text;
  }

  /** Label density by zoom and rank; focused items always show (contract §7.4). */
  private applyLabelVisibility(): void {
    const c = this.campaign;
    if (!c) return;
    const z = this.map.getZoom();
    for (const [id, entry] of this.placeLabels) {
      const rank = c.places.get(id)?.raw.rank ?? 4;
      const show = this.focus.has(id) || (rank <= 1 ? z >= 3.6 : rank === 2 ? z >= 7.2 : rank === 3 ? z >= 8.6 : z >= 10.2);
      entry.el.classList.toggle('is-hidden', !show);
      entry.el.classList.toggle('is-focus', this.focus.has(id));
    }
    for (const [id, entry] of this.fortMarkers) entry.el.classList.toggle('show-label', this.focus.has(id) || z >= 9.5);
    this.scheduleDeclutter();
  }

  /**
   * Greedy label declutter. Labels are DOM, not glyphs, so MapLibre's own
   * collision engine never sees them; without this, a dense chapter stacks
   * four names on one town. Text is dropped, never symbols: a unit keeps its
   * counter and a fort its star even when the name goes.
   */
  private scheduleDeclutter(): void {
    if (this.declutterQueued) return;
    this.declutterQueued = true;
    const run = () => { this.declutterQueued = false; this.declutter(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else run();
  }

  private declutter(): void {
    const c = this.campaign;
    if (!c) return;
    type Cand = { el: HTMLElement; pri: number; owner: Element | null };
    const cands: Cand[] = [];
    // Priority is by kind first — the moving protagonist outranks a fort, a fort
    // outranks a town — and being in the chapter's focus is only a tie-break
    // inside a kind. A focus bonus large enough to cross kinds would silence the
    // unit the chapter is actually about in favour of the scenery around it.
    const FOCUS_BONUS = 5;
    const clear = (el: Element | null): void => { if (el instanceof HTMLElement) el.classList.remove('is-crowded'); };
    const push = (el: Element | null, pri: number, focused: boolean, owner: Element | null): void => {
      if (!(el instanceof HTMLElement)) return;
      el.classList.remove('is-crowded');
      cands.push({ el, pri: focused ? pri - FOCUS_BONUS : pri, owner });
    };
    for (const [id, e] of this.unitMarkers) push(e.el.querySelector('.cm-unit-text'), 10, this.focus.has(id), e.el);
    for (const [id, e] of this.eventLabels) push(e.el, 20, this.focus.has(id), e.el);
    for (const [id, e] of this.fortMarkers) {
      if (!e.el.classList.contains('show-label')) { clear(e.el.querySelector('.cm-fort-label')); continue; }
      push(e.el.querySelector('.cm-fort-label'), 30, this.focus.has(id), e.el);
    }
    for (const [id, e] of this.placeLabels) {
      if (e.el.classList.contains('is-hidden')) { clear(e.el); continue; }
      push(e.el, 40 + (c.places.get(id)?.raw.rank ?? 4), this.focus.has(id), e.el);
    }
    if (cands.length === 0) return;
    // One read pass after the one write pass above, so the browser lays out once.
    const boxes = cands.map((cand) => cand.el.getBoundingClientRect());

    // Symbols and page chrome are reserved first: a name gives way to them, never
    // the reverse. A marker's own symbol does not block its own label.
    const blockers: Blocker[] = [];
    for (const [, e] of this.unitMarkers) pushBox(blockers, e.el.querySelector('.cm-unit-icon'), e.el, true);
    for (const [, e] of this.fortMarkers) pushBox(blockers, e.el.querySelector('svg'), e.el, true);
    for (const el of Array.from(document.querySelectorAll(this.avoidSelector))) pushBox(blockers, el, null, false);

    const view = this.map.getContainer().getBoundingClientRect();
    const order = cands.map((_, i) => i).sort((a, b) => cands[a].pri - cands[b].pri || boxes[a].top - boxes[b].top);
    const pad = 2;
    const hits = (r: DOMRect, k: Box) => r.left < k.right + pad && r.right + pad > k.left && r.top < k.bottom + pad && r.bottom + pad > k.top;
    for (const i of order) {
      const r = boxes[i];
      if (r.width === 0 || r.height === 0) continue;
      // A label whose text runs off the map reads as a fragment; drop it whole.
      const outside = r.left < view.left + 2 || r.right > view.right - 2 || r.top < view.top + 2 || r.bottom > view.bottom - 2;
      // A symbol only displaces a place name, the cheapest label on the map;
      // a unit's own name is worth more than the star it happens to cross.
      const minor = cands[i].pri >= 40;
      const clash = outside || blockers.some((b) => b.owner !== cands[i].owner && (minor || !b.symbol) && hits(r, b.box));
      if (clash) cands[i].el.classList.add('is-crowded');
      else blockers.push({ box: r, owner: cands[i].owner, symbol: false });
    }
  }
  private declutterQueued = false;

  /* ---------------------------------------------------------------- misc */
  setTheme(theme: ChronoTheme): void {
    this.theme = theme;
    if (!this.ready) return;
    // The basemap style is rebuilt by the app (setStyle); campaign layers are re-added after 'styledata'.
  }
  setLanguage(lang: string): void {
    this.language = lang;
    if (this.campaign) this.buildStatic();
  }
  private setSource(id: string, data: FeatureCollection): void {
    const src = this.map.getSource(id) as GeoJSONSource | undefined;
    if (src) src.setData(data);
  }
  private clearMarkers(): void {
    for (const map of [this.unitMarkers, this.fortMarkers, this.placeLabels, this.eventLabels]) {
      for (const entry of map.values()) entry.marker.remove();
      map.clear();
    }
  }
  destroy(): void { this.clearMarkers(); }
}

/** Uncertainty halo as a real circle on the ground, so it scales with the map. */
function circleRing([lng, lat]: [number, number], radiusMeters: number, steps = 48): Position[] {
  const ring: Position[] = [];
  const dLat = (radiusMeters / 111320) ;
  const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180) || 1);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat]);
  }
  return ring;
}
const starPoints = (r: number): string =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.52 : r;
    return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`;
  }).join(' ');
