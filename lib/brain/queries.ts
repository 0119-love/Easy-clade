import { queryOne } from "../history/db";
import { localMidnightIso } from "../history/queries";
import { BRAIN_REGIONS, type BrainRegionId } from "./regions";

export interface BrainRegionSnapshot {
  id: BrainRegionId;
  /** Rows whose activity timestamp falls in the last 5 minutes -- drives the "firing %" pulse. */
  recentCount: number;
  /** Rows active today -- drives node size. */
  todayCount: number;
}

async function count(sql: string, params: unknown[]): Promise<number> {
  const row = await queryOne<{ n: number }>(sql, params);
  return Number(row?.n ?? 0);
}

/**
 * One real count pair per region, each against the timestamp column that
 * domain actually has. Several domains (workflows, integrations) have no
 * persisted execution log -- only a creation/config timestamp -- so their
 * "recent" signal is a documented proxy (recent edits / enabled count)
 * rather than a fabricated firing rate.
 */
export async function getBrainSnapshot(userId: number): Promise<BrainRegionSnapshot[]> {
  const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const todayStartIso = localMidnightIso();

  const [
    committeeRecent,
    committeeToday,
    automationsRecent,
    automationsToday,
    memoryRecent,
    memoryToday,
    workflowsRecent,
    workflowsToday,
    tasksRecent,
    tasksToday,
    projectsRecent,
    projectsToday,
    runsRecent,
    runsToday,
    integrationsEnabled,
  ] = await Promise.all([
    count(`SELECT COUNT(*) AS n FROM committee_runs WHERE user_id = ? AND started_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM committee_runs WHERE user_id = ? AND started_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM automations WHERE user_id = ? AND last_run_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM automations WHERE user_id = ? AND last_run_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM memory_entries WHERE user_id = ? AND created_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM memory_entries WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM workflows WHERE user_id = ? AND created_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM workflows WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND created_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(
      `SELECT COUNT(DISTINCT project_id) AS n FROM runs WHERE user_id = ? AND project_id IS NOT NULL AND started_at >= ?`,
      [userId, sinceIso],
    ),
    count(`SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND created_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND started_at >= ?`, [userId, sinceIso]),
    count(`SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND started_at >= ?`, [userId, todayStartIso]),
    count(`SELECT COUNT(*) AS n FROM integrations WHERE user_id = ? AND enabled = 1`, [userId]),
  ]);

  const byId: Record<BrainRegionId, BrainRegionSnapshot> = {
    committee: { id: "committee", recentCount: committeeRecent, todayCount: committeeToday },
    automations: { id: "automations", recentCount: automationsRecent, todayCount: automationsToday },
    memory: { id: "memory", recentCount: memoryRecent, todayCount: memoryToday },
    workflows: { id: "workflows", recentCount: workflowsRecent, todayCount: workflowsToday },
    tasks: { id: "tasks", recentCount: tasksRecent, todayCount: tasksToday },
    projects: { id: "projects", recentCount: projectsRecent, todayCount: projectsToday },
    runs: { id: "runs", recentCount: runsRecent, todayCount: runsToday },
    // No persisted firing log for webhooks -- recentCount is pinned to 0;
    // todayCount instead conveys capacity (how many integrations are live).
    integrations: { id: "integrations", recentCount: 0, todayCount: integrationsEnabled },
  };

  return BRAIN_REGIONS.map((region) => byId[region.id]);
}
