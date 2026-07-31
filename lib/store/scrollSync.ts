/**
 * Cross-ResponseColumn scroll sync. Deliberately outside Zustand -- DOM refs
 * aren't serializable/reactive state, same rationale as abortControllers.ts.
 * `syncing` guards against feedback loops (broadcasting a scroll that itself
 * triggers each receiver's onScroll handler).
 */
const registry = new Map<string, HTMLDivElement>();
let syncing = false;

export function registerScrollable(id: string, el: HTMLDivElement | null): void {
  if (el) registry.set(id, el);
  else registry.delete(id);
}

export function broadcastScroll(sourceId: string, ratio: number): void {
  if (syncing) return;
  syncing = true;
  for (const [id, el] of registry) {
    if (id === sourceId) continue;
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = maxScroll > 0 ? ratio * maxScroll : 0;
  }
  syncing = false;
}
