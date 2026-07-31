import { execute, queryAll, queryOne } from "../history/db";

export interface NewProjectRow {
  name: string;
  description: string | null;
}

export interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  archived: boolean;
  createdAt: string;
}

function rowToProjectRow(r: Record<string, unknown>): ProjectRow {
  return {
    id: r.id as number,
    name: r.name as string,
    description: r.description as string | null,
    archived: Boolean(r.archived),
    createdAt: r.created_at as string,
  };
}

export async function insertProject(userId: number, row: NewProjectRow): Promise<ProjectRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO projects (user_id, name, description, archived, created_at) VALUES (?, ?, ?, 0, ?) RETURNING id`,
    [userId, row.name, row.description, createdAt],
  );
  return {
    id: inserted!.id,
    name: row.name,
    description: row.description,
    archived: false,
    createdAt,
  };
}

export async function getProjects(userId: number, includeArchived = false): Promise<ProjectRow[]> {
  const sql = includeArchived
    ? `SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC`
    : `SELECT * FROM projects WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC`;
  const rows = await queryAll(sql, [userId]);
  return rows.map(rowToProjectRow);
}

export async function getProject(userId: number, id: number): Promise<ProjectRow | null> {
  const row = await queryOne(`SELECT * FROM projects WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToProjectRow(row) : null;
}

export async function setProjectArchived(userId: number, id: number, archived: boolean): Promise<void> {
  await execute(`UPDATE projects SET archived = ? WHERE id = ? AND user_id = ?`, [archived ? 1 : 0, id, userId]);
}

export async function deleteProject(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM projects WHERE id = ? AND user_id = ?`, [id, userId]);
}
