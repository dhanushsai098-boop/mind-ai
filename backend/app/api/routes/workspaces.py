from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_workspace_role
from app.db.models import User, Workspace, WorkspaceMember, WorkspaceRole
from app.db.session import get_db

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class MemberOut(BaseModel):
    user_id: str
    name: str
    email: str
    role: str


class InviteRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.member


class RoleUpdateRequest(BaseModel):
    role: WorkspaceRole


@router.get("/{workspace_id}/members", response_model=list[MemberOut])
def list_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.viewer)),
):
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    return [
        MemberOut(user_id=m.user.id, name=m.user.name, email=m.user.email, role=m.role.value) for m in members
    ]


@router.post("/{workspace_id}/invite", response_model=MemberOut)
def invite_member(
    workspace_id: str,
    payload: InviteRequest,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.admin)),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No Mind AI account found for that email yet — they need to sign up first.",
        )
    existing = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member of this workspace")

    member = WorkspaceMember(workspace_id=workspace_id, user_id=user.id, role=payload.role)
    db.add(member)
    db.commit()
    return MemberOut(user_id=user.id, name=user.name, email=user.email, role=member.role.value)


@router.patch("/{workspace_id}/members/{user_id}", response_model=MemberOut)
def update_member_role(
    workspace_id: str,
    user_id: str,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.owner)),
):
    member = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    member.role = payload.role
    db.commit()
    return MemberOut(user_id=member.user.id, name=member.user.name, email=member.user.email, role=member.role.value)


@router.delete("/{workspace_id}/members/{user_id}")
def remove_member(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _membership=Depends(require_workspace_role(WorkspaceRole.admin)),
):
    member = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if member.role == WorkspaceRole.owner:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove the workspace owner")
    db.delete(member)
    db.commit()
    return {"ok": True}
