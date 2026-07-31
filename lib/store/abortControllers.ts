import type { ProviderId } from "../config/types";

// Plain module-level map, deliberately outside Zustand -- AbortControllers
// aren't serializable and don't belong in reactive state.
const controllers = new Map<ProviderId, AbortController>();

export function createRunController(provider: ProviderId): AbortController {
  controllers.get(provider)?.abort();
  const controller = new AbortController();
  controllers.set(provider, controller);
  return controller;
}

export function abortRun(provider: ProviderId): void {
  controllers.get(provider)?.abort();
  controllers.delete(provider);
}

export function clearRunController(provider: ProviderId): void {
  controllers.delete(provider);
}
