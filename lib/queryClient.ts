import { QueryClient } from "@tanstack/react-query";

// Module-level singleton so non-component code (the streaming client) can
// invalidate queries directly -- e.g. refreshing Live Activity the moment a
// run finishes, rather than waiting on the polling interval alone.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});
