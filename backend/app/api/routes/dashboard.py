from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_workspace_role
from app.db.models import ActivityLog, File, Workspace, WorkspaceRole
from app.db.session import get_db
from app.schemas.file import FileOut, StorageUsageOut

router = APIRouter(prefix="/api/workspaces/{workspace_id}/dashboard", tags=["dashboard"])


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    resource_type: str
    resource_name: str
    created_at: str


class DashboardOut(BaseModel):
    usage: StorageUsageOut
    recent_files: list[FileOut]
    starred_files: list[FileOut]
    recent_activity: list[ActivityOut]


@router.get("", response_model=DashboardOut)
def get_dashboard(
    workspace_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    workspace = db.get(Workspace, workspace_id)
    used = int(
        db.query(func.coalesce(func.sum(File.size_bytes), 0))
        .filter(File.workspace_id == workspace_id, File.trashed_at.is_(None))
        .scalar()
        or 0
    )
    count = db.query(File).filter(File.workspace_id == workspace_id, File.trashed_at.is_(None)).count()

    recent = (
        db.query(File)
        .filter(File.workspace_id == workspace_id, File.trashed_at.is_(None))
        .order_by(File.updated_at.desc())
        .limit(8)
        .all()
    )
    starred = (
        db.query(File)
        .filter(File.workspace_id == workspace_id, File.trashed_at.is_(None), File.starred.is_(True))
        .order_by(File.updated_at.desc())
        .limit(8)
        .all()
    )
    activity = (
        db.query(ActivityLog)
        .filter(ActivityLog.workspace_id == workspace_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardOut(
        usage=StorageUsageOut(used_bytes=used, limit_bytes=workspace.storage_limit_bytes, file_count=count),
        recent_files=recent,
        starred_files=starred,
        recent_activity=[
            ActivityOut(
                id=a.id,
                action=a.action,
                resource_type=a.resource_type,
                resource_name=a.resource_name,
                created_at=a.created_at.isoformat(),
            )
            for a in activity
        ],
    )
