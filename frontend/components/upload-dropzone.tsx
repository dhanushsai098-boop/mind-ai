"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileUp, X } from "lucide-react";
import { api, uploadToPresignedUrl } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { FileOut } from "@/lib/types";

interface UploadTask {
  id: string;
  name: string;
  progress: "uploading" | "processing" | "done" | "error";
  size: number;
}

interface PresignUploadResponse2 {
  upload_url: string;
  storage_key: string;
  headers: Record<string, string>;
}

export function UploadDropzone({
  workspaceId,
  folderId,
  onUploaded,
  compact,
}: {
  workspaceId: string;
  folderId: string | null;
  onUploaded: (file: FileOut) => void;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(
    async (file: File) => {
      const taskId = `${file.name}-${Date.now()}`;
      setTasks((prev) => [...prev, { id: taskId, name: file.name, progress: "uploading", size: file.size }]);

      try {
        const presign = await api.post<PresignUploadResponse2>(
          `/api/workspaces/${workspaceId}/files/presign-upload`,
          {
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            folder_id: folderId,
          }
        );

        await uploadToPresignedUrl(presign.upload_url, file, file.type || "application/octet-stream");

        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: "processing" } : t)));

        const committed = await api.post<FileOut>(`/api/workspaces/${workspaceId}/files`, {
          storage_key: presign.storage_key,
          name: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          folder_id: folderId,
        });

        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: "done" } : t)));
        onUploaded(committed);
        setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== taskId)), 2000);
      } catch (err) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: "error" } : t)));
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Please try again",
          variant: "error",
        });
      }
    },
    [workspaceId, folderId, onUploaded, toast]
  );

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach(uploadFile);
  }

  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-accent hover:text-accent"
        >
          <FileUp className="h-4 w-4" /> Upload files
        </button>
        <UploadProgressList tasks={tasks} />
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
        dragging ? "border-accent bg-accent/5" : "border-border"
      }`}
    >
      <UploadCloud className={`h-8 w-8 ${dragging ? "text-accent" : "text-muted-foreground"}`} />
      <p className="mt-3 text-sm font-medium">Drag and drop files here</p>
      <p className="mt-1 text-xs text-muted-foreground">or</p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button onClick={() => inputRef.current?.click()} className="mt-2 text-sm font-medium text-accent hover:underline">
        Browse your device
      </button>
      <UploadProgressList tasks={tasks} />
    </div>
  );
}

function UploadProgressList({ tasks }: { tasks: UploadTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="mt-4 w-full max-w-sm space-y-1.5 text-left">
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="truncate">{t.name}</span>
          <span className="ml-2 shrink-0 text-muted-foreground">
            {t.progress === "uploading" && "Uploading\u2026"}
            {t.progress === "processing" && "Saving\u2026"}
            {t.progress === "done" && "Done"}
            {t.progress === "error" && <span className="text-danger">Failed</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
