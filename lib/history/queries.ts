import { execute, queryAll, queryOne } from "./db";
import type { ProviderId } from "../config/types";
import type { EffortLevel } from "../store/dashboardStore";

export type RunStatus = "success" | "error" | "stopped";

export interface NewRunRow {
  runGroupId: string;
  provider: ProviderId;
  model: string;
  systemPrompt: string | null;
  userPrompt: string;
  temperature: number | null;
  status: RunStatus;
  responseText: string | null;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string;
  projectId: number | null;
  /** Nullable -- older rows predate this column, and not every caller of insertRun passes an effort. */
  effort: EffortLevel | null;
}

export interface RunRow extends NewRunRow {
  id: number;
}

export interface NewJudgeRunRow {
  runGroupId: string;
  mode: "consensus" | "best_answer" | "route";
  judgeProvider: ProviderId;
  judgeModel: string;
  resultText: string | null;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  startedAt: string;
  completedAt: string;
  /** Only ever set for mode="best_answer", and only when the judge's reply included a parseable winner line. */
  winnerProvider?: ProviderId | null;
  winnerModel?: string | null;
}

export async function insertRun(userId: number, row: NewRunRow): Promise<number> {
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO runs
       (user_id, run_group_id, provider, model, system_prompt, user_prompt, temperature, status, response_text, error_message, input_tokens, output_tokens, cost_usd, latency_ms, duration_ms, started_at, completed_at, project_id, effort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      row.runGroupId,
      row.provider,
      row.model,
      row.systemPrompt,
      row.userPrompt,
      row.temperature,
      row.status,
      row.responseText,
      row.errorMessage,
      row.inputTokens,
      row.outputTokens,
      row.costUsd,
      row.latencyMs,
      row.durationMs,
      row.startedAt,
      row.completedAt,
      row.projectId,
      row.effort,
    ],
  );
  return inserted!.id;
}

export async function insertJudgeRun(userId: number, row: NewJudgeRunRow): Promise<void> {
  await execute(
    `INSERT INTO judge_runs
       (user_id, run_group_id, mode, judge_provider, judge_model, result_text, error_message, input_tokens, output_tokens, cost_usd, started_at, completed_at, winner_provider, winner_model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      row.runGroupId,
      row.mode,
      row.judgeProvider,
      row.judgeModel,
      row.resultText,
      row.errorMessage,
      row.inputTokens,
      row.outputTokens,
      row.costUsd,
      row.startedAt,
      row.completedAt,
      row.winnerProvider ?? null,
      row.winnerModel ?? null,
    ],
  );
}

function rowToRunRow(r: Record<string, unknown>): RunRow {
  return {
    id: r.id as number,
    runGroupId: r.run_group_id as string,
    provider: r.provider as ProviderId,
    model: r.model as string,
    systemPrompt: r.system_prompt as string | null,
    userPrompt: r.user_prompt as string,
    temperature: r.temperature as number | null,
    status: r.status as RunStatus,
    responseText: r.response_text as string | null,
    errorMessage: r.error_message as string | null,
    inputTokens: r.input_tokens as number,
    outputTokens: r.output_tokens as number,
    costUsd: r.cost_usd as number,
    latencyMs: r.latency_ms as number | null,
    durationMs: r.duration_ms as number | null,
    startedAt: r.started_at as string,
    completedAt: r.completed_at as string,
    projectId: (r.project_id as number | null) ?? null,
    effort: (r.effort as EffortLevel | null) ?? null,
  };
}

/** Unbounded -- used only by the Preferences page's "export all data" action. */
export async function getAllRuns(userId: number): Promise<RunRow[]> {
  const rows = await queryAll(`SELECT * FROM runs WHERE user_id = ? ORDER BY started_at DESC`, [userId]);
  return rows.map(rowToRunRow);
}

export async function getRecentRuns(userId: number, limit = 20): Promise<RunRow[]> {
  const rows = await queryAll(`SELECT * FROM runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`, [userId, limit]);
  return rows.map(rowToRunRow);
}

export interface RunListFilters {
  provider?: ProviderId;
  status?: RunStatus;
  projectId?: number;
  limit: number;
  offset: number;
}

export async function getRunsPaginated(userId: number, filters: RunListFilters): Promise<{ runs: RunRow[]; total: number }> {
  const conditions: string[] = ["user_id = ?"];
  const params: (string | number)[] = [userId];
  if (filters.provider) {
    conditions.push("provider = ?");
    params.push(filters.provider);
  }
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.projectId) {
    conditions.push("project_id = ?");
    params.push(filters.projectId);
  }
  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const totalRow = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM runs ${whereClause}`, params);
  const total = Number(totalRow!.n);

  const rows = await queryAll(`SELECT * FROM runs ${whereClause} ORDER BY started_at DESC LIMIT ? OFFSET ?`, [
    ...params,
    filters.limit,
    filters.offset,
  ]);

  return { total, runs: rows.map(rowToRunRow) };
}

export interface TodayStats {
  tokens: number;
  costUsd: number;
}

/** Sums today's runs, bounded to local-midnight -- callers pass the ISO timestamp for local midnight since Node has no built-in "start of local day" helper. */
export async function getTodayStats(userId: number, sinceIso: string): Promise<TodayStats> {
  const row = await queryOne<{ tokens: number; cost_usd: number }>(
    `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM runs WHERE user_id = ? AND started_at >= ?`,
    [userId, sinceIso],
  );
  return { tokens: Number(row!.tokens), costUsd: Number(row!.cost_usd) };
}

/** Local (not UTC) midnight for "today" as this user's browser would understand it -- Node has no built-in "start of local day" helper. */
export function localMidnightIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export interface TodayStatsByProvider {
  provider: ProviderId;
  tokens: number;
  runCount: number;
}

/** Same shape as getTodayStats, split per-provider -- drives the dashboard's 6 provider cards and (summed) its system-status tile. */
export async function getTodayStatsByProvider(userId: number, sinceIso: string): Promise<TodayStatsByProvider[]> {
  const rows = await queryAll<{ provider: ProviderId; tokens: number; run_count: number }>(
    `SELECT provider, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens, COUNT(*) AS run_count
     FROM runs WHERE user_id = ? AND started_at >= ? GROUP BY provider`,
    [userId, sinceIso],
  );
  return rows.map((r) => ({ provider: r.provider, tokens: Number(r.tokens), runCount: Number(r.run_count) }));
}

/** Same query bounded to [sinceIso, untilIso) -- used to pull yesterday's numbers for a day-over-day TrendBadge. */
export async function getStatsByProviderInRange(
  userId: number,
  sinceIso: string,
  untilIso: string,
): Promise<TodayStatsByProvider[]> {
  const rows = await queryAll<{ provider: ProviderId; tokens: number; run_count: number }>(
    `SELECT provider, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens, COUNT(*) AS run_count
     FROM runs WHERE user_id = ? AND started_at >= ? AND started_at < ? GROUP BY provider`,
    [userId, sinceIso, untilIso],
  );
  return rows.map((r) => ({ provider: r.provider, tokens: Number(r.tokens), runCount: Number(r.run_count) }));
}

export interface DailyStat {
  date: string;
  tokens: number;
  costUsd: number;
  runCount: number;
  errorCount: number;
}

function toDailyStat(r: { date: string; tokens: number; cost_usd: number; run_count: number; error_count: number }): DailyStat {
  return {
    date: r.date,
    tokens: Number(r.tokens),
    costUsd: Number(r.cost_usd),
    runCount: Number(r.run_count),
    errorCount: Number(r.error_count),
  };
}

/** Day-bucketed stats for the last N days. started_at is stored as an ISO8601 TEXT column -- cast to timestamptz to bucket it. */
export async function getDailyStats(userId: number, days: number): Promise<DailyStat[]> {
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await queryAll<{ date: string; tokens: number; cost_usd: number; run_count: number; error_count: number }>(
    `SELECT
       to_char(started_at::timestamptz, 'YYYY-MM-DD') AS date,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
       COALESCE(SUM(cost_usd), 0) AS cost_usd,
       COUNT(*) AS run_count,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
     FROM runs
     WHERE user_id = ? AND started_at >= ?
     GROUP BY to_char(started_at::timestamptz, 'YYYY-MM-DD')
     ORDER BY to_char(started_at::timestamptz, 'YYYY-MM-DD') ASC`,
    [userId, sinceIso],
  );
  return rows.map(toDailyStat);
}

export type UsageGranularity = "daily" | "weekly" | "monthly";

/**
 * Week-bucketed stats for the last N weeks. Grouped by Postgres's ISO
 * year-week ('IYYY-IW', Monday-start) rather than a calendar-exact custom
 * bucket -- close enough for a usage chart, and far simpler than hand-rolling
 * week-start math in JS. `weekStart` is the earliest date actually seen in
 * that bucket, so the label reflects real data rather than a computed Monday
 * that might predate this app's history.
 */
export async function getWeeklyStats(userId: number, weeks: number): Promise<DailyStat[]> {
  const sinceIso = new Date(Date.now() - weeks * 7 * 86_400_000).toISOString();
  const rows = await queryAll<{ date: string; tokens: number; cost_usd: number; run_count: number; error_count: number }>(
    `SELECT
       MIN(to_char(started_at::timestamptz, 'YYYY-MM-DD')) AS date,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
       COALESCE(SUM(cost_usd), 0) AS cost_usd,
       COUNT(*) AS run_count,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
     FROM runs
     WHERE user_id = ? AND started_at >= ?
     GROUP BY to_char(started_at::timestamptz, 'IYYY-IW')
     ORDER BY to_char(started_at::timestamptz, 'IYYY-IW') ASC`,
    [userId, sinceIso],
  );
  return rows.map(toDailyStat);
}

/** Month-bucketed stats for the last N months, grouped by calendar month (unambiguous, unlike week-of-year). */
export async function getMonthlyStats(userId: number, months: number): Promise<DailyStat[]> {
  const sinceIso = new Date(Date.now() - months * 30 * 86_400_000).toISOString();
  const rows = await queryAll<{ date: string; tokens: number; cost_usd: number; run_count: number; error_count: number }>(
    `SELECT
       to_char(started_at::timestamptz, 'YYYY-MM') AS date,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
       COALESCE(SUM(cost_usd), 0) AS cost_usd,
       COUNT(*) AS run_count,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
     FROM runs
     WHERE user_id = ? AND started_at >= ?
     GROUP BY to_char(started_at::timestamptz, 'YYYY-MM')
     ORDER BY to_char(started_at::timestamptz, 'YYYY-MM') ASC`,
    [userId, sinceIso],
  );
  return rows.map(toDailyStat);
}

export async function getUsageBuckets(userId: number, granularity: UsageGranularity): Promise<DailyStat[]> {
  switch (granularity) {
    case "daily":
      return getDailyStats(userId, 30);
    case "weekly":
      return getWeeklyStats(userId, 12);
    case "monthly":
      return getMonthlyStats(userId, 12);
  }
}

export interface ProviderBreakdown {
  provider: ProviderId;
  runCount: number;
  tokens: number;
  costUsd: number;
  successCount: number;
  errorCount: number;
}

export async function getProviderBreakdown(userId: number): Promise<ProviderBreakdown[]> {
  const rows = await queryAll<{
    provider: ProviderId;
    run_count: number;
    tokens: number;
    cost_usd: number;
    success_count: number;
    error_count: number;
  }>(
    `SELECT
       provider,
       COUNT(*) AS run_count,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
       COALESCE(SUM(cost_usd), 0) AS cost_usd,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
     FROM runs
     WHERE user_id = ?
     GROUP BY provider
     ORDER BY run_count DESC`,
    [userId],
  );
  return rows.map((r) => ({
    provider: r.provider,
    runCount: Number(r.run_count),
    tokens: Number(r.tokens),
    costUsd: Number(r.cost_usd),
    successCount: Number(r.success_count),
    errorCount: Number(r.error_count),
  }));
}

export interface ProviderCostInRange {
  provider: ProviderId;
  costUsd: number;
}

/** Same shape as getProviderBreakdown's cost column, but bounded to [sinceIso, untilIso) -- used to build period-over-period comparisons. */
export async function getProviderCostInRange(userId: number, sinceIso: string, untilIso: string): Promise<ProviderCostInRange[]> {
  const rows = await queryAll<{ provider: ProviderId; cost_usd: number }>(
    `SELECT provider, COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM runs
     WHERE user_id = ? AND started_at >= ? AND started_at < ?
     GROUP BY provider`,
    [userId, sinceIso, untilIso],
  );
  return rows.map((r) => ({ provider: r.provider, costUsd: Number(r.cost_usd) }));
}

export interface ModelBreakdown {
  provider: ProviderId;
  model: string;
  runCount: number;
  tokens: number;
  costUsd: number;
}

export async function getModelBreakdown(userId: number): Promise<ModelBreakdown[]> {
  const rows = await queryAll<{ provider: ProviderId; model: string; run_count: number; tokens: number; cost_usd: number }>(
    `SELECT
       provider,
       model,
       COUNT(*) AS run_count,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
       COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM runs
     WHERE user_id = ?
     GROUP BY provider, model
     ORDER BY run_count DESC`,
    [userId],
  );
  return rows.map((r) => ({
    provider: r.provider,
    model: r.model,
    runCount: Number(r.run_count),
    tokens: Number(r.tokens),
    costUsd: Number(r.cost_usd),
  }));
}

export interface CostKillerEntry {
  provider: ProviderId;
  model: string;
  /** How many "최선의 답변" comparisons this model was a candidate in. */
  timesCompeted: number;
  /** How many of those it was the judge's pick. */
  timesWon: number;
  winRate: number;
  avgCostUsd: number;
}

/**
 * "Cost Killer": which models actually win 최선의 답변 comparisons, and what
 * they cost -- grounded entirely in this app's own judged history, not a
 * live guarantee. There's no way to know in advance that a cheaper model
 * will match quality on a *new* prompt without running it (which defeats the
 * point) -- this only ever says "here's what won before," gated on a minimum
 * sample size so a single lucky win doesn't read as a trend.
 */
export async function getCostKillerLeaderboard(userId: number, minSampleSize = 3): Promise<CostKillerEntry[]> {
  const rows = await queryAll<{
    provider: ProviderId;
    model: string;
    times_competed: number;
    times_won: number;
    avg_cost_usd: number;
  }>(
    `SELECT
       r.provider AS provider,
       r.model AS model,
       COUNT(DISTINCT r.run_group_id) AS times_competed,
       COUNT(DISTINCT CASE WHEN jr.winner_provider = r.provider AND jr.winner_model = r.model THEN r.run_group_id END) AS times_won,
       AVG(r.cost_usd) AS avg_cost_usd
     FROM runs r
     JOIN judge_runs jr ON jr.run_group_id = r.run_group_id
     WHERE r.user_id = ? AND r.status = 'success' AND jr.mode = 'best_answer' AND jr.winner_model IS NOT NULL
     GROUP BY r.provider, r.model
     HAVING COUNT(DISTINCT r.run_group_id) >= ?
     ORDER BY times_won * 1.0 / times_competed DESC, avg_cost_usd ASC`,
    [userId, minSampleSize],
  );

  return rows.map((r) => ({
    provider: r.provider,
    model: r.model,
    timesCompeted: Number(r.times_competed),
    timesWon: Number(r.times_won),
    winRate: Number(r.times_won) / Number(r.times_competed),
    avgCostUsd: Number(r.avg_cost_usd),
  }));
}

export type DashboardRange = "24h" | "7d" | "30d";

export interface ProviderTrendPoint {
  bucket: string;
  provider: ProviderId;
  tokens: number;
}

const RANGE_CONFIG: Record<DashboardRange, { hourly: boolean; lookbackMs: number }> = {
  "24h": { hourly: true, lookbackMs: 24 * 60 * 60_000 },
  "7d": { hourly: false, lookbackMs: 7 * 86_400_000 },
  "30d": { hourly: false, lookbackMs: 30 * 86_400_000 },
};

/**
 * Bucketed by BOTH time and provider (getDailyStats/getWeeklyStats only group
 * by time) -- needed to drive the dashboard's multi-line "tokens over time,
 * one line per provider" chart. A provider with zero runs in some bucket
 * simply has no row for it (not a zero row) -- callers must fill gaps
 * themselves before charting.
 */
export async function getUsageTrendByProvider(userId: number, range: DashboardRange): Promise<ProviderTrendPoint[]> {
  const { hourly, lookbackMs } = RANGE_CONFIG[range];
  const sinceIso = new Date(Date.now() - lookbackMs).toISOString();
  // hourly is a fixed boolean from RANGE_CONFIG (never request input), so this
  // interpolation only ever picks between two hardcoded literals -- not
  // string-built from anything a caller passes in.
  const bucketExpr = hourly
    ? `to_char(started_at::timestamptz, 'YYYY-MM-DD HH24:00')`
    : `to_char(started_at::timestamptz, 'YYYY-MM-DD')`;
  const rows = await queryAll<{ bucket: string; provider: ProviderId; tokens: number }>(
    `SELECT ${bucketExpr} AS bucket, provider, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens
     FROM runs WHERE user_id = ? AND started_at >= ?
     GROUP BY ${bucketExpr}, provider ORDER BY bucket ASC`,
    [userId, sinceIso],
  );
  return rows.map((r) => ({ bucket: r.bucket, provider: r.provider, tokens: Number(r.tokens) }));
}

export interface RecentActivityRow extends RunRow {
  projectName: string | null;
}

/** Recent runs with the project name already joined in -- backs the dashboard's "최근 활동" feed. */
export async function getRecentRunsWithProject(userId: number, limit = 8): Promise<RecentActivityRow[]> {
  const rows = await queryAll<Record<string, unknown>>(
    `SELECT r.*, p.name AS project_name FROM runs r
     LEFT JOIN projects p ON p.id = r.project_id
     WHERE r.user_id = ? ORDER BY r.started_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map((r) => ({ ...rowToRunRow(r), projectName: (r.project_name as string | null) ?? null }));
}

export interface AvgResponseTime {
  /** null when there are zero rows with a non-null duration_ms in range -- "no data," not "0ms". */
  avgDurationMs: number | null;
}

/**
 * Wall-clock average from duration_ms -- NOT latency_ms, which app/api/run/route.ts
 * never populates (always inserted as null). duration_ms is a real
 * Date.now()-delta spanning the full provider call, recorded for every run
 * regardless of success/error/stopped.
 */
export async function getAvgDurationInRange(userId: number, sinceIso: string, untilIso: string): Promise<AvgResponseTime> {
  const row = await queryOne<{ avg_duration_ms: number | null }>(
    `SELECT AVG(duration_ms) AS avg_duration_ms
     FROM runs WHERE user_id = ? AND started_at >= ? AND started_at < ? AND duration_ms IS NOT NULL`,
    [userId, sinceIso, untilIso],
  );
  return { avgDurationMs: row?.avg_duration_ms != null ? Number(row.avg_duration_ms) : null };
}

export interface ProviderAvgDuration {
  provider: ProviderId;
  avgDurationMs: number | null;
}

/** Same as getAvgDurationInRange, split per provider -- drives the dashboard provider cards' response-time line. */
export async function getAvgDurationByProviderInRange(
  userId: number,
  sinceIso: string,
  untilIso: string,
): Promise<ProviderAvgDuration[]> {
  const rows = await queryAll<{ provider: ProviderId; avg_duration_ms: number | null }>(
    `SELECT provider, AVG(duration_ms) AS avg_duration_ms
     FROM runs WHERE user_id = ? AND started_at >= ? AND started_at < ? AND duration_ms IS NOT NULL
     GROUP BY provider`,
    [userId, sinceIso, untilIso],
  );
  return rows.map((r) => ({ provider: r.provider, avgDurationMs: r.avg_duration_ms != null ? Number(r.avg_duration_ms) : null }));
}

export interface SuccessRateStats {
  runCount: number;
  successCount: number;
  /** null when runCount === 0 -- "no runs to judge," not "0% success". */
  successRate: number | null;
}

/** Bounded to [sinceIso, untilIso) -- today/yesterday pair drives a day-over-day success-rate KPI, same shape as the other *InRange functions. */
export async function getSuccessRateInRange(userId: number, sinceIso: string, untilIso: string): Promise<SuccessRateStats> {
  const row = await queryOne<{ run_count: number; success_count: number }>(
    `SELECT COUNT(*) AS run_count, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count
     FROM runs WHERE user_id = ? AND started_at >= ? AND started_at < ?`,
    [userId, sinceIso, untilIso],
  );
  const runCount = Number(row!.run_count);
  const successCount = Number(row!.success_count);
  return { runCount, successCount, successRate: runCount > 0 ? successCount / runCount : null };
}

/**
 * Alias over getDailyStats sized for a GitHub-style contribution heatmap
 * (~26 weeks) -- same DailyStat shape, just a naming/intent marker at call
 * sites so "heatmap data" doesn't silently mean "arbitrary day count".
 */
export async function getActivityHeatmapDays(userId: number, days = 182): Promise<DailyStat[]> {
  return getDailyStats(userId, days);
}
