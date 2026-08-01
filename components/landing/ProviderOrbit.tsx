"use client";

import { useState } from "react";
import { ProviderOrbitBadge } from "./ProviderOrbitBadge";
import { AiCore } from "./AiCore";
import type { ProviderId } from "@/lib/config/types";

interface RingConfig {
  radius: number;
  durationSeconds: number;
  providers: ProviderId[];
}

// 6 real providers this app actually supports, split 2-per-ring across 3
// rings -- the reference spec's other 3 (OpenRouter/Qwen/Mistral) have no
// connection support here, so showing them would just be decoration
// pretending to be a real feature. Durations stay within the 40-60s spec.
const RINGS: RingConfig[] = [
  { radius: 110, durationSeconds: 42, providers: ["anthropic", "openai"] },
  { radius: 170, durationSeconds: 50, providers: ["google", "xai"] },
  { radius: 230, durationSeconds: 58, providers: ["perplexity", "deepseek"] },
];

export function ProviderOrbit() {
  const [hovered, setHovered] = useState<ProviderId | null>(null);

  return (
    <div className="relative flex size-[460px] max-w-full shrink-0 items-center justify-center">
      {RINGS.map((ring) => (
        <div
          key={ring.radius}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border"
          style={{ width: ring.radius * 2, height: ring.radius * 2 }}
        />
      ))}

      <AiCore />

      {RINGS.map((ring) =>
        ring.providers.map((provider, i) => (
          <ProviderOrbitBadge
            key={provider}
            provider={provider}
            radius={ring.radius}
            durationSeconds={ring.durationSeconds}
            // Two badges per ring start 180deg apart (half the ring's period, as a negative delay).
            delaySeconds={i === 0 ? 0 : -(ring.durationSeconds / 2)}
            hovered={hovered === provider}
            onHoverChange={setHovered}
          />
        )),
      )}
    </div>
  );
}
