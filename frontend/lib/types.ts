export interface UserOut {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface WorkspaceOut {
  id: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  storage_limit_bytes: number;
}

export interface MeOut {
  user: UserOut;
  workspaces: WorkspaceOut[];
}

export interface FolderOut {
  id: string;
  name: string;
  parent_id: string | null;
  starred: boolean;
  created_at: string;
  updated_at: string;
  type: "folder";
}

export interface FileOut {
  id: string;
  name: string;
  folder_id: string | null;
  size_bytes: number;
  mime_type: string;
  starred: boolean;
  processing_status: "pending" | "processing" | "ready" | "failed";
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  type: "file";
}

export type Item = FolderOut | FileOut;

export interface StorageUsageOut {
  used_bytes: number;
  limit_bytes: number;
  file_count: number;
}

export interface ActivityOut {
  id: string;
  action: string;
  resource_type: string;
  resource_name: string;
  created_at: string;
}

export interface DashboardOut {
  usage: StorageUsageOut;
  recent_files: FileOut[];
  starred_files: FileOut[];
  recent_activity: ActivityOut[];
}
