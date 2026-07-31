import { execute, queryAll, queryOne } from "../history/db";

export interface NewFileRow {
  filename: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface FileRow extends NewFileRow {
  id: number;
  createdAt: string;
}

function rowToFileRow(r: Record<string, unknown>): FileRow {
  return {
    id: r.id as number,
    filename: r.filename as string,
    mimeType: r.mime_type as string,
    size: r.size as number,
    path: r.path as string,
    createdAt: r.created_at as string,
  };
}

export async function insertFile(userId: number, row: NewFileRow): Promise<FileRow> {
  const createdAt = new Date().toISOString();
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO files (user_id, filename, mime_type, size, path, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [userId, row.filename, row.mimeType, row.size, row.path, createdAt],
  );
  return { id: inserted!.id, ...row, createdAt };
}

export async function getFiles(userId: number): Promise<FileRow[]> {
  const rows = await queryAll(`SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToFileRow);
}

export async function getFile(userId: number, id: number): Promise<FileRow | null> {
  const row = await queryOne(`SELECT * FROM files WHERE id = ? AND user_id = ?`, [id, userId]);
  return row ? rowToFileRow(row) : null;
}

export async function deleteFile(userId: number, id: number): Promise<FileRow | null> {
  const file = await getFile(userId, id);
  await execute(`DELETE FROM files WHERE id = ? AND user_id = ?`, [id, userId]);
  return file;
}
