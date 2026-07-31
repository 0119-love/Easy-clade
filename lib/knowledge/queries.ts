import { execute, queryAll, queryOne } from "../history/db";

export interface NewKnowledgeRow {
  title: string;
  content: string;
}

export interface KnowledgeRow {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

function rowToKnowledgeRow(r: Record<string, unknown>): KnowledgeRow {
  return {
    id: r.id as number,
    title: r.title as string,
    content: r.content as string,
    createdAt: r.created_at as string,
  };
}

export async function insertKnowledge(userId: number, row: NewKnowledgeRow): Promise<KnowledgeRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO knowledge_items (user_id, title, content, created_at) VALUES (?, ?, ?, ?) RETURNING id`,
    [userId, row.title, row.content, createdAt],
  );
  return { id: inserted!.id, title: row.title, content: row.content, createdAt };
}

/** Simple substring search over title/content -- no embeddings/vector search. ILIKE (not LIKE) to match SQLite's default case-insensitive LIKE behavior. */
export async function getKnowledgeItems(userId: number, search?: string): Promise<KnowledgeRow[]> {
  if (search?.trim()) {
    const like = `%${search.trim()}%`;
    const rows = await queryAll(
      `SELECT * FROM knowledge_items WHERE user_id = ? AND (title ILIKE ? OR content ILIKE ?) ORDER BY created_at DESC`,
      [userId, like, like],
    );
    return rows.map(rowToKnowledgeRow);
  }
  const rows = await queryAll(`SELECT * FROM knowledge_items WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToKnowledgeRow);
}

export async function deleteKnowledge(userId: number, id: number): Promise<void> {
  await execute(`DELETE FROM knowledge_items WHERE id = ? AND user_id = ?`, [id, userId]);
}
