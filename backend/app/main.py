from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import auth, workspaces, folders, files, dashboard

settings = get_settings()

app = FastAPI(title="Mind AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": settings.environment}
