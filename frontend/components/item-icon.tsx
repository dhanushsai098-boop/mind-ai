import { FileText, FileSpreadsheet, FileImage, File as FileIcon, Folder } from "lucide-react";
import type { Item } from "@/lib/types";

export function ItemIcon({ item, className }: { item: Item; className?: string }) {
  if (item.type === "folder") return <Folder className={className} />;

  const mime = item.mime_type;
  if (mime.includes("pdf") || mime.includes("word") || mime === "text/plain")
    return <FileText className={className} />;
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel"))
    return <FileSpreadsheet className={className} />;
  if (mime.startsWith("image/")) return <FileImage className={className} />;
  return <FileIcon className={className} />;
}
