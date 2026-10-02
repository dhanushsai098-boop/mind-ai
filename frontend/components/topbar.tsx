"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Sun, Moon, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

export function Topbar({ onUploadClick }: { onUploadClick?: () => void }) {
  const { me, activeWorkspace, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or meaning — try “declining sales reports”"
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = (e.target as HTMLInputElement).value;
              router.push(`/dashboard/search?q=${encodeURIComponent(value)}`);
            }
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {onUploadClick && (
          <Button size="sm" onClick={onUploadClick}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        )}

        <Button size="icon" variant="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full">
              <Avatar name={me?.user.name ?? "?"} src={me?.user.avatar_url} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium">{me?.user.name}</p>
              <p className="text-xs text-muted-foreground">{me?.user.email}</p>
              {activeWorkspace && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Workspace: {activeWorkspace.name} · {activeWorkspace.role}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
