import { execute, queryAll, queryOne } from "../history/db";
import type { ProviderId } from "../config/types";

export interface WorkflowStep {
  provider: ProviderId;
  model: string;
  promptTemplate: string;
}

export interface NewWorkflowRow {
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowRow {
  id: number;
  name: string;
  steps: WorkflowStep[];
  createdAt: string;
}

function rowToWorkflowRow(r: Record<string, unknown>): WorkflowRow {
  return {
    id: r.id as number,
    name: r.name as string,
    steps: JSON.parse(r.steps_json as string) as WorkflowStep[],
    createdAt: r.created_at as string,
  };
}

export async function insertWorkflow(userId: number, row: NewWorkflowRow): Promise<WorkflowRow> {
  const createdAt = new Date().toISOString();
  const stepsJson = JSON.stringify(row.steps);
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO workflows (user_id, name, steps_json, created_at) VALUES (?, ?, ?, ?) RETURNING id`,
    [userId, row.name, stepsJson, createdAt],
  );
  return { id: inserted!.id, name: row.name, steps: row.steps, createdAt };
}

export async function getWorkflows(userId: number): Promise<WorkflowRow[]> {
  const rows = await queryAll(`SELECT * FROM workflows WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToWorkflowRow);
}

export async function getWorkflow(userId: number, id: number): Promise<WorkflowRow | null> {
  const row = await queryOne(`SELECT * FROM workflows WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToWorkflowRow(row) : null;
}

export async function deleteWorkflow(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM workflows WHERE id = ? AND user_id = ?`, [id, userId]);
}
