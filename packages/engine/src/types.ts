/** ChronoMap campaign contract v1 — TypeScript shapes. See docs/DATA-CONTRACT.md. */

export type Ticks = number; // seconds since 1970-01-01T00:00:00, proleptic Gregorian, may be negative
export type LocalizedText = string | Record<string, string>;
export type Coord = [number, number] | [number, number, number];
export type Location = string | Coord;
export type Certainty = 'exact' | 'approximate' | 'conjectural';
export type Quantity = number | { min: number; max: number; note?: LocalizedText };

export interface Faction {
  id: string; name: LocalizedText; shortName?: LocalizedText; color: string;
  description?: LocalizedText; sources?: string[]; notes?: LocalizedText;
}
export interface Part { id: string; title: LocalizedText; description?: LocalizedText }
export interface Place {
  id: string; name: LocalizedText; modernName?: LocalizedText; kind?: string;
  coordinates: Coord; certainty: Certainty; radiusMeters?: number; rank?: number;
  description?: LocalizedText; sources?: string[]; media?: string[]; notes?: LocalizedText;
}
export interface StateEntry {
  when: string; status?: string; faction?: string; strength?: Quantity;
  label?: LocalizedText; sources?: string[]; notes?: LocalizedText;
}
export interface Waypoint {
  when: string; at: Location; via?: Coord[]; mode?: 'land' | 'river' | 'sea';
  strength?: Quantity; certainty?: Certainty; label?: LocalizedText; sources?: string[]; notes?: LocalizedText;
}
export interface Style {
  color?: string; width?: number; dash?: number[]; icon?: string; opacity?: number;
  trail?: 'full' | 'leg' | 'none'; widthBy?: 'strength';
}
export interface PolygonGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: Coord[][] | Coord[][][];
}
export interface Entity {
  id: string; kind: string; name: LocalizedText; faction: string; when?: string;
  description?: LocalizedText; commanders?: LocalizedText[];
  at?: Location; track?: Waypoint[]; geometry?: PolygonGeometry; path?: Location[];
  states?: StateEntry[]; certainty?: Certainty; style?: Style;
  sources?: string[]; media?: string[]; notes?: LocalizedText; tags?: string[];
}
export interface Participant {
  faction: string; role?: string; commanders?: LocalizedText[]; strength?: Quantity; losses?: Quantity;
}
export interface CampaignEvent {
  id: string; kind: string; name: LocalizedText; when: string; at?: Location; certainty?: Certainty;
  participants?: Participant[]; outcome?: { victor?: string; summary?: LocalizedText };
  summary?: LocalizedText; importance?: number; sources?: string[]; media?: string[];
  notes?: LocalizedText; tags?: string[];
}
export interface Camera {
  center: Coord; zoom: number; pitch?: number; bearing?: number;
  durationMs?: number; transition?: 'fly' | 'ease' | 'jump';
}
export interface Chapter {
  id: string; part?: string; title: LocalizedText; when: string; dateLabel?: LocalizedText;
  body: LocalizedText; camera?: Camera; focus?: string[]; media?: string[]; sources?: string[]; notes?: LocalizedText;
}
export interface Source { id: string; type: string; citation: string; url?: string; accessed?: string; notes?: LocalizedText }
export interface Media {
  id: string; type: 'image'; url: string; thumbnailUrl?: string; alt: LocalizedText; caption?: LocalizedText;
  creator?: string; date?: string; license: string; holder?: string; sourceUrl?: string; notes?: LocalizedText;
}
export interface CampaignMeta {
  id: string; version?: string; title: LocalizedText; subtitle?: LocalizedText; description: LocalizedText;
  contentWarning?: LocalizedText; languages: string[]; defaultLanguage: string; license?: string;
  authors?: { name: string; url?: string }[]; updated?: string;
  timeline: { extent: string; focus?: string };
  map: {
    center: Coord; zoom: number; pitch?: number; bearing?: number;
    bounds?: [number, number, number, number]; terrain?: { exaggeration?: number }; theme?: string;
  };
}
export interface CampaignFile {
  chronomap: string; meta: CampaignMeta; factions: Faction[]; parts?: Part[]; places?: Place[];
  entities?: Entity[]; events?: CampaignEvent[]; chapters: Chapter[]; sources?: Source[]; media?: Media[];
  [key: string]: unknown; // x- extensions
}

/* ---- diagnostics ---- */
export type DiagnosticLevel = 'error' | 'warning' | 'info';
export interface Diagnostic { level: DiagnosticLevel; code: string; path: string; message: string }

/* ---- normalized model (what the engine works on) ---- */
export interface Span { start: Ticks; end: Ticks }
export interface NormPlace { id: string; coord: [number, number]; certainty: Certainty; radiusMeters: number; raw: Place }
export interface NormState { index: number; start: Ticks; end: Ticks | null; status: string | null; faction: string | null; strength: number | null }
export interface NormWaypoint {
  index: number; arrive: Ticks; depart: Ticks; end: Ticks; coord: [number, number];
  mode: 'land' | 'river' | 'sea'; certainty: Certainty | null; strength: number | null;
  leg?: [number, number][]; legLength?: number;
}
export interface NormEntity {
  id: string; kind: string; faction: string; certainty: Certainty | null; style: Style;
  start: Ticks; end: Ticks; states: NormState[];
  track?: NormWaypoint[]; coord?: [number, number] | null; polygons?: Coord[][][]; path?: [number, number][];
  raw: Entity;
}
export interface NormEvent {
  id: string; kind: string; start: Ticks; end: Ticks; coord: [number, number] | null;
  certainty: Certainty | null; importance: number; raw: CampaignEvent;
}
export interface NormChapter {
  id: string; index: number; start: Ticks; end: Ticks; camera: Camera | null; focus: string[]; raw: Chapter;
}
export interface NormalizedCampaign {
  raw: CampaignFile; meta: CampaignMeta; extent: Span; focus: Span;
  languages: string[]; defaultLanguage: string;
  factions: Map<string, Faction>; places: Map<string, NormPlace>;
  entities: NormEntity[]; events: NormEvent[]; chapters: NormChapter[];
}

/* ---- frame ---- */
export interface FrameEntity {
  id: string; kind: string; faction: string; status: string;
  position?: [number, number]; bearing?: number | null; moving?: boolean;
  waypoint?: number | null; leg?: number | null; legProgress?: number | null;
  strength?: number | null; certainty?: Certainty | null;
  trail?: [number, number][]; trailLength?: number;
}
export interface FrameEvent {
  id: string; kind: string; phase: 'active' | 'past'; progress: number; sinceEnd: number;
  position: [number, number] | null; importance: number;
}
export interface FrameState { t: Ticks; iso: string; entities: FrameEntity[]; events: FrameEvent[] }
export interface LoadResult { campaign: NormalizedCampaign | null; diagnostics: Diagnostic[] }
