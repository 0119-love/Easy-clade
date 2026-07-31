import { put, del } from "@vercel/blob";

/**
 * Persists an uploaded/generated file to Vercel Blob and returns its public
 * URL -- stored as-is in files.path (see lib/history/db.ts's comment on that
 * column). Replaces the old local-disk write (fs.writeFileSync into
 * ~/.ai-command-center/files), which doesn't survive across serverless
 * invocations on Vercel.
 */
export async function storeFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  const storedName = `${crypto.randomUUID()}-${filename}`;
  const blob = await put(storedName, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}

/** Best-effort delete -- a blob already gone (or an id that never resolved to one) isn't fatal, the DB row removal is what matters. */
export async function deleteStoredFile(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // already gone, or not a real blob URL -- nothing more to do
  }
}
