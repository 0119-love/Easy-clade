import { queryAll } from "../history/db";
import { BRAIN_REGIONS, type BrainRegionId } from "./regions";

export type BrainGraphNodeKind = "hub" | "leaf";

export interface BrainGraphNode {
  id: string;
  kind: BrainGraphNodeKind;
  region: BrainRegionId;
  label: string;
}

export interface BrainGraphEdge {
  source: string;
  target: string;
}

export interface BrainGraphSnapshot {
  nodes: BrainGraphNode[];
  edges: BrainGraphEdge[];
}

/** Most recent N rows per domain -- keeps the force layout legible instead of dumping a user's entire history on screen. */
const LEAF_LIMIT = 15;

function truncate(text: string, max = 26): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed || "(제목 없음)";
}

/**
 * Obsidian-style entity graph: one hub node per real subsystem (same 8
 * regions/colors as the Pulse view), each hub's actual rows as leaves, plus
 * the few real foreign-key relationships this schema has -- a run under its
 * project instead of under the generic "runs" hub, and a task under its
 * source run. Everything else is genuinely unlinked in this schema (memory
 * entries, workflows, automations, integrations carry no project_id), so
 * those clusters legitimately float on their own, same as the isolated
 * clusters in a real Obsidian graph.
 */
export async function getBrainGraph(userId: number): Promise<BrainGraphSnapshot> {
  const [committeeRuns, automations, memoryEntries, workflows, tasks, projects, unassignedRuns, projectRuns, integrations] =
    await Promise.all([
      queryAll<{ id: number; mission: string }>(
        `SELECT id, mission FROM committee_runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
        [userId, LEAF_LIMIT],
      ),
      queryAll<{ id: number; name: string }>(`SELECT id, name FROM automations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [
        userId,
        LEAF_LIMIT,
      ]),
      queryAll<{ id: number; content: string }>(
        `SELECT id, content FROM memory_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, LEAF_LIMIT],
      ),
      queryAll<{ id: number; name: string }>(`SELECT id, name FROM workflows WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [
        userId,
        LEAF_LIMIT,
      ]),
      queryAll<{ id: number; title: string; source_run_id: number | null }>(
        `SELECT id, title, source_run_id FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, LEAF_LIMIT],
      ),
      queryAll<{ id: number; name: string }>(
        `SELECT id, name FROM projects WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC LIMIT ?`,
        [userId, LEAF_LIMIT],
      ),
      queryAll<{ id: number; provider: string; model: string }>(
        `SELECT id, provider, model FROM runs WHERE user_id = ? AND project_id IS NULL ORDER BY started_at DESC LIMIT ?`,
        [userId, LEAF_LIMIT],
      ),
      queryAll<{ id: number; provider: string; model: string; project_id: number }>(
        `SELECT id, provider, model, project_id FROM runs WHERE user_id = ? AND project_id IS NOT NULL ORDER BY started_at DESC LIMIT ?`,
        [userId, LEAF_LIMIT * 3],
      ),
      queryAll<{ id: number; name: string }>(`SELECT id, name FROM integrations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [
        userId,
        LEAF_LIMIT,
      ]),
    ]);

  const nodes: BrainGraphNode[] = BRAIN_REGIONS.map((r) => ({ id: `hub:${r.id}`, kind: "hub", region: r.id, label: r.label }));
  const edges: BrainGraphEdge[] = [];
  const runNodeId = new Map<number, string>();

  function addLeaf(region: BrainRegionId, id: number, label: string, hubId = `hub:${region}`) {
    const nodeId = `${region}:${id}`;
    nodes.push({ id: nodeId, kind: "leaf", region, label });
    edges.push({ source: hubId, target: nodeId });
    return nodeId;
  }

  for (const row of committeeRuns) addLeaf("committee", row.id, truncate(row.mission));
  for (const row of automations) addLeaf("automations", row.id, truncate(row.name));
  for (const row of memoryEntries) addLeaf("memory", row.id, truncate(row.content));
  for (const row of workflows) addLeaf("workflows", row.id, truncate(row.name));
  for (const row of integrations) addLeaf("integrations", row.id, truncate(row.name));

  for (const row of unassignedRuns) {
    const nodeId = addLeaf("runs", row.id, truncate(`${row.provider}/${row.model}`));
    runNodeId.set(row.id, nodeId);
  }

  const projectNodeId = new Map<number, string>();
  for (const row of projects) projectNodeId.set(row.id, addLeaf("projects", row.id, truncate(row.name)));

  for (const row of projectRuns) {
    const projectHub = projectNodeId.get(row.project_id);
    if (!projectHub) continue; // project itself fell outside LEAF_LIMIT or is archived -- skip its overflow runs too
    const nodeId = addLeaf("runs", row.id, truncate(`${row.provider}/${row.model}`), projectHub);
    runNodeId.set(row.id, nodeId);
  }

  for (const row of tasks) {
    const nodeId = addLeaf("tasks", row.id, truncate(row.title));
    const sourceRunNode = row.source_run_id != null ? runNodeId.get(row.source_run_id) : undefined;
    if (sourceRunNode) edges.push({ source: sourceRunNode, target: nodeId });
  }

  return { nodes, edges };
}
