import { execute, queryAll, queryOne } from "../history/db";
import type { ProviderId } from "../config/types";

export type AgentCategory = "writing" | "code" | "research" | "translation" | "custom";

export interface NewAgentPresetRow {
  name: string;
  provider: ProviderId;
  model: string;
  systemPrompt: string | null;
  temperature: number;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  description: string | null;
  category: AgentCategory;
}

export interface AgentPresetRow extends NewAgentPresetRow {
  id: number;
  createdAt: string;
}

function rowToAgentPresetRow(r: Record<string, unknown>): AgentPresetRow {
  return {
    id: r.id as number,
    name: r.name as string,
    provider: r.provider as ProviderId,
    model: r.model as string,
    systemPrompt: r.system_prompt as string | null,
    temperature: r.temperature as number,
    effort: r.effort as "low" | "medium" | "high" | "xhigh" | "max",
    description: r.description as string | null,
    createdAt: r.created_at as string,
    category: (r.category as AgentCategory) ?? "custom",
  };
}

export async function insertAgentPreset(userId: number, row: NewAgentPresetRow): Promise<AgentPresetRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO agent_presets (user_id, name, provider, model, system_prompt, temperature, effort, description, created_at, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [userId, row.name, row.provider, row.model, row.systemPrompt, row.temperature, row.effort, row.description, createdAt, row.category],
  );
  return { id: inserted!.id, ...row, createdAt };
}

export async function getAgentPresets(userId: number): Promise<AgentPresetRow[]> {
  const rows = await queryAll(`SELECT * FROM agent_presets WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToAgentPresetRow);
}

export async function deleteAgentPreset(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM agent_presets WHERE id = ? AND user_id = ?`, [id, userId]);
}
