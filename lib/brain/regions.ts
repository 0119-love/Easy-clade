/**
 * Shared region/domain metadata for the Brain views (Pulse + Graph).
 * Colors are the dataviz skill's validated 8-slot dark categorical palette,
 * assigned in its fixed order and re-validated against this app's actual
 * dark surface (#0a0a0b) -- worst adjacent CVD ΔE 8.4, normal-vision floor
 * 19.3, all >= 3:1 contrast. Never reorder or hand-pick a replacement hex;
 * re-run the skill's validate_palette.js if a 9th region is ever added.
 */
export type BrainRegionId =
  | "committee"
  | "automations"
  | "memory"
  | "workflows"
  | "tasks"
  | "projects"
  | "runs"
  | "integrations";

export interface BrainRegionMeta {
  id: BrainRegionId;
  label: string;
  description: string;
  color: string;
}

export const BRAIN_REGIONS: BrainRegionMeta[] = [
  { id: "committee", label: "COMMITTEE", description: "AI Committee 합의 실행", color: "#3987e5" },
  { id: "automations", label: "AUTOMATIONS", description: "자동화 트리거 실행", color: "#d95926" },
  { id: "memory", label: "MEMORY", description: "메모리 기록", color: "#199e70" },
  { id: "workflows", label: "WORKFLOWS", description: "워크플로우 정의", color: "#c98500" },
  { id: "tasks", label: "TASKS", description: "작업 항목", color: "#d55181" },
  { id: "projects", label: "PROJECTS", description: "프로젝트", color: "#008300" },
  { id: "runs", label: "EXECUTIVE", description: "모델 실행 엔진", color: "#9085e9" },
  { id: "integrations", label: "INTEGRATIONS", description: "외부 연동", color: "#e66767" },
];

/**
 * Status is a separate channel from region identity above -- never reuse a
 * categorical region hue for status, and never let a 9th "region" borrow a
 * status color (dataviz skill: status colors are reserved, never series
 * identity). Reuses this app's existing --success/--warning/--danger tokens
 * (see app/globals.css) rather than a second parallel palette.
 */
export type BrainNodeStatus = "running" | "idle" | "error";

export const STATUS_COLOR: Record<BrainNodeStatus, string> = {
  running: "#f59e0b", // busy/active -- matches --warning
  idle: "#10b981", // healthy baseline -- matches --success
  error: "#f87171", // matches --danger
};

export const STATUS_LABEL: Record<BrainNodeStatus, string> = {
  running: "작업중",
  idle: "정상",
  error: "오류",
};
