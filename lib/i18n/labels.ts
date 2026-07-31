import type { CardState, EffortLevel } from "../store/dashboardStore";
import type { RunStatus } from "../history/queries";
import type { ProviderKeyStatus } from "../config/types";

/** Client-side card status (dashboardStore) -> Korean display label. */
export const CARD_STATUS_LABELS: Record<CardState["status"], string> = {
  idle: "대기 중",
  running: "실행 중",
  done: "완료",
  error: "오류",
  stopped: "중지됨",
};

/** Persisted run status (history.db) -> Korean display label. */
export const HISTORY_STATUS_LABELS: Record<RunStatus, string> = {
  success: "성공",
  error: "오류",
  stopped: "중지됨",
};

/** Thinking-effort level (dashboardStore / history.db) -> Korean display label. */
export const EFFORT_LABELS: Record<EffortLevel, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  xhigh: "매우 높음",
  max: "최대",
};

export type ProviderStatusTone = "online" | "error" | "unconfigured";

/** Same "configured / last call errored / fine" logic TopBar's system status already uses, one level down to a single provider card. */
export function providerStatusTone(keyStatus: ProviderKeyStatus | undefined): ProviderStatusTone {
  if (!keyStatus?.configured) return "unconfigured";
  if (keyStatus.lastCallStatus === "error") return "error";
  return "online";
}

export const PROVIDER_STATUS_LABELS: Record<ProviderStatusTone, string> = {
  online: "온라인",
  error: "오류",
  unconfigured: "미등록",
};

export function formatRelativeTimeKo(iso: string | null | undefined): string {
  if (!iso) return "없음";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}
