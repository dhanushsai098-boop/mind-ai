"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { StorageUsageOut } from "@/lib/types";

export function StorageUsageCard() {
  const { activeWorkspace } = useAuth();
  const [usage, setUsage] = useState<StorageUsageOut | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    api
      .get<StorageUsageOut>(`/api/workspaces/${activeWorkspace.id}/files/usage`)
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [activeWorkspace]);

  if (!usage) return null;

  const pct = usage.limit_bytes > 0 ? (usage.used_bytes / usage.limit_bytes) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <HardDrive className="h-3.5 w-3.5" />
        Storage
      </div>
      <Progress value={pct} indicatorClassName={pct > 90 ? "bg-danger" : undefined} />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {formatBytes(usage.used_bytes)} of {formatBytes(usage.limit_bytes)} used
      </p>
    </div>
  );
}
