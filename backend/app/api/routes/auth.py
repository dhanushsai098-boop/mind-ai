import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.db.models import User, Workspace, WorkspaceMember, WorkspaceRole
from app.db.session import get_db
from app.schemas.user import SignupRequest, LoginRequest, MeOut, UserOut, WorkspaceOut
from app.services import google_oauth

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

_oauth_states: set[str] = set()  # in-memory CSRF state store (fine for single-instance dev; use redis in prod)


def _set_auth_cookies(response: Response, user_id: str) -> None:
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)
    cookie_kwargs = dict(httponly=True, secure=settings.cookie_secure, samesite="lax", path="/")
    response.set_cookie("access_token", access, max_age=settings.access_token_expire_minutes * 60, **cookie_kwargs)
    response.set_cookie(
        "refresh_token", refresh, max_age=settings.refresh_token_expire_days * 24 * 3600, **cookie_kwargs
    )


def _create_personal_workspace(db: Session, user: User) -> Workspace:
    workspace = Workspace(name=f"{user.name}'s Workspace", owner_id=user.id)
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=WorkspaceRole.owner))
    db.commit()
    db.refresh(workspace)
    return workspace


@router.post("/signup", response_model=MeOut)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(name=payload.name, email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.flush()
    workspace = _create_personal_workspace(db, user)

    _set_auth_cookies(response, user.id)
    return MeOut(
        user=UserOut.model_validate(user),
        workspaces=[WorkspaceOut(id=workspace.id, name=workspace.name, role="owner", storage_limit_bytes=workspace.storage_limit_bytes)],
    )


@router.post("/login", response_model=MeOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    _set_auth_cookies(response, user.id)
    return _me_payload(db, user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    payload = decode_token(token) if token else None
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    _set_auth_cookies(response, user.id)
    return {"ok": True}


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _me_payload(db, user)


def _me_payload(db: Session, user: User) -> MeOut:
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
    workspaces = [
        WorkspaceOut(
            id=m.workspace.id,
            name=m.workspace.name,
            role=m.role.value,
            storage_limit_bytes=m.workspace.storage_limit_bytes,
        )
        for m in memberships
    ]
    return MeOut(user=UserOut.model_validate(user), workspaces=workspaces)


@router.get("/google/login")
def google_login():
    try:
        state = secrets.token_urlsafe(24)
        _oauth_states.add(state)
        return RedirectResponse(google_oauth.get_authorization_url(state))
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc


@router.get("/google/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    if state not in _oauth_states:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")
    _oauth_states.discard(state)

    try:
        tokens = await google_oauth.exchange_code_for_tokens(code)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    userinfo = await google_oauth.fetch_userinfo(tokens["access_token"])

    user = db.query(User).filter(User.google_id == userinfo["sub"]).first()
    if not user:
        user = db.query(User).filter(User.email == userinfo["email"]).first()
    if not user:
        user = User(
            name=userinfo.get("name", userinfo["email"].split("@")[0]),
            email=userinfo["email"],
            google_id=userinfo["sub"],
            avatar_url=userinfo.get("picture"),
        )
        db.add(user)
        db.flush()
        _create_personal_workspace(db, user)
    elif not user.google_id:
        user.google_id = userinfo["sub"]
        db.commit()

    redirect = RedirectResponse(f"{settings.primary_frontend_url}/dashboard")
    _set_auth_cookies(redirect, user.id)
    return redirect
