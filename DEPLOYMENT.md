# Mind AI — Production Deployment Guide

This guide covers two recommended deployment setups:
1. **Option 1 (Vercel + Backend Host)**: Deploy the Next.js frontend to **Vercel** and the FastAPI backend + PostgreSQL to **Railway** or **Render**.
2. **Option 2 (All-in-One Railway)**: Deploy Frontend, Backend, and PostgreSQL inside a single Railway project.

---

## ⚡ Option 1: Deploying the Frontend on Vercel

Vercel is the creator of Next.js and the premier platform for deploying the frontend.

### Step 1: Import Project to Vercel
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** ➔ **"Project"**.
3. Import your GitHub repository: `dhanushsai098-boop/mind-ai`.

### Step 2: Configure Build Settings
In the Project Configuration screen:
- **Framework Preset**: `Next.js` (automatically detected)
- **Root Directory**: Click `Edit` and select **`frontend`** (Important!)
- Leave Build and Output Settings as default.

### Step 3: Add Environment Variables
Under **Environment Variables**, add:
- `NEXT_PUBLIC_API_URL`: The URL of your deployed FastAPI backend (e.g. `https://mind-ai-backend.up.railway.app` or `https://mind-ai-backend.onrender.com`).
  *(If you haven't deployed the backend yet, you can add this variable after deploying the backend and trigger a redeploy).*

### Step 4: Click Deploy
Vercel will build and deploy your Next.js frontend to a custom `.vercel.app` domain with global CDN and edge routing!

---

## 🏗️ Option 2: Full Railway Setup (Backend + Postgres + Frontend)

```
                   ┌──────────────────────────────────────────────┐
                   │               Railway Project                │
                   │                                              │
User's Browser ───►│  [Frontend] Next.js 14                       │
 (HTTPS Domain)    │  (Domain: https://mind-ai-production.up...)  │
                   │    │ (Proxies /api/* requests)               │
                   │    ▼                                         │
                   │  [Backend] FastAPI (Python 3.11)             │
                   │  (Domain: https://mind-ai-api.up...)         │
                   │    │                                         │
                   │    ▼ (Private Network)                       │
                   │  [PostgreSQL] (Postgres + pgvector)          │
                   └────┬─────────────────────────────────────────┘
                        │
                        ▼ (Direct client presigned uploads)
              [Cloudflare R2 Bucket]
```

---

## Prerequisites

1. A [GitHub](https://github.com) account with this repository pushed to it.
2. A [Railway](https://railway.app) account.
3. A [Cloudflare](https://dash.cloudflare.com) account (for R2 object storage).

---

## Step 1: Push Code to GitHub

If you haven't already pushed your code to GitHub:
```bash
git init
git add .
git commit -m "feat: ready for production railway deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/mind-ai.git
git push -u origin main
```

---

## Step 2: Create a New Project on Railway

1. Go to [railway.app/dashboard](https://railway.app/dashboard).
2. Click **"+ New Project"**.
3. Choose **"Provision PostgreSQL"**.
   - Railway will immediately create a PostgreSQL database.
   - It automatically generates a private connection string (`DATABASE_URL`).

---

## Step 3: Deploy the Backend Service

1. In the same Railway project canvas, click **"+ New"** (top right) ➔ **"GitHub Repo"**.
2. Select your `mind-ai` repository.
3. Click on the newly created service card ➔ Go to **"Settings"**:
   - **Service Name**: rename to `backend` (or `mind-ai-api`).
   - Under **Source Directory** / **Root Directory**: click `Edit` and enter `/backend`.
4. Go to **"Variables"** tab and add the following:

| Variable | Recommended Value | Notes |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Click "Add Reference" and select your Postgres service |
| `ENVIRONMENT` | `production` | Enables production safeguards |
| `SECRET_KEY` | `fc598c7880ef5b42cf4b3c5ed8a39995772f4f83c2cf57245288972214b95826` | Generate any 64-character secret key |
| `FRONTEND_URL` | `https://your-frontend-domain.up.railway.app` | We will set this in Step 4 once frontend domain is created |
| `COOKIE_SECURE` | `true` | Required for HTTPS |
| `R2_ACCOUNT_ID` | `<your-cloudflare-account-id>` | From Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | `<your-r2-access-key-id>` | From R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | `<your-r2-secret-access-key>` | From R2 API Tokens |
| `R2_BUCKET_NAME` | `mind-ai-storage` | Your bucket name |
| `R2_ENDPOINT_URL` | `https://<account_id>.r2.cloudflarestorage.com` | R2 S3 API URL |
| `OPENAI_API_KEY` | `<your-openai-api-key>` | (Optional: for Phase 3+ AI features) |

5. Go to **"Settings"** ➔ scroll down to **"Networking"** ➔ click **"Generate Domain"**.
   - Copy this URL (e.g. `https://mind-ai-backend-production.up.railway.app`).

> 💡 **Automatic Database Initialization**: When the backend starts up, it automatically runs `init_db.py` to create all tables and enable `pgvector`. You do not need to run manual migration commands!

---

## Step 4: Deploy the Frontend Service

1. In the same Railway project canvas, click **"+ New"** ➔ **"GitHub Repo"**.
2. Select the same `mind-ai` repository again.
3. Click on the service card ➔ Go to **"Settings"**:
   - **Service Name**: rename to `frontend` (or `mind-ai`).
   - Under **Root Directory**: click `Edit` and enter `/frontend`.
4. Go to **"Variables"** tab and add:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://mind-ai-backend-production.up.railway.app` | Use the Backend domain generated in Step 3 |

5. Go to **"Settings"** ➔ **"Networking"** ➔ click **"Generate Domain"**.
   - Copy this URL (e.g. `https://mind-ai-frontend-production.up.railway.app`).
6. **Update Backend CORS**:
   - Go back to your `backend` service ➔ **Variables** ➔ set `FRONTEND_URL` to your frontend's domain (e.g. `https://mind-ai-frontend-production.up.railway.app`).
   - Railway will automatically redeploy the backend with the new domain allowed.

---

## Step 5: Configure Cloudflare R2 CORS

Since users upload files directly to Cloudflare R2 using presigned URLs from their browser, Cloudflare needs to allow requests from your frontend:

1. In Cloudflare Dashboard, go to **R2** ➔ Click on your bucket (`mind-ai-storage`).
2. Go to **Settings** tab ➔ Scroll down to **CORS Policy** ➔ Click **Edit CORS Policy**.
3. Paste the following configuration (replace with your frontend URL):

```json
[
  {
    "AllowedOrigins": [
      "https://mind-ai-frontend-production.up.railway.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
4. Click **Save**.

---

## Step 6 (Optional): Google OAuth Configuration

If you wish to use Google Login in production:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Edit your **OAuth 2.0 Client ID**:
   - **Authorized JavaScript origins**: `https://mind-ai-frontend-production.up.railway.app`
   - **Authorized redirect URIs**: `https://mind-ai-frontend-production.up.railway.app/api/auth/google/callback`
3. In Railway Backend service variables, set:
   - `GOOGLE_CLIENT_ID`: `<your-google-client-id>`
   - `GOOGLE_CLIENT_SECRET`: `<your-google-client-secret>`
   - `GOOGLE_REDIRECT_URI`: `https://mind-ai-frontend-production.up.railway.app/api/auth/google/callback`

---

## Verification & Health Check

1. Visit `https://<your-backend-domain>/api/health`:
   - Should return: `{"status":"ok","environment":"production"}`.
2. Visit `https://<your-frontend-domain>`:
   - You should see the Mind AI landing and login pages.
   - Click **Sign Up** to create your first user account and workspace!
   - Upload a test file to verify storage integration.

---

## Local Docker Deployment (Alternative)

If you prefer to run everything locally or on a single VPS with Docker:
```bash
docker compose up -d --build
```
This starts PostgreSQL (with pgvector), FastAPI backend (port 8000), and Next.js frontend (port 3000).
