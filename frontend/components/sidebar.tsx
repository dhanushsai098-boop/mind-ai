"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Star,
  Clock,
  Trash2,
  Users,
  Brain,
  Bot,
  Workflow,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StorageUsageCard } from "@/components/storage-usage-card";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/files", label: "My Files", icon: FolderOpen },
  { href: "/dashboard/starred", label: "Starred", icon: Star },
  { href: "/dashboard/recent", label: "Recent", icon: Clock },
  { href: "/dashboard/shared", label: "Shared with me", icon: Users },
  { href: "/dashboard/trash", label: "Trash", icon: Trash2 },
];

const aiNav = [
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/agents", label: "Agents", icon: Sparkles },
  { href: "/dashboard/automation", label: "Automation", icon: Workflow },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-foreground">
          <Brain className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">Mind AI</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                active ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <p className="mb-1 mt-5 px-3 text-xs font-medium text-muted-foreground">AI Tools</p>
        {aiNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                active ? "bg-ai/10 text-ai" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <StorageUsageCard />
      </div>
    </aside>
  );
}
