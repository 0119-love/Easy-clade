import { queryAll, queryOne } from "../history/db";
import { getAvgDurationInRange, getRecentRunsWithProject, localMidnightIso, type RunStatus } from "../history/queries";
import type { BrainNodeStatus, BrainRegionId } from "./regions";
import type { ProviderId } from "../config/types";

export interface BrainRegionMetric {
  label: string;
  value: string;
}

export interface BrainRegionStatus {
  id: BrainRegionId;
  status: BrainNodeStatus;
  /** Rows whose activity timestamp falls in the last 5 minutes -- drives packet-travel speed and the status LED. */
  recentCount: number;
  todayCount: number;
  errorCountToday: number;
  /** Only set for regions actually backed by a duration_ms column (committee, runs) -- never fabricated for the rest. */
  avgLatencyMs: number | null;
  costUsdToday: number | null;
  metrics: BrainRegionMetric[];
}

export interface BrainKpis {
  nodeCount: number;
  connectionCount: number;
  running: number;
  pending: number;
  failedToday: number;
  eventsPerSec: number;
  avgLatencyMs: number | null;
  costUsdToday: number;
}

export interface BrainActivityItem {
  id: string;
  label: string;
  detail: string | null;
  region: BrainRegionId;
  status: RunStatus;
  startedAt: string;
}

export interface BrainStatusResponse {
  kpis: BrainKpis;
  regions: BrainRegionStatus[];
  activity: BrainActivityItem[];
  topAgent: { provider: ProviderId; runCount: number } | null;
  recentWorkflow: { name: string; createdAt: string } | null;
  recentErrors: BrainActivityItem[];
  /** null overdueMinutes means the automation has never run at all yet, not "just now". */
  queue: { name: string; overdueMinutes: number | null }[];
  memory: { pinnedCount: number; totalCount: number };
  tokenUsageToday: { inputTokens: number; outputTokens: number };
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await queryOne<{ n: number }>(sql, params);
  return Number(row?.n ?? 0);
}

async function sum(sql: string, params: unknown[] = []): Promise<number> {
  const row = await queryOne<{ s: number | null }>(sql, params);
  return Number(row?.s ?? 0);
}

function statusOf(recentCount: number, errorCountToday: number): BrainNodeStatus {
  if (errorCountToday > 0) return "error";
  if (recentCount > 0) return "running";
  return "idle";
}

const fmtMs = (ms: number | null) => (ms == null ? "-" : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);
const fmtUsd = (usd: number) => `$${usd.toFixed(usd < 1 ? 4 : 2)}`;

/**
 * Single aggregation pass behind the Brain view's Pulse tab -- KPI strip,
 * per-region status cards, and the right-hand activity panel. Every number
 * comes from a real column this schema already has (status/duration_ms/
 * cost_usd/timestamps); domains with no persisted execution log (workflows,
 * integrations) get honest proxy metrics instead of a fabricated rate --
 * see the inline comments below at each of those.
 */
export async function getBrainStatus(userId: number): Promise<BrainStatusResponse> {
  const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const todayStartIso = localMidnightIso();
  const nowIso = new Date().toISOString();

  const [
    committeeRecent,
    committeeToday,
    committeeErrorsToday,
    committeeRunningNow,
    committeeCostToday,
    committeeAvgLatency,

    automationsRecentFire,
    automationsFiredToday,
    automationsEnabled,
    automationsTotal,
    automationsOverdue,

    memoryRecent,
    memoryToday,
    memoryPinned,
    memoryTotal,

    workflowsRecent,
    workflowsToday,
    workflowsTotal,
    latestWorkflow,

    tasksRecent,
    tasksToday,
    tasksOpen,
    tasksTotal,

    projectsRecentActive,
    projectsCreatedToday,
    projectsActive,
    projectRunLinks,

    runsRecent,
    runsToday,
    runsErrorsToday,
    runsCostToday,
    runsAvgLatencyToday,
    tokensToday,

    integrationsEnabled,
    integrationsTotal,

    topAgentRows,
    recentActivityRows,
    recentErrorRows,
    overdueAutomationRows,
  ] = await Promise.all([
    count(`SELECT COUNT(*) AS n FROM committee_runs WHERE user_id = ? AND started_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM committee_runs WHERE user_id = ? AND started_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM committee_runs WHERE user_id = ? AND status = 'error' AND started_at >= ?`, [
      userId,
      todayStartIso,
    ]),
    count(`SELECT COUNT(*) AS n FROM committee_runs WHERE user_id = ? AND status = 'running'`, [userId]),
    sum(`SELECT COALESCE(SUM(total_cost_usd), 0) AS s FROM committee_runs WHERE user_id = ? AND started_at >= ?`, [
      userId,
      todayStartIso,
    ]),
    queryOne<{ avg_ms: number | null }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at::timestamptz - started_at::timestamptz)) * 1000) AS avg_ms
       FROM committee_runs WHERE user_id = ? AND completed_at IS NOT NULL AND started_at >= ?`,
      [userId, todayStartIso],
    ).then((r) => (r?.avg_ms != null ? Number(r.avg_ms) : null)),

    count(`SELECT COUNT(*) AS n FROM automations WHERE user_id = ? AND last_run_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM automations WHERE user_id = ? AND last_run_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM automations WHERE user_id = ? AND trigger_type = 'interval'`, [userId]),
    count(`SELECT COUNT(*) AS n FROM automations WHERE user_id = ?`, [userId]),
    count(
      `SELECT COUNT(*) AS n FROM automations WHERE user_id = ? AND trigger_type = 'interval'
         AND (last_run_at IS NULL OR last_run_at::timestamptz <= ?::timestamptz - (interval_minutes * INTERVAL '1 minute'))`,
      [userId, nowIso],
    ),

    count(`SELECT COUNT(*) AS n FROM memory_entries WHERE user_id = ? AND created_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM memory_entries WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM memory_entries WHERE user_id = ? AND pinned = 1`, [userId]),
    count(`SELECT COUNT(*) AS n FROM memory_entries WHERE user_id = ?`, [userId]),

    count(`SELECT COUNT(*) AS n FROM workflows WHERE user_id = ? AND created_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM workflows WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM workflows WHERE user_id = ?`, [userId]),
    queryOne<{ name: string; created_at: string }>(`SELECT name, created_at FROM workflows WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [
      userId,
    ]),

    count(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND created_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND done = 0`, [userId]),
    count(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ?`, [userId]),

    count(
      `SELECT COUNT(DISTINCT project_id) AS n FROM runs WHERE user_id = ? AND project_id IS NOT NULL AND started_at >= ?`,
      [userId, sinceIso],
    ),
    count(`SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND archived = 0`, [userId]),
    count(`SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND project_id IS NOT NULL`, [userId]),

    count(`SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND started_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND started_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND status = 'error' AND started_at >= ?`, [userId, todayStartIso]),
    sum(`SELECT COALESCE(SUM(cost_usd), 0) AS s FROM runs WHERE user_id = ? AND started_at >= ?`, [userId, todayStartIso]),
    getAvgDurationInRange(userId, todayStartIso, nowIso).then((r) => r.avgDurationMs),
    queryOne<{ input_tokens: number; output_tokens: number }>(
      `SELECT COALESCE(SUM(input_tokens), 0) AS input_tokens, COALESCE(SUM(output_tokens), 0) AS output_tokens
       FROM runs WHERE user_id = ? AND started_at >= ?`,
      [userId, todayStartIso],
    ),

    count(`SELECT COUNT(*) AS n FROM integrations WHERE user_id = ? AND enabled = 1`, [userId]),
    count(`SELECT COUNT(*) AS n FROM integrations WHERE user_id = ?`, [userId]),

    queryAll<{ provider: ProviderId; run_count: number }>(
      `SELECT provider, COUNT(*) AS run_count FROM runs WHERE user_id = ? AND started_at >= ?
       GROUP BY provider ORDER BY run_count DESC LIMIT 1`,
      [userId, todayStartIso],
    ),
    getRecentRunsWithProject(userId, 10),
    queryAll<{ id: number; provider: ProviderId; project_name: string | null; error_message: string | null; started_at: string }>(
      `SELECT r.id, r.provider, p.name AS project_name, r.error_message, r.started_at FROM runs r
       LEFT JOIN projects p ON p.id = r.project_id
       WHERE r.user_id = ? AND r.status = 'error' AND r.started_at >= ?
       ORDER BY r.started_at DESC LIMIT 5`,
      [userId, todayStartIso],
    ),
    queryAll<{ name: string; last_run_at: string | null; interval_minutes: number }>(
      `SELECT name, last_run_at, interval_minutes FROM automations WHERE user_id = ? AND trigger_type = 'interval'
         AND (last_run_at IS NULL OR last_run_at::timestamptz <= ?::timestamptz - (interval_minutes * INTERVAL '1 minute'))
       ORDER BY last_run_at ASC NULLS FIRST LIMIT 5`,
      [userId, nowIso],
    ),
  ]);

  const regions: BrainRegionStatus[] = [
    {
      id: "committee",
      status: statusOf(committeeRunningNow > 0 ? 1 : committeeRecent, committeeErrorsToday),
      recentCount: committeeRecent,
      todayCount: committeeToday,
      errorCountToday: committeeErrorsToday,
      avgLatencyMs: committeeAvgLatency,
      costUsdToday: committeeCostToday,
      metrics: [
        { label: "실행 중", value: `${committeeRunningNow}` },
        { label: "오늘 실행", value: `${committeeToday}` },
        { label: "평균 소요", value: fmtMs(committeeAvgLatency) },
        { label: "오늘 비용", value: fmtUsd(committeeCostToday) },
      ],
    },
    {
      id: "automations",
      status: statusOf(automationsRecentFire, 0),
      recentCount: automationsRecentFire,
      todayCount: automationsFiredToday,
      errorCountToday: 0,
      avgLatencyMs: null,
      costUsdToday: null,
      metrics: [
        { label: "활성", value: `${automationsEnabled}/${automationsTotal}` },
        { label: "오늘 실행", value: `${automationsFiredToday}` },
        { label: "대기중", value: `${automationsOverdue}` },
      ],
    },
    {
      id: "memory",
      status: statusOf(memoryRecent, 0),
      recentCount: memoryRecent,
      todayCount: memoryToday,
      errorCountToday: 0,
      avgLatencyMs: null,
      costUsdToday: null,
      metrics: [
        { label: "고정됨", value: `${memoryPinned}/${memoryTotal}` },
        { label: "오늘 추가", value: `${memoryToday}` },
      ],
    },
    {
      id: "workflows",
      // No persisted execution log for workflow runs -- status/recentCount here
      // reflect recent definition edits, not executions.
      status: statusOf(workflowsRecent, 0),
      recentCount: workflowsRecent,
      todayCount: workflowsToday,
      errorCountToday: 0,
      avgLatencyMs: null,
      costUsdToday: null,
      metrics: [
        { label: "전체", value: `${workflowsTotal}` },
        { label: "최근 편집", value: `${workflowsToday}` },
      ],
    },
    {
      id: "tasks",
      status: statusOf(tasksRecent, 0),
      recentCount: tasksRecent,
      todayCount: tasksToday,
      errorCountToday: 0,
      avgLatencyMs: null,
      costUsdToday: null,
      metrics: [
        { label: "미완료", value: `${tasksOpen}/${tasksTotal}` },
        { label: "오늘 추가", value: `${tasksToday}` },
      ],
    },
    {
      id: "projects",
      status: statusOf(projectsRecentActive, 0),
      recentCount: projectsRecentActive,
      todayCount: projectsCreatedToday,
      errorCountToday: 0,
      avgLatencyMs: null,
      costUsdToday: null,
      metrics: [
        { label: "활성 프로젝트", value: `${projectsActive}` },
        { label: "연결된 실행", value: `${projectRunLinks}` },
      ],
    },
    {
      id: "runs",
      status: statusOf(runsRecent, runsErrorsToday),
      recentCount: runsRecent,
      todayCount: runsToday,
      errorCountToday: runsErrorsToday,
      avgLatencyMs: runsAvgLatencyToday,
      costUsdToday: runsCostToday,
      metrics: [
        { label: "오늘 실행", value: `${runsToday}` },
        { label: "평균 지연", value: fmtMs(runsAvgLatencyToday) },
        { label: "오늘 비용", value: fmtUsd(runsCostToday) },
        { label: "오류", value: `${runsErrorsToday}` },
      ],
    },
    {
      id: "integrations",
      status: integrationsEnabled > 0 ? "running" : "idle",
      recentCount: 0,
      todayCount: integrationsEnabled,
      errorCountToday: 0,
      avgLatencyMs: null,
      costUsdToday: null,
      metrics: [{ label: "활성", value: `${integrationsEnabled}/${integrationsTotal}` }],
    },
  ];

  const nodeCount =
    committeeToday +
    automationsTotal +
    memoryTotal +
    workflowsTotal +
    tasksTotal +
    projectsActive +
    runsToday +
    integrationsTotal;
  const connectionCount = nodeCount + tasksTotal; // every row links to its hub; tasks add a second (source-run) edge

  const kpis: BrainKpis = {
    nodeCount,
    connectionCount,
    running: committeeRunningNow,
    pending: automationsOverdue,
    failedToday: committeeErrorsToday + runsErrorsToday,
    eventsPerSec:
      Math.round(
        ((committeeRecent + automationsRecentFire + memoryRecent + workflowsRecent + tasksRecent + runsRecent) / 300) * 10,
      ) / 10,
    avgLatencyMs: runsAvgLatencyToday,
    costUsdToday: runsCostToday + committeeCostToday,
  };

  const activity: BrainActivityItem[] = recentActivityRows.map((r) => ({
    id: `run:${r.id}`,
    label: `${r.provider}`,
    detail: r.projectName,
    region: "runs",
    status: r.status,
    startedAt: r.startedAt,
  }));

  const recentErrors: BrainActivityItem[] = recentErrorRows.map((r) => ({
    id: `run:${r.id}`,
    label: r.provider,
    detail: r.project_name ?? r.error_message,
    region: "runs",
    status: "error",
    startedAt: r.started_at,
  }));

  const queue = overdueAutomationRows.map((r) => ({
    name: r.name,
    overdueMinutes: r.last_run_at
      ? Math.max(0, Math.round((Date.now() - new Date(r.last_run_at).getTime()) / 60000) - r.interval_minutes)
      : null,
  }));

  return {
    kpis,
    regions,
    activity,
    topAgent: topAgentRows[0] ? { provider: topAgentRows[0].provider, runCount: Number(topAgentRows[0].run_count) } : null,
    recentWorkflow: latestWorkflow ? { name: latestWorkflow.name, createdAt: latestWorkflow.created_at } : null,
    recentErrors,
    queue,
    memory: { pinnedCount: memoryPinned, totalCount: memoryTotal },
    tokenUsageToday: {
      inputTokens: Number(tokensToday?.input_tokens ?? 0),
      outputTokens: Number(tokensToday?.output_tokens ?? 0),
    },
  };
}
