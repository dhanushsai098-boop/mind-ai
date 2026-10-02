"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Star, Clock, Activity as ActivityIcon } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ItemIcon } from "@/components/item-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import type { DashboardOut } from "@/lib/types";

export default function DashboardHomePage() {
  const { activeWorkspace, me } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardOut | null>(null);
  const [askInput, setAskInput] = useState("");

  useEffect(() => {
    if (!activeWorkspace) return;
    api.get<DashboardOut>(`/api/workspaces/${activeWorkspace.id}/dashboard`).then(setData).catch(() => setData(null));
  }, [activeWorkspace]);

  const firstName = me?.user.name.split(" ")[0];
  const usagePct = data ? (data.usage.used_bytes / data.usage.limit_bytes) * 100 : 0;

  return (
    <>
      <Topbar />
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-semibold">Good to see you, {firstName}.</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening in {activeWorkspace?.name}.</p>

        <div className="mt-5 rounded-lg border border-border bg-ai/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ai">
            <Sparkles className="h-4 w-4" /> Ask AI about your files
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder='Try “summarize my last uploaded report”'
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/assistant?q=${encodeURIComponent(askInput)}`)}
            />
            <Button variant="ai" onClick={() => router.push(`/dashboard/assistant?q=${encodeURIComponent(askInput)}`)}>
              Ask
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Storage</CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <>
                  <Progress value={usagePct} indicatorClassName={usagePct > 90 ? "bg-danger" : undefined} />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatBytes(data.usage.used_bytes)} of {formatBytes(data.usage.limit_bytes)} · {data.usage.file_count} files
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading\u2026</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick upload</CardTitle>
            </CardHeader>
            <CardContent>
              {activeWorkspace && (
                <UploadDropzone workspaceId={activeWorkspace.id} folderId={null} onUploaded={() => router.push("/dashboard/files")} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Star className="h-4 w-4" /> Starred
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.starred_files.length ? (
                data.starred_files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm">
                    <ItemIcon item={f} className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nothing starred yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Recent files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.recent_files.length ? (
                data.recent_files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <ItemIcon item={f} className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(f.updated_at)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No files yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <ActivityIcon className="h-4 w-4" /> Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.recent_activity.length ? (
                data.recent_activity.map((a) => (
                  <div key={a.id} className="text-sm">
                    <span className="text-muted-foreground">{describeAction(a.action)}</span>{" "}
                    <span className="font-medium">{a.resource_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function describeAction(action: string): string {
  const map: Record<string, string> = {
    "file.upload": "Uploaded",
    "file.rename": "Renamed",
    "file.trash": "Trashed",
    "folder.create": "Created folder",
    "folder.rename": "Renamed folder",
    "folder.trash": "Trashed folder",
  };
  return map[action] ?? action;
}
