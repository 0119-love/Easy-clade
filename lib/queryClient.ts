import { QueryClient } from "@tanstack/react-query";

// Module-level singleton so non-component code (the streaming client) can
// invalidate queries directly -- e.g. refreshing Live Activity the moment a
// run finishes, rather than waiting on the polling interval alone.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Most dashboard pages fetch by hand (no server-side cache), so this is
      // the only thing standing between "click a tab" and a fresh network
      // round-trip. 60s means switching back to a tab you were on a minute
      // ago is instant; anything that genuinely needs to feel live (today's
      // totals, provider key status) already overrides this with its own
      // refetchInterval.
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
