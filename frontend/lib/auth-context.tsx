"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import type { MeOut, WorkspaceOut } from "./types";

interface AuthContextValue {
  me: MeOut | null;
  activeWorkspace: WorkspaceOut | null;
  setActiveWorkspaceId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeOut | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<MeOut>("/api/auth/me");
      setMe(data);
      setActiveWorkspaceIdState((prev) => prev ?? data.workspaces[0]?.id ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setMe(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setMe(null);
  }, []);

  const activeWorkspace = useMemo(
    () => me?.workspaces.find((w) => w.id === activeWorkspaceId) ?? me?.workspaces[0] ?? null,
    [me, activeWorkspaceId]
  );

  return (
    <AuthContext.Provider
      value={{
        me,
        activeWorkspace,
        setActiveWorkspaceId: setActiveWorkspaceIdState,
        loading,
        refresh: load,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
