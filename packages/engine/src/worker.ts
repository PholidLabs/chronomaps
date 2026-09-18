/**
 * Worker entry point (contract §7.1). The Rust/WASM core replaces the body of `load`/`query`
 * without changing this protocol: static payload once at load, small frames per query.
 */
import { loadCampaign } from './campaign.js';
import { resolveFrame } from './resolve.js';
import type { CampaignFile, Diagnostic, FrameState, NormalizedCampaign, Ticks } from './types.js';

export type WorkerRequest =
  | { type: 'load'; id: number; campaign: CampaignFile }
  | { type: 'query'; id: number; t: Ticks; bbox?: [number, number, number, number] | null; includeTrail?: boolean };
export type WorkerResponse =
  | { type: 'loaded'; id: number; ok: boolean; diagnostics: Diagnostic[]; summary?: { chapters: number; entities: number; events: number; places: number } }
  | { type: 'frame'; id: number; frame: FrameState };

let campaign: NormalizedCampaign | null = null;

export function handleRequest(msg: WorkerRequest): WorkerResponse {
  if (msg.type === 'load') {
    const { campaign: c, diagnostics } = loadCampaign(msg.campaign);
    campaign = c;
    return {
      type: 'loaded', id: msg.id, ok: !!c, diagnostics,
      summary: c ? { chapters: c.chapters.length, entities: c.entities.length, events: c.events.length, places: c.places.size } : undefined,
    };
  }
  if (!campaign) throw new Error('query before load');
  return { type: 'frame', id: msg.id, frame: resolveFrame(campaign, msg.t, { bbox: msg.bbox ?? null, includeTrail: msg.includeTrail ?? false }) };
}

// Runs only inside a real worker; importing this module elsewhere is harmless.
if (typeof self !== 'undefined' && typeof (self as unknown as { postMessage?: unknown }).postMessage === 'function' && typeof document === 'undefined') {
  self.addEventListener('message', (ev: MessageEvent<WorkerRequest>) => {
    try {
      (self as unknown as Worker).postMessage(handleRequest(ev.data));
    } catch (e) {
      (self as unknown as Worker).postMessage({ type: 'error', id: (ev.data as { id: number }).id, message: String((e as Error).message) });
    }
  });
}
