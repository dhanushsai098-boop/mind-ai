# Mind AI — AI-Native Workspace

An AI-native cloud workspace: Google-Drive-style storage plus file intelligence,
RAG chat, semantic search, a data analyst, agents, and automation.

This repo currently implements **Phase 1 (Foundation)** and **Phase 2 (Cloud Storage)**
in full, end-to-end, against real infrastructure (Postgres + Cloudflare R2). The AI
features (Phases 3–6) have real, wired-up navigation and honest "coming soon" screens
rather than fake buttons — see **Roadmap** below for what's next and why it's sequenced
this way.

## Architecture

```
frontend/   Next.js 14 (App Router) + TypeScript + Tailwind CSS
            - Cookie-based session (talks to the FastAPI backend, not NextAuth)
            - /api/* requests are rewritten to the backend (see next.config.js)

backend/    FastAPI + SQLAlchemy + PostgreSQL
            - JWT access/refresh tokens in httpOnly cookies
            - Google OAuth (authorization code flow)
            - Workspace-scoped RBAC (owner/admin/member/viewer) on every route
            - Cloudflare R2 (S3-compatible) via presigned PUT/GET URLs —
              files never pass through the API server
            - DB models already include `processing_status` / `ai_summary` /
              (soon) pgvector embedding columns, so Phase 3 slots in without
              a schema rewrite
```

### Why presigned uploads?

The browser uploads directly to R2 using a presigned URL the backend issues.
The API only ever sees metadata (filename, size, content type) — this is the
standard production pattern for large-file cloud storage and avoids routing
gigabytes through your app server.

### Why cookies instead of a bearer token in localStorage?

httpOnly cookies aren't readable by JavaScript, which meaningfully reduces XSS
token-theft risk. The Next.js rewrite in `next.config.js` proxies `/api/*` to
the backend so the browser treats it as same-origin — no CORS/cookie
cross-domain headaches in local dev.

## Setup

### 1. Database

You need a PostgreSQL instance with the `pgvector` extension available
(Phase 3 will use it; Phase 1–2 doesn't need vectors yet, but `init_db.py`
enables the extension now so you don't have to touch the DB again later).

- Easiest path: [Supabase](https://supabase.com) or [Neon](https://neon.tech) (both support pgvector), or `docker run -p 5432:5432 -e POSTGRES_PASSWORD=mindai ankane/pgvector`
- Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`

### 2. Cloudflare R2

- Create a bucket in the Cloudflare dashboard → R2
- Create an API token (Account API Token, R2 read/write)
- Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`, `R2_ENDPOINT_URL` in `backend/.env`
- **Enable CORS on the bucket** (Settings → CORS Policy) so the browser can
  PUT directly to it:
  ```json
  [{ "AllowedOrigins": ["http://localhost:3000"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"] }]
  ```

### 3. Google OAuth

- Create an OAuth Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  (type: Web application)
- Authorized redirect URI: `http://localhost:8000/api/auth/google/callback`
- Fill in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `backend/.env`

### 4. Run the backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in the values above
python init_db.py      # creates tables + enables pgvector
uvicorn app.main:app --reload --port 8000
```

### 5. Run the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000`.

### Production notes

- Swap `Base.metadata.create_all` (`init_db.py`) for real Alembic migrations
  before you have production data — `alembic init` pointed at
  `app.db.session.Base.metadata` takes minutes to set up.
- `_oauth_states` in `auth.py` is an in-memory set — fine for a single
  instance, move it to Redis if you run multiple backend instances.
- Set `COOKIE_SECURE=true` and use `https` origins once deployed.
- Deploy the frontend to Vercel; the backend to Render or Railway (either
  works fine with the Postgres/R2 setup above).

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Auth, workspaces, roles, dashboard shell | ✅ Done |
| 2 | Cloud storage: upload, folders, star/trash, sharing, usage | ✅ Done |
| 3 | AI file intelligence + RAG chat (extraction, embeddings, summaries, cited-source chat) | Next |
| 4 | AI semantic search (pgvector similarity search over content + metadata) | Planned |
| 5 | AI data analyst for CSV/XLSX (stats, anomalies, trends, charts, NL explanations) | Planned |
| 6 | AI agents + visual workflow automation | Planned |

Phase 3 is the right next step because semantic search, the data analyst, and
agents all depend on the same extraction + embedding pipeline — building it
once, well, unblocks the rest.
