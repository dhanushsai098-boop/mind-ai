from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_workspace_role
from app.db.models import ActivityLog, File, ResourceShare, ResourceType, SharePermission, User, Workspace, WorkspaceRole
from app.db.session import get_db
from app.schemas.file import (
    PresignUploadRequest,
    PresignUploadResponse,
    FileCommitRequest,
    FileOut,
    FileMove,
    FileRename,
    ShareCreate,
    StorageUsageOut,
)
from app.services import storage

router = APIRouter(prefix="/api/workspaces/{workspace_id}/files", tags=["files"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024  # 5GB per file


def _log(db: Session, workspace_id: str, user_id: str, action: str, resource_id: str, name: str):
    db.add(
        ActivityLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            resource_type="file",
            resource_id=resource_id,
            resource_name=name,
        )
    )


@router.post("/presign-upload", response_model=PresignUploadResponse)
def presign_upload(
    workspace_id: str,
    payload: PresignUploadRequest,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    if payload.size_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File exceeds the 5GB upload limit")

    usage = _current_usage(db, workspace_id)
    workspace = db.get(Workspace, workspace_id)
    if usage + payload.size_bytes > workspace.storage_limit_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This upload would exceed your workspace storage limit")

    key = storage.build_storage_key(workspace_id, payload.filename)
    url = storage.presign_put(key, payload.content_type)
    return PresignUploadResponse(upload_url=url, storage_key=key, headers={"Content-Type": payload.content_type})


@router.post("", response_model=FileOut)
def commit_file(
    workspace_id: str,
    payload: FileCommitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    """Called by the frontend after the browser finishes uploading directly to R2."""
    file = File(
        workspace_id=workspace_id,
        folder_id=payload.folder_id,
        owner_id=user.id,
        name=payload.name,
        size_bytes=payload.size_bytes,
        mime_type=payload.content_type,
        storage_key=payload.storage_key,
        processing_status="pending",  # picked up by AI pipeline in Phase 3
    )
    db.add(file)
    db.flush()
    _log(db, workspace_id, user.id, "file.upload", file.id, file.name)
    db.commit()
    db.refresh(file)
    return file


@router.get("", response_model=list[FileOut])
def list_files(
    workspace_id: str,
    folder_id: str | None = None,
    view: str | None = None,  # "starred" | "recent" | "trash"
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    query = db.query(File).filter(File.workspace_id == workspace_id)

    if view == "trash":
        query = query.filter(File.trashed_at.isnot(None))
    else:
        query = query.filter(File.trashed_at.is_(None))
        if view == "starred":
            query = query.filter(File.starred.is_(True))
        elif view == "recent":
            query = query.order_by(File.updated_at.desc()).limit(50)
            return query.all()
        elif folder_id:
            query = query.filter(File.folder_id == folder_id)
        else:
            query = query.filter(File.folder_id.is_(None))

    return query.order_by(File.name).all()


@router.get("/{file_id}/download-url")
def get_download_url(
    workspace_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    file.last_accessed_at = datetime.now(timezone.utc)
    db.commit()
    url = storage.presign_get(file.storage_key, download_name=file.name)
    return {"url": url}


@router.patch("/{file_id}", response_model=FileOut)
def rename_file(
    workspace_id: str,
    file_id: str,
    payload: FileRename,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    file.name = payload.name
    _log(db, workspace_id, user.id, "file.rename", file.id, file.name)
    db.commit()
    db.refresh(file)
    return file


@router.patch("/{file_id}/move", response_model=FileOut)
def move_file(
    workspace_id: str,
    file_id: str,
    payload: FileMove,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    file.folder_id = payload.folder_id
    db.commit()
    db.refresh(file)
    return file


@router.post("/{file_id}/star", response_model=FileOut)
def toggle_star(
    workspace_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    file.starred = not file.starred
    db.commit()
    db.refresh(file)
    return file


@router.post("/{file_id}/trash", response_model=FileOut)
def trash_file(
    workspace_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    file.trashed_at = datetime.now(timezone.utc)
    _log(db, workspace_id, user.id, "file.trash", file.id, file.name)
    db.commit()
    db.refresh(file)
    return file


@router.post("/{file_id}/restore", response_model=FileOut)
def restore_file(
    workspace_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    file.trashed_at = None
    db.commit()
    db.refresh(file)
    return file


@router.delete("/{file_id}")
def delete_file_permanently(
    workspace_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    file = _get_file_or_404(db, workspace_id, file_id)
    storage.delete_object(file.storage_key)
    db.delete(file)
    db.commit()
    return {"ok": True}


@router.post("/share")
def share_resource(
    workspace_id: str,
    payload: ShareCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    shared_with = db.query(User).filter(User.email == payload.shared_with_email).first()
    share = ResourceShare(
        resource_type=ResourceType(payload.resource_type),
        resource_id=payload.resource_id,
        shared_by_id=user.id,
        shared_with_user_id=shared_with.id if shared_with else None,
        shared_with_email=payload.shared_with_email,
        permission=SharePermission(payload.permission),
    )
    db.add(share)
    db.commit()
    return {"ok": True, "notified": shared_with is not None}


@router.get("/shared-with-me", response_model=list[FileOut])
def shared_with_me(
    workspace_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    shares = (
        db.query(ResourceShare)
        .filter(ResourceShare.resource_type == ResourceType.file, ResourceShare.shared_with_user_id == user.id)
        .all()
    )
    file_ids = [s.resource_id for s in shares]
    if not file_ids:
        return []
    return db.query(File).filter(File.id.in_(file_ids)).all()


@router.get("/usage", response_model=StorageUsageOut)
def storage_usage(
    workspace_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    workspace = db.get(Workspace, workspace_id)
    used = _current_usage(db, workspace_id)
    count = db.query(File).filter(File.workspace_id == workspace_id, File.trashed_at.is_(None)).count()
    return StorageUsageOut(used_bytes=used, limit_bytes=workspace.storage_limit_bytes, file_count=count)


def _current_usage(db: Session, workspace_id: str) -> int:
    total = (
        db.query(func.coalesce(func.sum(File.size_bytes), 0))
        .filter(File.workspace_id == workspace_id, File.trashed_at.is_(None))
        .scalar()
    )
    return int(total or 0)


def _get_file_or_404(db: Session, workspace_id: str, file_id: str) -> File:
    file = db.query(File).filter(File.id == file_id, File.workspace_id == workspace_id).first()
    if not file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return file
