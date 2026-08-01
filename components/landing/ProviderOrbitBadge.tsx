"use client";

import type { CSSProperties } from "react";
import { ProviderMark } from "@/components/ui/provider-mark";
import { ProviderHoverCard } from "./ProviderHoverCard";
import type { ProviderId } from "@/lib/config/types";
import { cn } from "@/lib/utils";

interface ProviderOrbitBadgeProps {
  provider: ProviderId;
  radius: number;
  durationSeconds: number;
  delaySeconds: number;
  hovered: boolean;
  onHoverChange: (provider: ProviderId | null) => void;
}

/**
 * A single orbiting badge. The outer 0-size div carries the CSS orbit
 * animation (its own independent instance, not a shared rotating parent) --
 * that's what lets hovering ONE badge pause only that one via plain CSS
 * (.orbit-badge:hover in globals.css) while its siblings keep moving.
 */
export function ProviderOrbitBadge({
  provider,
  radius,
  durationSeconds,
  delaySeconds,
  hovered,
  onHoverChange,
}: ProviderOrbitBadgeProps) {
  const style = {
    "--orbit-radius": `${radius}px`,
    "--orbit-duration": `${durationSeconds}s`,
    "--orbit-delay": `${delaySeconds}s`,
  } as CSSProperties;

  return (
    <div className="orbit-badge absolute left-1/2 top-1/2 size-0" style={style}>
      <div
        className="relative -translate-x-1/2 -translate-y-1/2"
        onMouseEnter={() => onHoverChange(provider)}
        onMouseLeave={() => onHoverChange(null)}
      >
        <div
          className={cn(
            "glass flex size-12 items-center justify-center rounded-full transition-shadow duration-150",
            hovered && "shadow-[var(--elevation-2)]",
          )}
        >
          <ProviderMark provider={provider} size="sm" />
        </div>
        {hovered && (
          <div className="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2">
            <ProviderHoverCard provider={provider} />
          </div>
        )}
      </div>
    </div>
  );
}
