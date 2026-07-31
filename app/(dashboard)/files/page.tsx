"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteFileRemote, fetchFiles, fileUrl, formatFileSize, isImageMime, uploadFile } from "@/lib/files/client";

export default function FilesPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["files"], queryFn: fetchFiles });
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["files"] });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile(file);
      refresh();
      toast.success("파일이 업로드되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteFileRemote(id);
      refresh();
      toast.success("파일이 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "파일을 삭제하지 못했습니다.");
    }
  }

  const files = data?.files ?? [];

  return (
    <div className="max-w-2xl space-y-8 px-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">파일</h1>
        <p className="text-sm text-text-secondary">
          업로드한 이미지는 실행 화면의 작성 창에서 모델에게 실제로 첨부해 보낼 수 있습니다. 이미지가 아닌 파일은
          보관·다운로드만 지원하며 모델에 전달되지 않습니다.
        </p>
      </div>

      <Card className="p-4">
        <input ref={inputRef} type="file" onChange={(e) => void handleFileChange(e)} className="hidden" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="size-3.5" /> {uploading ? "업로드 중..." : "파일 업로드"}
        </Button>
      </Card>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-text-secondary">아직 업로드된 파일이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="glass-chip flex items-center gap-3 rounded-lg px-4 py-3">
              {isImageMime(file.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element -- local file server route, not a static asset
                <img src={fileUrl(file.id)} alt={file.filename} className="size-10 rounded object-cover" />
              ) : (
                <FileText className="size-6 shrink-0 text-text-secondary" />
              )}
              <div className="flex-1 space-y-0.5">
                <div className="text-sm text-foreground">{file.filename}</div>
                <div className="text-xs text-text-secondary">{formatFileSize(file.size)}</div>
              </div>
              <a
                href={fileUrl(file.id)}
                target="_blank"
                rel="noreferrer"
                className="text-text-secondary hover:text-foreground"
              >
                <Download className="size-3.5" />
              </a>
              <button
                type="button"
                onClick={() => void handleDelete(file.id)}
                className="text-text-secondary hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
