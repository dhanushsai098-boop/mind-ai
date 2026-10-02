"use client";

import { MoreHorizontal, Star, Download, Share2, Pencil, Trash2, RotateCcw, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Item } from "@/lib/types";

interface Props {
  item: Item;
  trashed?: boolean;
  onRename: () => void;
  onShare?: () => void;
  onToggleStar: () => void;
  onDownload?: () => void;
  onTrash: () => void;
  onRestore?: () => void;
  onDeleteForever?: () => void;
}

export function FileRowMenu({ item, trashed, onRename, onShare, onToggleStar, onDownload, onTrash, onRestore, onDeleteForever }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded p-1.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {!trashed ? (
          <>
            {item.type === "file" && onDownload && (
              <DropdownMenuItem onSelect={onDownload}>
                <Download className="h-4 w-4" /> Download
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onToggleStar}>
              <Star className="h-4 w-4" /> {item.starred ? "Remove star" : "Add star"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>
              <Pencil className="h-4 w-4" /> Rename
            </DropdownMenuItem>
            {item.type === "file" && onShare && (
              <DropdownMenuItem onSelect={onShare}>
                <Share2 className="h-4 w-4" /> Share
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onTrash} className="text-danger">
              <Trash2 className="h-4 w-4" /> Move to trash
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={onRestore}>
              <RotateCcw className="h-4 w-4" /> Restore
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDeleteForever} className="text-danger">
              <XCircle className="h-4 w-4" /> Delete forever
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
