"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface BackgroundsResponse {
  images: string[];
}

async function fetchBackgrounds(): Promise<BackgroundsResponse> {
  const res = await fetch("/api/backgrounds");
  if (!res.ok) throw new Error("배경 이미지를 불러오지 못했습니다.");
  return res.json();
}

const INTERVAL_OPTIONS = [
  { label: "1분", ms: 60_000 },
  { label: "5분", ms: 5 * 60_000 },
  { label: "30분", ms: 30 * 60_000 },
  { label: "1시간", ms: 60 * 60_000 },
] as const;

const STORAGE_KEY = "ambient-scenery-interval-ms";
const DEFAULT_INTERVAL_MS: number = INTERVAL_OPTIONS[1].ms;

// Full-bleed nature photo backdrop, cycling on a user-picked interval.
// Sits behind every panel -- since the Material redesign, the sidebar/topbar/
// cards are opaque tonal surfaces (not the old translucent glass), so this
// now mostly only shows through in the thin gaps between them, same as a
// wallpaper behind opaque Material widgets rather than a full frosted mood.
export function AmbientScenery() {
  const { data } = useQuery({
    queryKey: ["backgrounds"],
    queryFn: fetchBackgrounds,
    staleTime: Infinity,
  });
  const images = data?.images ?? [];

  const [index, setIndex] = useState(0);
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);

  useEffect(() => {
    // Deliberate effect+setState, not a derived-state anti-pattern: localStorage
    // doesn't exist during SSR, so the default renders first (matching the
    // server-rendered markup) and only swaps to the saved interval post-mount.
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (INTERVAL_OPTIONS.some((opt) => opt.ms === stored)) setIntervalMs(stored);
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  function selectInterval(ms: number) {
    setIntervalMs(ms);
    localStorage.setItem(STORAGE_KEY, String(ms));
  }

  if (images.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 -z-20 overflow-hidden" aria-hidden="true">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            preload={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover transition-opacity ease-in-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: "2000ms" }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/55 to-background/75" />
      </div>

      {images.length > 1 && (
        <div className="glass-chip pointer-events-auto fixed bottom-5 right-5 z-40 flex items-center gap-0.5 rounded-full p-1 text-xs text-text-secondary">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.ms}
              type="button"
              onClick={() => selectInterval(opt.ms)}
              aria-pressed={intervalMs === opt.ms}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors duration-150",
                intervalMs === opt.ms
                  ? "bg-white/[0.12] text-foreground"
                  : "hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
