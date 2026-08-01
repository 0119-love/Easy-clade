import { execute, queryAll, queryOne } from "../history/db";
import type { ProviderId } from "../config/types";
import type { CommitteeContext, CommitteeRunStatus, CommitteeStage, CommitteeStepStatus } from "./types";

export interface NewCommitteeRunRow {
  mission: string;
  context: CommitteeContext;
  providers: ProviderId[];
  targetQualityScore: number;
  maxLoops: number;
  judgeProvider: ProviderId;
  judgeModel: string;
  estimatedCostUsd: number;
  estimatedSeconds: number;
}

export interface CommitteeRunRow {
  id: number;
  mission: string;
  optimizedMission: string | null;
  context: CommitteeContext;
  providers: ProviderId[];
  targetQualityScore: number;
  maxLoops: number;
  judgeProvider: ProviderId;
  judgeModel: string;
  estimatedCostUsd: number;
  estimatedSeconds: number;
  status: CommitteeRunStatus;
  finalConsensusText: string | null;
  finalQualityScore: number | null;
  bestLoopNumber: number | null;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

function rowToCommitteeRunRow(r: Record<string, unknown>): CommitteeRunRow {
  return {
    id: r.id as number,
    mission: r.mission as string,
    optimizedMission: (r.optimized_mission as string | null) ?? null,
    context: JSON.parse(r.context_json as string) as CommitteeContext,
    providers: JSON.parse(r.providers_json as string) as ProviderId[],
    targetQualityScore: r.target_quality_score as number,
    maxLoops: r.max_loops as number,
    judgeProvider: r.judge_provider as ProviderId,
    judgeModel: r.judge_model as string,
    estimatedCostUsd: Number(r.estimated_cost_usd),
    estimatedSeconds: r.estimated_seconds as number,
    status: r.status as CommitteeRunStatus,
    finalConsensusText: (r.final_consensus_text as string | null) ?? null,
    finalQualityScore: (r.final_quality_score as number | null) ?? null,
    bestLoopNumber: (r.best_loop_number as number | null) ?? null,
    totalCostUsd: Number(r.total_cost_usd),
    totalInputTokens: r.total_input_tokens as number,
    totalOutputTokens: r.total_output_tokens as number,
    errorMessage: (r.error_message as string | null) ?? null,
    startedAt: r.started_at as string,
    completedAt: (r.completed_at as string | null) ?? null,
  };
}

export async function insertCommitteeRun(userId: number, row: NewCommitteeRunRow): Promise<number> {
  const startedAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO committee_runs
       (user_id, mission, context_json, providers_json, target_quality_score, max_loops, judge_provider, judge_model, estimated_cost_usd, estimated_seconds, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      row.mission,
      JSON.stringify(row.context),
      JSON.stringify(row.providers),
      row.targetQualityScore,
      row.maxLoops,
      row.judgeProvider,
      row.judgeModel,
      row.estimatedCostUsd,
      row.estimatedSeconds,
      startedAt,
    ],
  );
  return inserted!.id;
}

export async function getCommitteeRun(userId: number, id: number): Promise<CommitteeRunRow | null> {
  const row = await queryOne(`SELECT * FROM committee_runs WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToCommitteeRunRow(row) : null;
}

export async function updateOptimizedMission(userId: number, id: number, optimizedMission: string): Promise<void> {
  await execute(`UPDATE committee_runs SET optimized_mission = ? WHERE id = ? AND user_id = ?`, [
    optimizedMission,
    id,
    userId,
  ]);
}

export interface FinalizeCommitteeRunPatch {
  status: CommitteeRunStatus;
  finalConsensusText: string | null;
  finalQualityScore: number | null;
  bestLoopNumber: number | null;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorMessage: string | null;
}

export async function finalizeCommitteeRun(userId: number, id: number, patch: FinalizeCommitteeRunPatch): Promise<void> {
  const completedAt = new Date().toISOString();
  await execute(
    `UPDATE committee_runs SET
       status = ?, final_consensus_text = ?, final_quality_score = ?, best_loop_number = ?,
       total_cost_usd = ?, total_input_tokens = ?, total_output_tokens = ?, error_message = ?, completed_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      patch.status,
      patch.finalConsensusText,
      patch.finalQualityScore,
      patch.bestLoopNumber,
      patch.totalCostUsd,
      patch.totalInputTokens,
      patch.totalOutputTokens,
      patch.errorMessage,
      completedAt,
      id,
      userId,
    ],
  );
}

export interface CommitteeRunSummary extends CommitteeRunRow {
  loopCount: number;
}

export async function getRecentCommitteeRuns(userId: number, limit = 10): Promise<CommitteeRunSummary[]> {
  const rows = await queryAll<Record<string, unknown>>(
    `SELECT r.*, COUNT(l.id) AS loop_count FROM committee_runs r
     LEFT JOIN committee_loops l ON l.committee_run_id = r.id
     WHERE r.user_id = ? GROUP BY r.id ORDER BY r.started_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map((r) => ({ ...rowToCommitteeRunRow(r), loopCount: Number(r.loop_count) }));
}

export interface NewCommitteeLoopRow {
  committeeRunId: number;
  loopNumber: number;
  status: "success" | "error";
  consensusText: string | null;
  qualityScore: number | null;
  qualityScoreRaw: string | null;
  participatingProviders: ProviderId[];
  excludedProviders: ProviderId[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  startedAt: string;
}

export interface CommitteeLoopRow {
  id: number;
  committeeRunId: number;
  loopNumber: number;
  status: "running" | "success" | "error";
  consensusText: string | null;
  qualityScore: number | null;
  qualityScoreRaw: string | null;
  participatingProviders: ProviderId[];
  excludedProviders: ProviderId[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  startedAt: string;
  completedAt: string | null;
}

function rowToCommitteeLoopRow(r: Record<string, unknown>): CommitteeLoopRow {
  return {
    id: r.id as number,
    committeeRunId: r.committee_run_id as number,
    loopNumber: r.loop_number as number,
    status: r.status as CommitteeLoopRow["status"],
    consensusText: (r.consensus_text as string | null) ?? null,
    qualityScore: (r.quality_score as number | null) ?? null,
    qualityScoreRaw: (r.quality_score_raw as string | null) ?? null,
    participatingProviders: JSON.parse(r.participating_providers_json as string),
    excludedProviders: JSON.parse(r.excluded_providers_json as string),
    totalInputTokens: r.total_input_tokens as number,
    totalOutputTokens: r.total_output_tokens as number,
    totalCostUsd: Number(r.total_cost_usd),
    startedAt: r.started_at as string,
    completedAt: (r.completed_at as string | null) ?? null,
  };
}

/**
 * Inserted exactly once per loop, only when that loop's judge call succeeds
 * (see lib/committee/orchestrator.ts) -- a failed judge attempt never
 * reaches this far, so there's no concurrent-write/upsert scenario to
 * handle here.
 */
export async function insertCommitteeLoop(userId: number, row: NewCommitteeLoopRow): Promise<number> {
  const completedAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO committee_loops
       (user_id, committee_run_id, loop_number, status, consensus_text, quality_score, quality_score_raw,
        participating_providers_json, excluded_providers_json, total_input_tokens, total_output_tokens, total_cost_usd, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      row.committeeRunId,
      row.loopNumber,
      row.status,
      row.consensusText,
      row.qualityScore,
      row.qualityScoreRaw,
      JSON.stringify(row.participatingProviders),
      JSON.stringify(row.excludedProviders),
      row.totalInputTokens,
      row.totalOutputTokens,
      row.totalCostUsd,
      row.startedAt,
      completedAt,
    ],
  );
  return inserted!.id;
}

export async function getCommitteeLoops(userId: number, committeeRunId: number): Promise<CommitteeLoopRow[]> {
  const rows = await queryAll(
    `SELECT * FROM committee_loops WHERE user_id = ? AND committee_run_id = ? ORDER BY loop_number ASC`,
    [userId, committeeRunId],
  );
  return rows.map(rowToCommitteeLoopRow);
}

export interface NewCommitteeStageCallRow {
  committeeRunId: number;
  loopNumber: number;
  stage: CommitteeStage;
  provider: ProviderId;
  model: string;
  status: CommitteeStepStatus;
  responseText: string | null;
  errorMessage: string | null;
  attemptNumber: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  startedAt: string;
}

export async function insertCommitteeStageCall(userId: number, row: NewCommitteeStageCallRow): Promise<number> {
  const completedAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO committee_stage_calls
       (user_id, committee_run_id, loop_number, stage, provider, model, status, response_text, error_message,
        attempt_number, input_tokens, output_tokens, cost_usd, duration_ms, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      row.committeeRunId,
      row.loopNumber,
      row.stage,
      row.provider,
      row.model,
      row.status,
      row.responseText,
      row.errorMessage,
      row.attemptNumber,
      row.inputTokens,
      row.outputTokens,
      row.costUsd,
      row.durationMs,
      row.startedAt,
      completedAt,
    ],
  );
  return inserted!.id;
}

/** How many attempts (including failed ones) this exact (loop, stage, provider) has already had -- next attempt_number to record. */
export async function getNextAttemptNumber(
  userId: number,
  committeeRunId: number,
  loopNumber: number,
  stage: CommitteeStage,
  provider: ProviderId,
): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM committee_stage_calls
     WHERE user_id = ? AND committee_run_id = ? AND loop_number = ? AND stage = ? AND provider = ?`,
    [userId, committeeRunId, loopNumber, stage, provider],
  );
  return Number(row!.n) + 1;
}

/** This provider's latest successful "current answer" (initial_draft at loop 0, or self_reflect from an earlier loop) strictly before `beforeLoop`. */
export async function getLatestAnswer(
  userId: number,
  committeeRunId: number,
  provider: ProviderId,
  beforeLoop: number,
): Promise<string | null> {
  const row = await queryOne<{ response_text: string }>(
    `SELECT response_text FROM committee_stage_calls
     WHERE user_id = ? AND committee_run_id = ? AND provider = ? AND status = 'success'
       AND stage IN ('initial_draft', 'self_reflect') AND loop_number < ?
     ORDER BY loop_number DESC, id DESC LIMIT 1`,
    [userId, committeeRunId, provider, beforeLoop],
  );
  return row?.response_text ?? null;
}

export interface LabeledAnswer {
  provider: ProviderId;
  model: string;
  text: string;
}

/**
 * Every active provider's latest successful current answer, one row per
 * provider (DISTINCT ON picks each provider's most recent). Pass
 * `excludeProvider: null` for the judge step (wants everyone); pass a
 * specific provider for cross-review (wants everyone ELSE).
 */
export async function getLatestAnswersExcept(
  userId: number,
  committeeRunId: number,
  excludeProvider: ProviderId | null,
  beforeLoop: number,
): Promise<LabeledAnswer[]> {
  const excludeClause = excludeProvider ? `AND provider != ?` : ``;
  const params = excludeProvider
    ? [userId, committeeRunId, excludeProvider, beforeLoop]
    : [userId, committeeRunId, beforeLoop];
  const rows = await queryAll<{ provider: ProviderId; model: string; response_text: string }>(
    `SELECT DISTINCT ON (provider) provider, model, response_text FROM committee_stage_calls
     WHERE user_id = ? AND committee_run_id = ? ${excludeClause} AND status = 'success'
       AND stage IN ('initial_draft', 'self_reflect') AND loop_number < ?
     ORDER BY provider, loop_number DESC, id DESC`,
    params,
  );
  return rows.map((r) => ({ provider: r.provider, model: r.model, text: r.response_text }));
}

/** Every other provider's cross-review text at this exact loop -- what a provider reads before self-reflecting. */
export async function getCrossReviewTexts(
  userId: number,
  committeeRunId: number,
  loopNumber: number,
  excludeProvider: ProviderId,
): Promise<string[]> {
  const rows = await queryAll<{ response_text: string }>(
    `SELECT response_text FROM committee_stage_calls
     WHERE user_id = ? AND committee_run_id = ? AND loop_number = ? AND stage = 'cross_review'
       AND status = 'success' AND provider != ?
     ORDER BY id ASC`,
    [userId, committeeRunId, loopNumber, excludeProvider],
  );
  return rows.map((r) => r.response_text);
}
