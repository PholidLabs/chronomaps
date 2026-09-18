/**
 * Frame resolution (contract §4–§6): what is on the map at tick t.
 * This is the test oracle the Rust/WASM core must reproduce (test-vectors/*.frames.json).
 */
import { haversine } from './campaign.js';
import { ticksToIso } from './time.js';
import type { FrameEntity, FrameEvent, FrameState, NormEntity, NormState, NormalizedCampaign, NormChapter, Ticks } from './types.js';

const toRad = Math.PI / 180;

export function initialBearing(a: [number, number], b: [number, number]): number {
  const y = Math.sin((b[0] - a[0]) * toRad) * Math.cos(b[1] * toRad);
  const x = Math.cos(a[1] * toRad) * Math.sin(b[1] * toRad) - Math.sin(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.cos((b[0] - a[0]) * toRad);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

/** Point at fraction f of a polyline's haversine length; linear lng/lat within a segment. */
export function alongPath(path: [number, number][], f: number): { position: [number, number]; segment: number; travelled: [number, number][] } {
  if (path.length === 1 || f <= 0) return { position: path[0], segment: 0, travelled: [path[0]] };
  const lengths = path.slice(1).map((c, i) => haversine(path[i], c));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total === 0 || f >= 1) return { position: path[path.length - 1], segment: path.length - 2, travelled: path.slice() };
  let target = f * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const local = lengths[i] === 0 ? 0 : Math.min(1, target / lengths[i]);
      const a = path[i], b = path[i + 1];
      const position: [number, number] = [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
      return { position, segment: i, travelled: [...path.slice(0, i + 1), position] };
    }
    target -= lengths[i];
  }
  return { position: path[path.length - 1], segment: path.length - 2, travelled: path.slice() };
}

/** Status/owner/strength at t: the applicable state with the latest start wins. */
export function stateAt(states: NormState[], t: Ticks): NormState | null {
  let best: NormState | null = null;
  for (const s of states) {
    if (s.start > t) continue;
    if (s.end !== null && t >= s.end) continue;
    if (!best || s.start >= best.start) best = s;
  }
  return best;
}

function strengthAt(track: NonNullable<NormEntity['track']>, t: Ticks): number | null {
  const knots: [number, number][] = [];
  for (const w of track) if (w.strength !== null && w.strength !== undefined) knots.push([w.arrive, w.strength], [w.depart, w.strength]);
  if (!knots.length) return null;
  if (t <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [t1, v1] = knots[i];
    if (t <= t1) {
      const [t0, v0] = knots[i - 1];
      return t1 === t0 ? v1 : Math.round(v0 + ((v1 - v0) * (t - t0)) / (t1 - t0));
    }
  }
  return knots[knots.length - 1][1];
}

interface UnitPose {
  position: [number, number]; bearing: number | null; moving: boolean;
  waypoint: number | null; leg: number | null; legProgress: number | null;
  mode?: string; certainty: NormEntity['certainty']; trail: [number, number][];
}
function unitAt(ne: NormEntity, t: Ticks): UnitPose {
  const tr = ne.track!;
  const trail: [number, number][] = [tr[0].coord];
  if (t < tr[0].arrive) return { position: tr[0].coord, bearing: null, moving: false, waypoint: tr[0].index, leg: null, legProgress: null, certainty: tr[0].certainty, trail };
  for (let i = 0; i < tr.length; i++) {
    const w = tr[i];
    if (t >= w.arrive && t < w.depart) {
      const lastLeg = w.leg;
      return {
        position: w.coord, bearing: lastLeg ? initialBearing(lastLeg[lastLeg.length - 2], lastLeg[lastLeg.length - 1]) : null,
        moving: false, waypoint: w.index, leg: null, legProgress: null, certainty: w.certainty, trail: [...trail],
      };
    }
    const next = tr[i + 1];
    if (!next) break;
    if (t >= w.depart && t < next.arrive) {
      const f = (t - w.depart) / (next.arrive - w.depart);
      const { position, segment, travelled } = alongPath(next.leg!, f);
      return {
        position, bearing: initialBearing(next.leg![segment], next.leg![segment + 1]), moving: true,
        waypoint: null, leg: next.index, legProgress: f, mode: next.mode, certainty: next.certainty,
        trail: [...trail, ...travelled.slice(1)],
      };
    }
    trail.push(...next.leg!.slice(1));
  }
  const last = tr[tr.length - 1], lastLeg = last.leg;
  return {
    position: last.coord, bearing: lastLeg ? initialBearing(lastLeg[lastLeg.length - 2], lastLeg[lastLeg.length - 1]) : null,
    moving: false, waypoint: last.index, leg: null, legProgress: null, certainty: last.certainty, trail,
  };
}

const inBbox = (coord: [number, number] | null | undefined, bbox: [number, number, number, number] | null): boolean => {
  if (!bbox || !coord) return true;
  const [w, s, e, n] = bbox;
  return coord[0] >= w && coord[0] <= e && coord[1] >= s && coord[1] <= n;
};

export interface ResolveOptions { bbox?: [number, number, number, number] | null; includeTrail?: boolean }

export function resolveFrame(campaign: NormalizedCampaign, t: Ticks, opts: ResolveOptions = {}): FrameState {
  const { bbox = null, includeTrail = true } = opts;
  const frame: FrameState = { t, iso: ticksToIso(t), entities: [], events: [] };

  for (const ne of campaign.entities) {
    if (t < ne.start || t >= ne.end) continue;
    const st = stateAt(ne.states, t);
    const base: FrameEntity = { id: ne.id, kind: ne.kind, faction: st?.faction ?? ne.faction, status: st?.status ?? 'active' };
    if (ne.track) {
      const u = unitAt(ne, t);
      if (!inBbox(u.position, bbox) && !u.trail.some((c) => inBbox(c, bbox))) continue;
      const strength = st?.strength ?? strengthAt(ne.track, t);
      frame.entities.push({
        ...base, position: u.position, bearing: u.bearing, moving: u.moving, waypoint: u.waypoint,
        leg: u.leg, legProgress: u.legProgress, strength, certainty: u.certainty ?? ne.certainty,
        ...(includeTrail ? { trail: u.trail } : { trailLength: u.trail.length }),
      });
    } else if (ne.coord) {
      if (!inBbox(ne.coord, bbox)) continue;
      frame.entities.push({ ...base, position: ne.coord, strength: st?.strength ?? null });
    } else {
      frame.entities.push(base); // territories and routes: static geometry, looked up by id
    }
  }

  for (const ev of campaign.events) {
    if (t < ev.start) continue;
    if (ev.coord && !inBbox(ev.coord, bbox)) continue;
    const active = t < ev.end;
    frame.events.push({
      id: ev.id, kind: ev.kind, phase: active ? 'active' : 'past',
      progress: active ? (t - ev.start) / (ev.end - ev.start) : 1,
      sinceEnd: active ? 0 : t - ev.end,
      position: ev.coord, importance: ev.importance,
    } satisfies FrameEvent);
  }
  return frame;
}

/** Tick for scroll progress p (0..1) through a chapter. The window is [start, end). */
export function chapterTime(chapter: NormChapter, p: number): Ticks {
  const clamped = Math.min(1, Math.max(0, p));
  return chapter.start + Math.floor(clamped * (chapter.end - chapter.start - 1));
}

/** The chapter a tick belongs to in story mode (last chapter whose window started). */
export function chapterAt(campaign: NormalizedCampaign, t: Ticks): NormChapter | null {
  let hit: NormChapter | null = null;
  for (const ch of campaign.chapters) if (ch.start <= t) hit = ch;
  return hit;
}
