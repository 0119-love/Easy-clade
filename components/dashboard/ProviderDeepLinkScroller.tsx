"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Reads "?provider=" and scrolls that provider's card into view -- split out
 * of the run console page itself because useSearchParams() forces the
 * component that calls it into a <Suspense> boundary at build time (Next.js
 * would otherwise fail a static/prerendered build), and the run console page
 * as a whole shouldn't have to pay for that.
 */
export function ProviderDeepLinkScroller() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    if (!provider) return;
    document.getElementById(`model-card-${provider}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "center",
    });
  }, [provider]);

  return null;
}
