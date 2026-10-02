from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_workspace_role
from app.db.models import ActivityLog, File, Folder, User, WorkspaceRole
from app.db.session import get_db
from app.schemas.file import FolderCreate, FolderRename, FolderMove, FolderOut

router = APIRouter(prefix="/api/workspaces/{workspace_id}/folders", tags=["folders"])


def _log(db: Session, workspace_id: str, user_id: str, action: str, resource_id: str, name: str):
    db.add(
        ActivityLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            resource_type="folder",
            resource_id=resource_id,
            resource_name=name,
        )
    )


@router.post("", response_model=FolderOut)
def create_folder(
    workspace_id: str,
    payload: FolderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    folder = Folder(workspace_id=workspace_id, parent_id=payload.parent_id, name=payload.name, created_by=user.id)
    db.add(folder)
    db.flush()
    _log(db, workspace_id, user.id, "folder.create", folder.id, folder.name)
    db.commit()
    db.refresh(folder)
    return folder


@router.get("", response_model=list[FolderOut])
def list_folders(
    workspace_id: str,
    parent_id: str | None = None,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    query = db.query(Folder).filter(Folder.workspace_id == workspace_id, Folder.trashed_at.is_(None))
    query = query.filter(Folder.parent_id == parent_id) if parent_id else query.filter(Folder.parent_id.is_(None))
    return query.order_by(Folder.name).all()


@router.get("/{folder_id}", response_model=FolderOut)
def get_folder(
    workspace_id: str,
    folder_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    return _get_folder_or_404(db, workspace_id, folder_id)


@router.patch("/{folder_id}", response_model=FolderOut)
def rename_folder(
    workspace_id: str,
    folder_id: str,
    payload: FolderRename,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    folder = _get_folder_or_404(db, workspace_id, folder_id)
    folder.name = payload.name
    _log(db, workspace_id, user.id, "folder.rename", folder.id, folder.name)
    db.commit()
    db.refresh(folder)
    return folder


@router.patch("/{folder_id}/move", response_model=FolderOut)
def move_folder(
    workspace_id: str,
    folder_id: str,
    payload: FolderMove,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    folder = _get_folder_or_404(db, workspace_id, folder_id)
    if payload.parent_id == folder.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A folder cannot be moved into itself")
    folder.parent_id = payload.parent_id
    db.commit()
    db.refresh(folder)
    return folder


@router.post("/{folder_id}/star", response_model=FolderOut)
def toggle_star(
    workspace_id: str,
    folder_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    folder = _get_folder_or_404(db, workspace_id, folder_id)
    folder.starred = not folder.starred
    db.commit()
    db.refresh(folder)
    return folder


@router.post("/{folder_id}/trash", response_model=FolderOut)
def trash_folder(
    workspace_id: str,
    folder_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    folder = _get_folder_or_404(db, workspace_id, folder_id)
    folder.trashed_at = datetime.now(timezone.utc)
    _log(db, workspace_id, user.id, "folder.trash", folder.id, folder.name)
    db.commit()
    db.refresh(folder)
    return folder


@router.post("/{folder_id}/restore", response_model=FolderOut)
def restore_folder(
    workspace_id: str,
    folder_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.member)),
):
    folder = _get_folder_or_404(db, workspace_id, folder_id)
    folder.trashed_at = None
    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}")
def delete_folder_permanently(
    workspace_id: str,
    folder_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.admin)),
):
    folder = _get_folder_or_404(db, workspace_id, folder_id)
    remaining = db.query(File).filter(File.folder_id == folder.id).count() + db.query(Folder).filter(
        Folder.parent_id == folder.id
    ).count()
    if remaining:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Folder is not empty")
    db.delete(folder)
    db.commit()
    return {"ok": True}


def _get_folder_or_404(db: Session, workspace_id: str, folder_id: str) -> Folder:
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.workspace_id == workspace_id).first()
    if not folder:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    return folder
