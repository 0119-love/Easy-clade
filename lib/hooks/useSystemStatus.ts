import { useQuery } from "@tanstack/react-query";
import type { KeysStatusResponse } from "@/lib/config/types";

async function fetchKeysStatus(): Promise<KeysStatusResponse> {
  const res = await fetch("/api/settings/keys");
  if (!res.ok) throw new Error("키 상태를 불러오지 못했습니다.");
  return res.json();
}

/** Shared by TopBar's status pill and the dashboard's system-status card -- both read the same "/api/settings/keys" source, so they should never drift. */
export function useSystemStatus() {
  const { data, isPending } = useQuery({ queryKey: ["settings", "keys"], queryFn: fetchKeysStatus });
  const providers = data ? Object.values(data.providers) : [];
  const configuredCount = providers.filter((p) => p.configured).length;
  const anyRecentFailure = providers.some((p) => p.configured && p.lastCallStatus === "error");

  if (configuredCount === 0) {
    return { label: "등록된 프로바이더 없음", dotClass: "bg-muted-foreground", data, isPending };
  }
  if (anyRecentFailure) {
    return { label: "일부 오류", dotClass: "bg-warning", data, isPending };
  }
  return { label: "정상 작동 중", dotClass: "bg-success", data, isPending };
}
