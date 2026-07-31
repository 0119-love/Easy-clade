import { execute } from "./history/db";
import { resetConfig } from "./config/keysStore";

/** Danger zone: wipes every row belonging to the current user (not other accounts) plus their config (keys/budget/preferences). Irreversible. */
export async function resetAllData(userId: number): Promise<void> {
  await execute(`DELETE FROM runs WHERE user_id = ?`, [userId]);
  await execute(`DELETE FROM judge_runs WHERE user_id = ?`, [userId]);
  await execute(`DELETE FROM tasks WHERE user_id = ?`, [userId]);
  await execute(`DELETE FROM memory_entries WHERE user_id = ?`, [userId]);
  await execute(`DELETE FROM knowledge_items WHERE user_id = ?`, [userId]);
  await execute(`DELETE FROM agent_presets WHERE user_id = ?`, [userId]);
  await resetConfig(userId);
}
