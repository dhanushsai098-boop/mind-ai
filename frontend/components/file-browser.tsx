"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Grid2x2, List, FolderPlus, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItemIcon } from "@/components/item-icon";
import { FileRowMenu } from "@/components/file-row-menu";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { UploadDropzone } from "@/components/upload-dropzone";
import { api } from "@/lib/api";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import type { FileOut, FolderOut, Item } from "@/lib/types";

type ViewKind = "files" | "starred" | "recent" | "trash" | "shared";

export function FileBrowser({ view }: { view: ViewKind }) {
  const { activeWorkspace } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderId = view === "files" ? searchParams.get("folder") : null;
  const { toast } = useToast();

  const [folders, setFolders] = useState<FolderOut[]>([]);
  const [files, setFiles] = useState<FileOut[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<FolderOut[]>([]);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Item | null>(null);
  const [shareTarget, setShareTarget] = useState<FileOut | null>(null);

  const wsId = activeWorkspace?.id;

  const load = useCallback(async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      if (view === "files") {
        const [f, folderList] = await Promise.all([
          api.get<FileOut[]>(`/api/workspaces/${wsId}/files?${currentFolderId ? `folder_id=${currentFolderId}` : ""}`),
          api.get<FolderOut[]>(`/api/workspaces/${wsId}/folders?${currentFolderId ? `parent_id=${currentFolderId}` : ""}`),
        ]);
        setFiles(f);
        setFolders(folderList);
      } else if (view === "shared") {
        const f = await api.get<FileOut[]>(`/api/workspaces/${wsId}/files/shared-with-me`);
        setFiles(f);
        setFolders([]);
      } else {
        const f = await api.get<FileOut[]>(`/api/workspaces/${wsId}/files?view=${view}`);
        setFiles(f);
        setFolders([]);
      }
    } catch {
      toast({ title: "Couldn't load files", description: "Check that the backend is running.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [wsId, view, currentFolderId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!wsId || view !== "files") return;
    if (!currentFolderId) {
      setBreadcrumb([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const chain: FolderOut[] = [];
      let id: string | null = currentFolderId;
      while (id) {
        try {
          const folder: FolderOut = await api.get<FolderOut>(`/api/workspaces/${wsId}/folders/${id}`);
          chain.unshift(folder);
          id = folder.parent_id;
        } catch {
          break;
        }
      }
      if (!cancelled) setBreadcrumb(chain);
    })();
    return () => {
      cancelled = true;
    };
  }, [wsId, view, currentFolderId]);

  if (!wsId) return null;

  const items: Item[] = view === "files" ? [...folders, ...files] : files;
  const isEmpty = !loading && items.length === 0;

  async function handleCreateFolder(name: string) {
    const folder = await api.post<FolderOut>(`/api/workspaces/${wsId}/folders`, {
      name,
      parent_id: currentFolderId,
    });
    setFolders((prev) => [...prev, folder]);
  }

  async function handleToggleStar(item: Item) {
    const path = item.type === "folder" ? "folders" : "files";
    await api.post(`/api/workspaces/${wsId}/${path}/${item.id}/star`);
    load();
  }

  async function handleTrash(item: Item) {
    const path = item.type === "folder" ? "folders" : "files";
    await api.post(`/api/workspaces/${wsId}/${path}/${item.id}/trash`);
    toast({ title: `${item.type === "folder" ? "Folder" : "File"} moved to trash`, variant: "success" });
    load();
  }

  async function handleRestore(item: Item) {
    const path = item.type === "folder" ? "folders" : "files";
    await api.post(`/api/workspaces/${wsId}/${path}/${item.id}/restore`);
    toast({ title: "Restored", variant: "success" });
    load();
  }

  async function handleDeleteForever(item: Item) {
    const path = item.type === "folder" ? "folders" : "files";
    await api.delete(`/api/workspaces/${wsId}/${path}/${item.id}`);
    toast({ title: "Deleted permanently", variant: "success" });
    load();
  }

  async function handleRename(item: Item, name: string) {
    const path = item.type === "folder" ? "folders" : "files";
    await api.patch(`/api/workspaces/${wsId}/${path}/${item.id}`, { name });
    load();
  }

  async function handleDownload(file: FileOut) {
    const { url } = await api.get<{ url: string }>(`/api/workspaces/${wsId}/files/${file.id}/download-url`);
    window.open(url, "_blank");
  }

  async function handleShare(email: string, permission: "view" | "edit") {
    if (!shareTarget) return;
    await api.post(`/api/workspaces/${wsId}/files/share`, {
      resource_type: "file",
      resource_id: shareTarget.id,
      shared_with_email: email,
      permission,
    });
    toast({ title: "Shared", description: `${shareTarget.name} shared with ${email}`, variant: "success" });
  }

  function openItem(item: Item) {
    if (item.type === "folder") {
      router.push(`/dashboard/files?folder=${item.id}`);
    } else {
      handleDownload(item);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex flex-1 items-center gap-1 text-sm text-muted-foreground">
          {view === "files" && (
            <>
              <button onClick={() => router.push("/dashboard/files")} className="hover:text-foreground">
                My Files
              </button>
              {breadcrumb.map((b) => (
                <span key={b.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button onClick={() => router.push(`/dashboard/files?folder=${b.id}`)} className="hover:text-foreground">
                    {b.name}
                  </button>
                </span>
              ))}
            </>
          )}
          {view !== "files" && <span className="capitalize text-foreground">{view === "shared" ? "Shared with me" : view}</span>}
        </div>

        {view === "files" && (
          <>
            <UploadDropzone workspaceId={wsId} folderId={currentFolderId} onUploaded={() => load()} compact />
            <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-4 w-4" /> New folder
            </Button>
          </>
        )}

        <div className="flex items-center rounded border border-border">
          <button
            onClick={() => setLayout("grid")}
            className={cn("p-1.5", layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground")}
          >
            <Grid2x2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={cn("p-1.5", layout === "list" ? "bg-muted text-foreground" : "text-muted-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {view === "files" && !currentFolderId && (
          <div className="mb-6">
            <UploadDropzone workspaceId={wsId} folderId={null} onUploaded={() => load()} />
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Nothing here yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {view === "files" ? "Upload a file or create a folder to get started." : "Items will show up here once you have some."}
            </p>
          </div>
        )}

        {!isEmpty && layout === "grid" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => openItem(item)}
                className="group relative flex cursor-pointer flex-col rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent/40"
              >
                <div className="absolute right-2 top-2">
                  <FileRowMenu
                    item={item}
                    trashed={view === "trash"}
                    onRename={() => setRenameTarget(item)}
                    onShare={item.type === "file" ? () => setShareTarget(item) : undefined}
                    onToggleStar={() => handleToggleStar(item)}
                    onDownload={item.type === "file" ? () => handleDownload(item) : undefined}
                    onTrash={() => handleTrash(item)}
                    onRestore={() => handleRestore(item)}
                    onDeleteForever={() => handleDeleteForever(item)}
                  />
                </div>
                <ItemIcon item={item} className={cn("h-8 w-8", item.type === "folder" ? "text-accent" : "text-muted-foreground")} />
                <p className="mt-2 truncate text-sm font-medium">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.type === "file" ? formatBytes(item.size_bytes) : "Folder"}
                </p>
                {item.type === "file" && item.processing_status !== "ready" && (
                  <Badge variant="ai" className="mt-2 w-fit">
                    {item.processing_status === "pending" ? "AI analysis queued" : "Analyzing\u2026"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {!isEmpty && layout === "list" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Size</th>
                <th className="pb-2 font-medium">Updated</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => openItem(item)} className="group cursor-pointer border-b border-border/60 hover:bg-muted/40">
                  <td className="flex items-center gap-2.5 py-2.5">
                    <ItemIcon item={item} className={cn("h-4 w-4", item.type === "folder" ? "text-accent" : "text-muted-foreground")} />
                    {item.name}
                    {item.starred && <span className="text-xs text-accent">\u2605</span>}
                  </td>
                  <td className="py-2.5 text-muted-foreground">{item.type === "file" ? formatBytes(item.size_bytes) : "\u2014"}</td>
                  <td className="py-2.5 text-muted-foreground">{formatRelativeTime(item.updated_at)}</td>
                  <td className="py-2.5 text-right">
                    <FileRowMenu
                      item={item}
                      trashed={view === "trash"}
                      onRename={() => setRenameTarget(item)}
                      onShare={item.type === "file" ? () => setShareTarget(item) : undefined}
                      onToggleStar={() => handleToggleStar(item)}
                      onDownload={item.type === "file" ? () => handleDownload(item) : undefined}
                      onTrash={() => handleTrash(item)}
                      onRestore={() => handleRestore(item)}
                      onDeleteForever={() => handleDeleteForever(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewFolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} onCreate={handleCreateFolder} />
      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(o) => !o && setRenameTarget(null)}
          initialName={renameTarget.name}
          onRename={(name) => handleRename(renameTarget, name)}
        />
      )}
      {shareTarget && (
        <ShareDialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)} fileName={shareTarget.name} onShare={handleShare} />
      )}
    </div>
  );
}
