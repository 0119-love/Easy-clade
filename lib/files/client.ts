import type { FileRow } from "@/lib/files/queries";

export type { FileRow };

export async function fetchFiles(): Promise<{ files: FileRow[] }> {
  const res = await fetch("/api/files");
  if (!res.ok) throw new Error("파일 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function uploadFile(file: File): Promise<FileRow> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/files", { method: "POST", body: formData });
  if (!res.ok) throw new Error("파일 업로드에 실패했습니다.");
  const data = (await res.json()) as { file: FileRow };
  return data.file;
}

export async function deleteFileRemote(id: number): Promise<void> {
  const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("파일을 삭제하지 못했습니다.");
}

export function fileUrl(id: number): string {
  return `/api/files/${id}`;
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
