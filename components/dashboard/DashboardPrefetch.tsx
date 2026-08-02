"use client";

import { useQuery } from "@tanstack/react-query";
import { useSystemStatus } from "@/lib/hooks/useSystemStatus";
import type { ModelInfo } from "@/lib/providers/types";

interface ModelsResponse {
  models: Record<string, ModelInfo[]>;
}

async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("모델 목록을 불러오지 못했습니다.");
  return res.json();
}

/**
 * Warms the two query caches almost every dashboard page needs (model list,
 * provider key/connection status) as soon as the shell mounts, instead of
 * each page paying for its own fetch the first time it's opened. Mounted
 * once in the persistent (dashboard) layout, alongside CommandPalette and
 * AutomationRunner -- renders nothing, and every page's own `useQuery` call
 * for the same key just reads this cache instead of refetching.
 */
export function DashboardPrefetch() {
  useSystemStatus();
  useQuery({ queryKey: ["models"], queryFn: fetchModels });
  return null;
}
