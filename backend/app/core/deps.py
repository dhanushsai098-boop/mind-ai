from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.db.models import User, WorkspaceMember, WorkspaceRole


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def require_workspace_role(min_role: WorkspaceRole):
    role_rank = {WorkspaceRole.viewer: 0, WorkspaceRole.member: 1, WorkspaceRole.admin: 2, WorkspaceRole.owner: 3}

    def dependency(
        workspace_id: str,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ) -> WorkspaceMember:
        membership = (
            db.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id)
            .first()
        )
        if not membership:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this workspace")
        if role_rank[membership.role] < role_rank[min_role]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions for this action")
        return membership

    return dependency
