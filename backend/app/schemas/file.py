from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FolderCreate(BaseModel):
    name: str
    parent_id: str | None = None


class FolderRename(BaseModel):
    name: str


class FolderMove(BaseModel):
    parent_id: str | None = None


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    parent_id: str | None
    starred: bool
    created_at: datetime
    updated_at: datetime
    type: str = "folder"


class PresignUploadRequest(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    folder_id: str | None = None


class PresignUploadResponse(BaseModel):
    upload_url: str
    storage_key: str
    method: str = "PUT"
    headers: dict[str, str] = {}


class FileCommitRequest(BaseModel):
    storage_key: str
    name: str
    content_type: str
    size_bytes: int
    folder_id: str | None = None


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    folder_id: str | None
    size_bytes: int
    mime_type: str
    starred: bool
    processing_status: str
    ai_summary: str | None = None
    created_at: datetime
    updated_at: datetime
    type: str = "file"


class FileMove(BaseModel):
    folder_id: str | None = None


class FileRename(BaseModel):
    name: str


class ShareCreate(BaseModel):
    resource_type: str  # "file" | "folder"
    resource_id: str
    shared_with_email: str
    permission: str = "view"


class StorageUsageOut(BaseModel):
    used_bytes: int
    limit_bytes: int
    file_count: int
