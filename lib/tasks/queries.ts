import { execute, queryAll, queryOne } from "../history/db";

export interface NewTaskRow {
  title: string;
  sourceRunId: number | null;
}

export interface TaskRow {
  id: number;
  title: string;
  done: boolean;
  sourceRunId: number | null;
  createdAt: string;
}

function rowToTaskRow(r: Record<string, unknown>): TaskRow {
  return {
    id: r.id as number,
    title: r.title as string,
    done: Boolean(r.done),
    sourceRunId: r.source_run_id as number | null,
    createdAt: r.created_at as string,
  };
}

export async function insertTask(userId: number, row: NewTaskRow): Promise<TaskRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO tasks (user_id, title, done, source_run_id, created_at) VALUES (?, ?, 0, ?, ?) RETURNING id`,
    [userId, row.title, row.sourceRunId, createdAt],
  );
  return {
    id: inserted!.id,
    title: row.title,
    done: false,
    sourceRunId: row.sourceRunId,
    createdAt,
  };
}

export async function getTasks(userId: number): Promise<TaskRow[]> {
  const rows = await queryAll(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToTaskRow);
}

export async function setTaskDone(userId: number, id: number, done: boolean): Promise<void> {
  await execute(`UPDATE tasks SET done = ? WHERE id = ? AND user_id = ?`, [done ? 1 : 0, id, userId]);
}

export async function deleteTask(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM tasks WHERE id = ? AND user_id = ?`, [id, userId]);
}
