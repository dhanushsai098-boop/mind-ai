import httpx

from app.core.config import get_settings

settings = get_settings()

AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    normalized = value.strip().lower()
    placeholders = (
        "your-google-client-id",
        "your-google-client-secret",
        "replace-with-your-google-client-id",
        "replace-with-your-google-client-secret",
        "example",
        "changeme",
    )
    return normalized in placeholders or normalized.startswith("your-") or "replace-with" in normalized


def get_google_oauth_config() -> tuple[str, str, str]:
    client_id = (settings.google_client_id or "").strip()
    client_secret = (settings.google_client_secret or "").strip()
    redirect_uri = (settings.google_redirect_uri or "").strip()

    if not client_id or not client_secret or _is_placeholder(client_id) or _is_placeholder(client_secret):
        raise RuntimeError(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env "
            "and make sure GOOGLE_REDIRECT_URI matches http://localhost:8000/api/auth/google/callback."
        )

    if not redirect_uri:
        raise RuntimeError("Google OAuth redirect URI is missing. Set GOOGLE_REDIRECT_URI in backend/.env.")

    return client_id, client_secret, redirect_uri


def get_authorization_url(state: str) -> str:
    client_id, _, redirect_uri = get_google_oauth_config()
    params = httpx.QueryParams({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    })
    return f"{AUTH_BASE}?{params}"


async def exchange_code_for_tokens(code: str) -> dict:
    client_id, client_secret, redirect_uri = get_google_oauth_config()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_userinfo(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        resp.raise_for_status()
        return resp.json()
