import { execute, queryAll, queryOne } from "../history/db";
import type { ProviderId } from "../config/types";

export type TriggerType = "manual" | "interval";
export type AutomationOutputType = "text" | "code";
export type AutomationCategory = "content" | "productivity" | "dev" | "custom";

export interface NewAutomationRow {
  name: string;
  promptTemplate: string;
  provider: ProviderId;
  model: string;
  triggerType: TriggerType;
  intervalMinutes: number | null;
  outputType: AutomationOutputType;
  filename: string | null;
  category: AutomationCategory;
}

export interface AutomationRow extends NewAutomationRow {
  id: number;
  lastRunAt: string | null;
  createdAt: string;
}

function rowToAutomationRow(r: Record<string, unknown>): AutomationRow {
  return {
    id: r.id as number,
    name: r.name as string,
    promptTemplate: r.prompt_template as string,
    provider: r.provider as ProviderId,
    model: r.model as string,
    triggerType: r.trigger_type as TriggerType,
    intervalMinutes: r.interval_minutes as number | null,
    lastRunAt: r.last_run_at as string | null,
    createdAt: r.created_at as string,
    outputType: (r.output_type as AutomationOutputType) ?? "text",
    filename: r.filename as string | null,
    category: (r.category as AutomationCategory) ?? "custom",
  };
}

export async function insertAutomation(userId: number, row: NewAutomationRow): Promise<AutomationRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO automations (user_id, name, prompt_template, provider, model, trigger_type, interval_minutes, last_run_at, created_at, output_type, filename, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
     RETURNING id`,
    [userId, row.name, row.promptTemplate, row.provider, row.model, row.triggerType, row.intervalMinutes, createdAt, row.outputType, row.filename, row.category],
  );
  return { id: inserted!.id, ...row, lastRunAt: null, createdAt };
}

export async function getAutomations(userId: number): Promise<AutomationRow[]> {
  const rows = await queryAll(`SELECT * FROM automations WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToAutomationRow);
}

export async function getAutomation(userId: number, id: number): Promise<AutomationRow | null> {
  const row = await queryOne(`SELECT * FROM automations WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToAutomationRow(row) : null;
}

export async function updateAutomationLastRun(userId: number, id: number, lastRunAt: string): Promise<void> {
  await execute(`UPDATE automations SET last_run_at = ? WHERE id = ? AND user_id = ?`, [lastRunAt, id, userId]);
}

export async function deleteAutomation(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM automations WHERE id = ? AND user_id = ?`, [id, userId]);
}
