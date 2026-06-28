# Production & 100% Free Tier Deployment Guide

This guide describes how to deploy the AI SQL Query Generator & Database Assistant in production, focusing on a **100% free hosting stack**.

---

## 100% Free Tier Deployment Strategy
This stack utilizes free tier offerings from Neon/Supabase (Database), Render (FastAPI Backend), and Vercel (React Frontend).

```mermaid
graph TD
    A[React Frontend - Vercel Free] -->|API Requests| B[FastAPI Backend - Render Free]
    B -->|User Auth & Logs| C[PostgreSQL Database - Neon/Supabase Free]
    B -->|Schema Reflection| D[Target Database - User Input]
```

### Step 1: Spin up a Free PostgreSQL Database
You can use either **Neon** or **Supabase** to get a permanently free PostgreSQL database:

#### Option A: Neon (Recommended)
1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Create a new project and select **PostgreSQL 15/16**.
3. Under the Connection Details, select **Connection String** -> **Pooled Connection** (which starts with `postgresql://`).
4. Copy the connection string. It will look like:
   `postgresql://alex:password@ep-cool-water-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`

#### Option B: Supabase
1. Go to [Supabase.com](https://supabase.com/) and sign up for a free account.
2. Create a new project. Set a secure database password and choose your region.
3. Once the project is ready, navigate to **Project Settings** -> **Database**.
4. Under Connection String, select the **URI** tab, copy the URL, and replace `[YOUR-PASSWORD]` with your actual database password.

---

### Step 2: Deploy the FastAPI Backend (Render Free Tier)
Render offers a free tier for web applications that is perfect for hosting the API.

1. Create a free account at [Render.com](https://render.com/).
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following options:
   - **Name**: `sql-assistant-api`
   - **Root Directory**: `backend` (Ensure this is set so Render only builds the backend sub-folder)
   - **Language**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Click **Advanced** and add the following **Environment Variables**:
   - `DATABASE_URL`: *The connection string copied in Step 1*
   - `SECRET_KEY`: *A random security string (e.g. `7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c`)*
   - `AI_PROVIDER`: `openrouter` (or `mock` to run offline without an OpenRouter key)
   - `OPENROUTER_API_KEY`: *Your OpenRouter API key* (leave blank if running in `mock` mode)
   - `OPENROUTER_MODEL`: `google/gemini-2.5-flash` (or your preferred OpenRouter model)
   - `BACKEND_CORS_ORIGINS`: `https://your-app-name.vercel.app` (This is your frontend Vercel URL. You can temporarily set it to `*` and restrict it later once your Vercel deployment finishes)
6. Click **Create Web Service**. 
7. Once deployed, copy your service's URL (e.g., `https://sql-assistant-api.onrender.com`).

*Note: Free instances on Render spin down after 15 minutes of inactivity. The first API request after inactivity may take 30-50 seconds to boot up.*

---

### Step 3: Deploy the React Frontend (Vercel Free Tier)
Vercel offers fast static hosting and serverless capabilities on a free hobby plan.

1. Go to [Vercel.com](https://vercel.com/) and sign up with GitHub.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the configuration settings:
   - **Framework Preset**: `Vite` (Vercel detects this automatically)
   - **Root Directory**: `frontend` (Ensure this is set so Vercel builds the React frontend)
5. Expand the **Environment Variables** section and add:
   - Key: `VITE_API_URL`
   - Value: `https://sql-assistant-api.onrender.com` (Your Render API URL from Step 2 - *ensure no trailing slash*)
6. Click **Deploy**.
7. Once deployment finishes, Vercel will give you a domain (e.g., `https://sql-assistant.vercel.app`).
8. **Optional Security Step**: Go back to your Render Dashboard for your backend service, update the `BACKEND_CORS_ORIGINS` environment variable to match your new Vercel domain, and redeploy.

*Note: We have pre-configured a [vercel.json](file:///f:/ArushSQL/AI-SQL-Query-Generator/frontend/vercel.json) rewrite file in the frontend folder. This guarantees that direct page refreshes on subpaths (e.g., `/dashboard` or `/login`) resolve correctly to `/index.html` rather than throwing a 404.*

---

## Alternative: Self-Hosted Docker Compose (VPS)
If you decide to move to a private VPS server (e.g., AWS EC2, DigitalOcean, Linode) in the future:

1. Clone your repo on the host machine.
2. Configure `.env` in the root folder.
3. Set your target postgres database container configurations inside [docker-compose.yml](file:///f:/ArushSQL/AI-SQL-Query-Generator/docker-compose.yml).
4. Start the stack:
   ```bash
   docker compose up -d --build
   ```
5. Install Nginx on the host VPS system to reverse-proxy incoming public traffic on ports `80` (HTTP) and `443` (HTTPS) to the React container listening on port `5173`.
