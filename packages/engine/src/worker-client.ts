/** Main-thread client for the worker protocol. Use when a campaign is big enough to matter. */
import type { CampaignFile, Diagnostic, FrameState, Ticks } from './types.js';
import type { WorkerResponse } from './worker.js';

export class ChronoMapWorkerClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, (value: any) => void>();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.addEventListener('message', (ev: MessageEvent<WorkerResponse>) => {
      const resolve = this.pending.get((ev.data as { id: number }).id);
      if (resolve) { this.pending.delete((ev.data as { id: number }).id); resolve(ev.data); }
    });
  }
  private send<T>(msg: Record<string, unknown>): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve) => { this.pending.set(id, resolve); this.worker.postMessage({ ...msg, id }); });
  }
  load(campaign: CampaignFile): Promise<{ ok: boolean; diagnostics: Diagnostic[] }> {
    return this.send({ type: 'load', campaign });
  }
  query(t: Ticks, bbox?: [number, number, number, number] | null): Promise<{ frame: FrameState }> {
    return this.send({ type: 'query', t, bbox });
  }
  dispose(): void { this.worker.terminate(); this.pending.clear(); }
}
