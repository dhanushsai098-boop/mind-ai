"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ShareDialog({
  open,
  onOpenChange,
  fileName,
  onShare,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onShare: (email: string, permission: "view" | "edit") => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await onShare(email.trim(), permission);
      setEmail("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Share “{fileName}”</DialogTitle>
        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
          />
          <div className="flex gap-2">
            {(["view", "edit"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className={`rounded border px-3 py-1.5 text-sm capitalize ${
                  permission === p ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                }`}
              >
                Can {p}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading || !email.trim()}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
