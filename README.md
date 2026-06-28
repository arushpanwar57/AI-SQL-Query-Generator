# AI SQL Query Generator & Database Assistant

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel&style=for-the-badge)](https://ai-sql-query-generator-gamma.vercel.app/)
[![API Docs](https://img.shields.io/badge/API%20Docs-Swagger-green?logo=fastapi&style=for-the-badge)](https://ai-sql-query-generator-wn6r.onrender.com/docs)
[![Backend](https://img.shields.io/badge/Backend-Render-purple?logo=render&style=for-the-badge)](https://ai-sql-query-generator-wn6r.onrender.com)

A production-grade, enterprise-ready AI-powered SQL query generator and database assistant. Built with **Clean Architecture** principles using FastAPI, React (TypeScript), Tailwind CSS, Monaco SQL Editor, and OpenRouter API.

This application translates natural language requirements into valid SQL queries, explains them in simple English, performs database-level EXPLAIN syntax validations, runs security reviews (guarding against destructive changes), performs impact analysis, suggests optimizations, and executes queries within transaction blocks on target PostgreSQL or MySQL engines.

---

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://ai-sql-query-generator-gamma.vercel.app/ |
| **Backend API (Render)** | https://ai-sql-query-generator-wn6r.onrender.com |
| **API Swagger Docs** | https://ai-sql-query-generator-wn6r.onrender.com/docs |

> **Note**: The backend runs on Render's free tier and may take **30–50 seconds** to respond after a period of inactivity (cold start). Subsequent requests will be fast.

---

## Technical Stack

### Frontend
- **React & TypeScript**: Single Page Application structure with strong type safety.
- **Tailwind CSS**: Modern UI styling with curated glassmorphism styling and dark mode.
- **React Router**: Client-side role-based routing (Admin, Developer, Viewer guards).
- **Axios**: HTTP client equipped with automatic JWT access/refresh token rotation.
- **Monaco SQL Editor**: Premium embedded query editor with sql syntax highlighting.
- **Recharts**: Data visualization for administrative query usage, success rates, and user statistics.

### Backend
- **FastAPI (Python)**: High-performance ASGI framework.
- **SQLAlchemy (ORM)**: Database session management, generic repository interfaces, and dynamic SQL engines.
- **Pydantic**: Strict data models and request validation.
- **SlowAPI**: Rate limiting (request capping) applied on sensitive auth and AI generation paths.
- **PyJWT & Passlib**: Secure bcrypt password hashing and token-based stateful sessions.

### Databases & Infrastructure
- **PostgreSQL**: Primary application store (stores accounts, history logs, and audits).
- **PostgreSQL / MySQL**: Target connection support.
- **Docker & Docker Compose**: Complete environment orchestration.

---

## Core Features & AI Pipeline

Every natural language query goes through a strict multi-stage pipeline before execution:

- **Schema Reflection**: Inspects structural metadata tables, columns, constraints and relations, protecting data privacy.
- **OpenRouter SQL Generation**: Configurable provider translating natural language prompts.
- **Syntax Validation**: Safely executes EXPLAIN queries to verify syntax.
- **Safety Checks**: Sweeps queries for destructive actions lacking WHERE clauses.
- **Impact Analysis**: Generates database modification risks (Low/Medium/High/Critical).
- **Query Optimization**: Suggests indexing and query adjustments.
- **Safe Execution**: Automatically executes queries inside transaction blocks.

### Security & Privacy Policies
1. **Data Privacy**: The AI engine *never* receives actual database records. It only receives schema structures (tables, columns, datatypes, and foreign keys) translated by the reflection service. Data records are only retrieved when the user explicitly triggers "Run Query" on the frontend.
2. **Account Lockouts**: Accounts are locked for 15 minutes after 5 consecutive failed login attempts to prevent brute-force attacks.
3. **Username Reservation**: If a user changes their username, their previous username is moved to a `ReservedUsername` registry and cannot be claimed by any other user for 6 months.
4. **Session Controls**: Access tokens expire in 30 minutes, while Refresh tokens are stored in active DB sessions for rotation, allowing administrators to audit or terminate active logins.

---

## Folder Structure

```
AI-SQL-Query-Generator/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   └── test_sql.py
│   └── src/
│       ├── main.py                # FastAPI App entrypoint
│       ├── api/                   # API Routers (Auth, Schema, Generator, Admin)
│       ├── core/                  # Database, Configs, Security, Seed scripts
│       ├── models/                # SQLAlchemy database models
│       ├── repositories/          # Generic Base and User/History CRUD
│       ├── schemas/               # Pydantic schemas (Request/Response validation)
│       └── services/              # AI generators, Schema reflection, Executors
├── frontend/
│   ├── Dockerfile
│   ├── vercel.json                # Vercel SPA routing config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css              # Glassmorphic UI colors and animations
│       ├── types/                 # TypeScript interfaces
│       ├── services/              # Axios API client calls
│       ├── context/               # AuthContext & ThemeContext
│       └── components/            # Layouts, Monaco wrappers, dashboards, auth
├── docker-compose.yml
├── deployment_guide.md
├── .env.example
└── README.md
```

---

## API Documentation

### Authentication
- `POST /api/auth/register`: Create a new account.
- `POST /api/auth/login`: Authenticate credentials, return access + refresh tokens, and log active sessions.
- `POST /api/auth/refresh`: Reissue access tokens using a refresh token.
- `POST /api/auth/logout`: Invalidate the active session.
- `PUT /api/auth/username`: Change the active username (reserves old username for 6 months).

### Database Schema
- `POST /api/schema/inspect`: Inspect target database structural metadata tree.
- `POST /api/schema/test-connection`: Test database connection settings.

### Query Pipeline
- `POST /api/query/generate`: Translate prompt to SQL and run full pipeline (validation, impact, optimization, explain).
- `POST /api/query/validate`: Test SQL query syntax using database-level EXPLAIN compile blocks.
- `POST /api/query/optimize`: Fetch suggestions and index recommendations for an SQL query.
- `POST /api/query/impact`: Estimate risk, tables affected, and modifications.
- `POST /api/query/execute`: Execute a query inside a transaction block (logs query history and audit tracks).

### Administration
- `GET /api/admin/stats`: Get dashboard analytics, success rates, and user logs.
- `GET /api/admin/users`: List users and roles (Admin only).
- `PUT /api/admin/users/role`: Update user roles (Admin only).
- `GET /api/admin/sessions`: List active sessions (Admin only).
- `GET /api/admin/audit-logs`: Review system audit trails (Admin only).
- `POST /api/admin/ddl`: Execute raw CREATE, ALTER, or DROP table schemas (Developer or Admin only).

---

## Installation & Setup Guide

### Running with Docker Compose (Recommended)
1. **Clone the Repository** and navigate to the project directory:
   ```bash
   cd DBMS_SQL_Query_generator
   ```
2. **Setup environment configurations**: Copy the `.env.example` template to `.env`:
   ```bash
   cp .env.example .env
   ```
3. **Configure the OpenRouter API Key**: Open `.env` and fill in your OpenRouter API key and desired model:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=google/gemini-2.5-flash
   ```
   *Note: If no API key is specified, the application automatically falls back to an offline rule-based Mock Generator, allowing immediate local testing.*
4. **Choose Execution Path**:

   #### Option A: Running with Docker Compose (PostgreSQL)
   ```bash
   docker compose up --build
   ```
   Open `http://localhost:5173` to access the UI.

   #### Option B: Running Locally (SQLite Fallback)
   If you don't have Docker installed, the application automatically falls back to local SQLite files for both the session store and query workspace targets:
   
   **1. Run the Backend:**
   ```bash
   cd backend
   python -m venv venv
   # Activate virtual env:
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   python -m uvicorn src.main:app --host 127.0.0.1 --port 8000
   ```
   
   **2. Run the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   
   Open `http://localhost:5173` in your browser. The default target connection string `sqlite:///./sql_assistant.db` will be pre-filled, which connects to the local database file containing seeded sample tables (`departments`, `employees`).

5. Open your browser and navigate to the application dashboard:
   - **Frontend Workspace**: `http://localhost:5173`
   - **Backend API Swagger Docs**: `http://localhost:8000/docs`

---

## Verification Plan

### Automated Tests
Run unit tests inside the backend folder to verify password rules, username reservation timers, and validation blocks:
1. Initialize virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
2. Run tests:
   ```bash
   pytest
   ```
