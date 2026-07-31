import { execute, queryAll, queryOne } from "../history/db";

export interface NewMemoryRow {
  content: string;
  pinned: boolean;
}

export interface MemoryRow {
  id: number;
  content: string;
  pinned: boolean;
  createdAt: string;
}

function rowToMemoryRow(r: Record<string, unknown>): MemoryRow {
  return {
    id: r.id as number,
    content: r.content as string,
    pinned: Boolean(r.pinned),
    createdAt: r.created_at as string,
  };
}

export async function insertMemory(userId: number, row: NewMemoryRow): Promise<MemoryRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO memory_entries (user_id, content, pinned, created_at) VALUES (?, ?, ?, ?) RETURNING id`,
    [userId, row.content, row.pinned ? 1 : 0, createdAt],
  );
  return { id: inserted!.id, content: row.content, pinned: row.pinned, createdAt };
}

export async function getMemoryEntries(userId: number): Promise<MemoryRow[]> {
  const rows = await queryAll(`SELECT * FROM memory_entries WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToMemoryRow);
}

/** Used server-side by app/api/run/route.ts to prepend standing facts into every run's system prompt. */
export async function getPinnedMemoryEntries(userId: number): Promise<MemoryRow[]> {
  const rows = await queryAll(`SELECT * FROM memory_entries WHERE user_id = ? AND pinned = 1 ORDER BY created_at DESC`, [
    userId,
  ]);
  return rows.map(rowToMemoryRow);
}

export async function setMemoryPinned(userId: number, id: number, pinned: boolean): Promise<void> {
  await execute(`UPDATE memory_entries SET pinned = ? WHERE id = ? AND user_id = ?`, [pinned ? 1 : 0, id, userId]);
}

export async function deleteMemory(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM memory_entries WHERE id = ? AND user_id = ?`, [id, userId]);
}
