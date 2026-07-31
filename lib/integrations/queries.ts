import { execute, queryAll, queryOne } from "../history/db";

export type IntegrationEventType = "run_complete" | "consensus_complete";

export interface NewIntegrationRow {
  name: string;
  webhookUrl: string;
  eventType: IntegrationEventType;
  enabled: boolean;
}

export interface IntegrationRow extends NewIntegrationRow {
  id: number;
  createdAt: string;
}

function rowToIntegrationRow(r: Record<string, unknown>): IntegrationRow {
  return {
    id: r.id as number,
    name: r.name as string,
    webhookUrl: r.webhook_url as string,
    eventType: r.event_type as IntegrationEventType,
    enabled: Boolean(r.enabled),
    createdAt: r.created_at as string,
  };
}

export async function insertIntegration(userId: number, row: NewIntegrationRow): Promise<IntegrationRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO integrations (user_id, name, webhook_url, event_type, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [userId, row.name, row.webhookUrl, row.eventType, row.enabled ? 1 : 0, createdAt],
  );
  return { id: inserted!.id, ...row, createdAt };
}

export async function getIntegrations(userId: number): Promise<IntegrationRow[]> {
  const rows = await queryAll(`SELECT * FROM integrations WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToIntegrationRow);
}

/** Used server-side by fireWebhooks() -- only this user's enabled integrations subscribed to this event. */
export async function getEnabledIntegrationsForEvent(userId: number, eventType: IntegrationEventType): Promise<IntegrationRow[]> {
  const rows = await queryAll(`SELECT * FROM integrations WHERE user_id = ? AND enabled = 1 AND event_type = ?`, [
    userId,
    eventType,
  ]);
  return rows.map(rowToIntegrationRow);
}

export async function setIntegrationEnabled(userId: number, id: number, enabled: boolean): Promise<void> {
  await execute(`UPDATE integrations SET enabled = ? WHERE id = ? AND user_id = ?`, [enabled ? 1 : 0, id, userId]);
}

export async function deleteIntegration(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM integrations WHERE id = ? AND user_id = ?`, [id, userId]);
}
