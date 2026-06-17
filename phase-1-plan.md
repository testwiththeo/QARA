# QARA Phase 1 — Implementation Plan

> **Version:** 1.0 (Finalized)
> **Date:** 2026-06-22
> **Scope:** Foundation — Bug Capture, API Backend, Dashboard, Chrome Extension, Jira+Slack Integration
> **Timeline:** Month 1-2

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Component Tree](#2-component-tree)
3. [Data Flow Diagram](#3-data-flow-diagram)
4. [API Contract Detail](#4-api-contract-detail)
5. [Database Migration Plan](#5-database-migration-plan)
6. [9Router Integration Spec](#6-9router-integration-spec)
7. [Risk Assessment](#7-risk-assessment)
8. [Implementation Order](#8-implementation-order)

---

## 1. Folder Structure

```
qara/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── api/                          # FastAPI monolith (Phase 1)
│   ├── Dockerfile
│   ├── pyproject.toml            # uv/poetry config
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py                # async Alembic setup with asyncpg
│   │   └── versions/
│   │       ├── 001_create_tenants.py
│   │       ├── 002_create_users.py
│   │       ├── 003_create_projects.py
│   │       ├── 004_create_bug_reports.py
│   │       ├── 005_create_bug_captures.py
│   │       ├── 006_create_integrations.py
│   │       ├── 007_create_audit_log.py
│   │       └── 008_create_bug_embeddings.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app factory, CORS, lifespan
│   │   ├── config.py             # pydantic-settings, env loading
│   │   ├── database.py           # async engine, session factory
│   │   ├── dependencies.py       # get_db, get_current_user, get_tenant
│   │   │
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── tenant.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── bug_report.py
│   │   │   ├── bug_capture.py
│   │   │   ├── integration.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── bug.py
│   │   │   ├── capture.py
│   │   │   ├── project.py
│   │   │   ├── integration.py
│   │   │   └── common.py         # Pagination, error envelopes
│   │   │
│   │   ├── routes/               # FastAPI routers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # POST /auth/register, /auth/login, /auth/refresh
│   │   │   ├── bugs.py           # CRUD + state transitions
│   │   │   ├── captures.py       # Upload/download captures
│   │   │   ├── projects.py       # CRUD projects
│   │   │   ├── integrations.py   # CRUD integrations, trigger sync
│   │   │   └── health.py         # /health, /ready
│   │   │
│   │   ├── services/             # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py   # JWT issue/verify, bcrypt hash
│   │   │   ├── bug_service.py    # Create, update, state machine, list
│   │   │   ├── capture_service.py # Upload to MinIO, create DB record
│   │   │   ├── triage_service.py # LLM classify, embed, dedup check
│   │   │   ├── integration_service.py  # Jira + Slack dispatchers
│   │   │   └── storage_service.py      # MinIO S3 client wrapper
│   │   │
│   │   ├── tasks/                # ARQ background tasks
│   │   │   ├── __init__.py
│   │   │   ├── worker.py         # ARQ WorkerSettings
│   │   │   ├── triage_task.py    # Async triage after bug creation
│   │   │   └── integration_task.py # Jira ticket creation, Slack notify
│   │   │
│   │   ├── integrations/         # External integration clients
│   │   │   ├── __init__.py
│   │   │   ├── jira_client.py    # Jira REST API v3
│   │   │   └── slack_client.py   # Slack Web API
│   │   │
│   │   ├── llm/                  # 9Router LLM client
│   │   │   ├── __init__.py
│   │   │   ├── client.py         # OpenAI-compatible client wrapper
│   │   │   ├── prompts.py        # Prompt templates
│   │   │   └── embeddings.py     # Embedding with TF-IDF fallback
│   │   │
│   │   └── middleware/           # Custom middleware
│   │       ├── __init__.py
│   │       ├── audit.py          # Audit log middleware
│   │       └── request_id.py     # X-Request-ID correlation
│   │
│   └── tests/
│       ├── conftest.py           # Fixtures: async client, db, auth
│       ├── test_auth.py
│       ├── test_bugs.py
│       ├── test_captures.py
│       ├── test_triage.py
│       └── test_integrations.py
│
├── frontend/                     # React dashboard
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx            # React Router v7
│       ├── api/                  # API client (fetch wrapper + types)
│       │   ├── client.ts
│       │   └── types.ts
│       ├── hooks/                # Custom hooks
│       │   ├── useAuth.ts
│       │   ├── useBugs.ts
│       │   └── useProjects.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── BugListPage.tsx
│       │   ├── BugDetailPage.tsx
│       │   ├── BugCreatePage.tsx
│       │   ├── ProjectsPage.tsx
│       │   └── SettingsPage.tsx
│       ├── components/
│       │   ├── ui/               # shadcn/ui components
│       │   ├── BugCard.tsx
│       │   ├── BugTable.tsx
│       │   ├── BugStatusBadge.tsx
│       │   ├── SeverityBadge.tsx
│       │   ├── CaptureViewer.tsx
│       │   ├── ProjectSelector.tsx
│       │   └── Layout.tsx
│       ├── stores/               # Zustand stores
│       │   ├── authStore.ts
│       │   └── bugStore.ts
│       └── lib/
│           └── utils.ts
│
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── manifest.json
│   ├── public/
│   │   ├── icons/
│   │   └── popup.html
│   └── src/
│       ├── background/
│       │   └── service-worker.ts  # Data collection + API submission
│       ├── content/
│       │   └── collector.ts       # DOM snapshot, console, network
│       ├── popup/
│       │   ├── Popup.tsx          # Capture UI
│       │   └── main.tsx
│       ├── types/
│       │   └── capture.ts
│       └── lib/
│           ├── api.ts             # POST to QARA API
│           ├── screenshot.ts      # chrome.tabs.captureVisibleTab
│           ├── console.ts         # Console log buffer (500 lines)
│           ├── network.ts         # chrome.debugger HAR capture
│           └── fingerprint.ts     # OS, browser, resolution, lang
│
└── cli/                          # CLI tool (Node.js)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              # Commander.js entry point
        ├── commands/
        │   ├── config.ts         # qara config set api-key / endpoint
        │   ├── bugs.ts           # qara bugs list / create
        │   ├── capture.ts        # qara capture (interactive)
        │   └── integrations.ts   # qara integrations add
        └── lib/
            ├── api.ts            # HTTP client
            └── auth.ts           # API key management
```

### Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Monolith vs microservices | **Monolith** | Phase 1 has 1 team; 8 microservices = ops overhead with no benefit. Modularize internally via services/ directory for future extraction. |
| Task queue | **ARQ** (not Celery) | Lighter weight, native async, uses same Redis. No need for Celery's heavyweight broker abstraction for Phase 1 volume. |
| Vector search | **pgvector** (not Qdrant) | Avoids running another service. PostgreSQL + pgvector extension is sufficient for Phase 1 dedup (< 100K bugs). Migrate to Qdrant in Phase 2 if needed. |
| Frontend bundler | **Vite** (not Next.js) | SPA is fine for Phase 1 dashboard. No SSR needed. Simpler deployment, faster dev. |
| Extension bundler | **Vite + CRXJS** | CRXJS Vite plugin handles Manifest V3 HMR. Best DX for extension development. |
| CLI runtime | **Node.js** (not Python) | `npm install -g qara-cli` is easier distribution than pip. Commander.js is battle-tested. |
| State management | **Zustand** (not Redux) | Minimal boilerplate for the small amount of global state needed in Phase 1. |

---

## 2. Component Tree

### Backend Components

```
FastAPI App
├── Lifespan
│   ├── Init async DB engine (asyncpg)
│   ├── Init Redis connection (ARQ broker)
│   ├── Init MinIO client (boto3)
│   ├── Init 9Router LLM client
│   └── Seed default tenant + admin user (first run)
│
├── Middleware Stack
│   ├── CORSMiddleware (allow chrome-extension://, localhost:5173)
│   ├── RequestIDMiddleware (generate/propagate X-Request-ID)
│   ├── AuditMiddleware (log state changes to audit_log table)
│   └── ExceptionHandler (structured JSON error responses)
│
├── Auth System
│   ├── POST /auth/register → bcrypt hash password → create user → return JWT
│   ├── POST /auth/login → verify bcrypt → issue access_token (1h) + refresh_token (30d)
│   ├── POST /auth/refresh → verify refresh_token → issue new access_token
│   └── Dependency: get_current_user (decode JWT, load user, inject tenant_id)
│
├── Bug Management
│   ├── POST /bugs (multipart) → create bug + captures → enqueue triage task
│   ├── GET /bugs → list with filters (status, severity, assignee, search)
│   ├── GET /bugs/{id} → detail with captures + similar bugs
│   ├── PATCH /bugs/{id} → update fields + state transition validation
│   ├── DELETE /bugs/{id} → soft delete (set status=closed, resolved_at)
│   └── GET /bugs/{id}/similar → pgvector cosine similarity search
│
├── Capture Management
│   ├── POST /captures/upload → upload file to MinIO → create bug_capture record
│   ├── GET /captures/{id} → redirect to MinIO presigned URL
│   └── GET /captures/bug/{bug_id} → list all captures for a bug
│
├── Project Management
│   ├── POST /projects → create project
│   ├── GET /projects → list projects for tenant
│   ├── GET /projects/{id} → project detail
│   └── PATCH /projects/{id} → update project settings
│
├── Integration Management
│   ├── POST /integrations → store integration config (encrypted)
│   ├── GET /integrations → list integrations for tenant
│   ├── DELETE /integrations/{id} → remove integration
│   └── POST /integrations/{id}/test → test connection (Jira/Slack ping)
│
├── Background Tasks (ARQ)
│   ├── triage_bug → LLM classify → update severity/component/risk → embed → dedup check
│   ├── create_jira_ticket → Jira REST API v3 → update bug.ticket_url
│   ├── send_slack_notification → Slack Web API → post bug summary to channel
│   └── cleanup_expired_captures → delete old MinIO objects
│
└── Storage Service
    ├── MinIO client (boto3) → bucket: qara-captures
    ├── Upload: put_object with content-type detection
    ├── Download: generate presigned URL (1h expiry)
    └── Path convention: {tenant_id}/{bug_id}/{capture_type}/{filename}
```

### Frontend Components

```
React App (Vite + React 19 + TypeScript)
├── Router (React Router v7)
│   ├── /login → LoginPage
│   ├── / → DashboardPage (protected)
│   ├── /bugs → BugListPage (protected)
│   ├── /bugs/new → BugCreatePage (protected)
│   ├── /bugs/:id → BugDetailPage (protected)
│   ├── /projects → ProjectsPage (protected)
│   └── /settings → SettingsPage (protected)
│
├── Layout
│   ├── Sidebar (project selector, nav links, user menu)
│   ├── TopBar (search, notifications bell, profile)
│   └── Main content area
│
├── Bug Components
│   ├── BugTable → sortable columns, status/severity filters, pagination
│   ├── BugCard → compact card for dashboard grid
│   ├── BugForm → create/edit form (title, description, severity, project)
│   ├── BugStatusBadge → colored badge (open/triaging/triaged/closed)
│   ├── SeverityBadge → P0 (red) / P1 (orange) / P2 (yellow) / P3 (blue)
│   ├── CaptureViewer → tabbed viewer (screenshot, logs, network, env)
│   └── SimilarBugsList → list of similar bugs with similarity score
│
├── Dashboard Components
│   ├── StatsCards → bugs opened/closed, avg resolution, top severity
│   ├── RecentBugsWidget → last 10 bugs with status
│   └── SeverityChart → pie chart (recharts)
│
├── Auth
│   ├── LoginForm → email + password
│   ├── ProtectedRoute → redirect to /login if no token
│   └── AuthProvider → context with login/logout/refresh
│
└── API Client
    ├── Base fetch wrapper with JWT header injection
    ├── Auto-refresh on 401 (silent refresh_token exchange)
    ├── Typed request/response functions per endpoint
    └── Error normalization (API error → toast message)
```

### Chrome Extension Components

```
Chrome Extension (Manifest V3, TypeScript)
├── manifest.json
│   ├── permissions: activeTab, storage, debugger, tabs
│   ├── host_permissions: <all_urls> (for network capture)
│   ├── background: { service_worker: "background.js", type: "module" }
│   ├── content_scripts: [{ matches: ["<all_urls>"], js: ["content.js"] }]
│   └── action: { default_popup: "popup.html" }
│
├── Service Worker (background/service-worker.ts)
│   ├── Listens for "capture" message from popup
│   ├── Orchestrates data collection from content script + browser APIs
│   ├── Collects: screenshot, console logs, network HAR, env fingerprint
│   ├── Packages payload + files → POST /api/v1/bugs (multipart)
│   ├── Handles auth token storage (chrome.storage.local)
│   └── Shows notification on success/failure
│
├── Content Script (content/collector.ts)
│   ├── Injected into active tab
│   ├── Captures: DOM snapshot (outerHTML), computed styles
│   ├── Intercepts console.log/warn/error (last 500 entries)
│   ├── Captures performance metrics (LCP, CLS, FID, TTFB)
│   └── Sends collected data back to service worker via chrome.runtime
│
├── Popup UI (popup/Popup.tsx)
│   ├── Login form (email + password → store JWT)
│   ├── Project selector dropdown
│   ├── Title + description input
│   ├── Severity selector (P0-P3)
│   ├── "Capture & Submit" button → triggers service worker
│   └── Status display (capturing... / submitted / error)
│
└── Lib Modules
    ├── screenshot.ts → chrome.tabs.captureVisibleTab (PNG)
    ├── console.ts → circular buffer of console entries
    ├── network.ts → chrome.debugger.attach + Network.enable → HAR
    ├── fingerprint.ts → navigator.userAgent, screen, language, timezone
    └── api.ts → fetch wrapper with JWT, multipart form builder
```

---

## 3. Data Flow Diagram

### Bug Capture Flow (Primary Path)

```
User clicks "Capture Bug" in extension popup
  │
  ▼
┌─────────────────────────────────────────────────────┐
│  EXTENSION: Service Worker                            │
│                                                       │
│  1. Send message to content script                   │
│  2. Content script collects:                         │
│     ├─ DOM snapshot (document.documentElement.outerHTML)
│     ├─ Console buffer (last 500 entries)              │
│     ├─ Performance metrics (LCP, CLS, FID, TTFB)     │
│     └─ Returns via chrome.runtime.sendMessage         │
│  3. Service worker collects:                         │
│     ├─ Screenshot (chrome.tabs.captureVisibleTab)    │
│     ├─ Network HAR (chrome.debugger, last 100 reqs)  │
│     ├─ Env fingerprint (OS, browser, resolution)     │
│     └─ Active tab URL + title                        │
│  4. Package: FormData with files + JSON metadata     │
│                                                       │
│  ⚠ All in ONE burst (service worker 30s timeout)     │
└──────────────────────┬──────────────────────────────┘
                       │ POST /api/v1/bugs (multipart)
                       ▼
┌─────────────────────────────────────────────────────┐
│  API: FastAPI Route Handler                           │
│                                                       │
│  1. Validate JWT → extract user_id, tenant_id        │
│  2. Parse multipart: title, description, project_id, │
│     severity, captures[] (files)                     │
│  3. Create bug_reports row (status='open')           │
│  4. For each file:                                   │
│     ├─ Upload to MinIO: {tenant}/{bug_id}/{type}/    │
│     └─ Create bug_captures row with file_url         │
│  5. Write audit_log entry                            │
│  6. Enqueue ARQ task: triage_bug(bug_id)            │
│  7. Return 201 with bug_id + status                  │
└──────────────────────┬──────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
   ┌────────────────┐    ┌────────────────┐
   │  ARQ Worker     │    │  API Response   │
   │  triage_bug     │    │  → Extension    │
   │                  │    │  → Show success │
   │  1. Build prompt │    │    notification │
   │     from bug +   │    └────────────────┘
   │     captures     │
   │  2. Call 9Router │
   │     /v1/chat/    │
   │     completions  │
   │  3. Parse JSON   │
   │     response     │
   │  4. Update bug:  │
   │     severity,    │
   │     component,   │
   │     risk_score   │
   │  5. Embed bug    │
   │     title+desc   │
   │     → pgvector   │
   │  6. Cosine sim   │
   │     search for   │
   │     duplicates   │
   │  7. If dup found │
   │     (≥0.85):     │
   │     set duplicate│
   │     _of field    │
   │  8. Enqueue:     │
   │     create_jira  │
   │     _ticket      │
   │     send_slack   │
   │     _notify      │
   └───────┬─────────┘
           │
   ┌───────┴──────────────────────────────────┐
   │                                           │
   ▼                                           ▼
┌──────────────────┐               ┌──────────────────┐
│  Jira Integration │               │  Slack Integration│
│                    │               │                    │
│  POST /rest/api/3 │               │  POST /chat.      │
│  /issue            │               │  postMessage      │
│  ├─ project (ID)  │               │  ├─ channel       │
│  ├─ issuetype (ID)│               │  ├─ blocks        │
│  ├─ summary       │               │  │  (bug title,   │
│  ├─ description   │               │  │   severity,    │
│  ├─ priority      │               │  │   screenshot   │
│  └─ labels        │               │  │   link)        │
│                    │               │  └─ attachments   │
│  → Update bug.    │               │                    │
│    ticket_url     │               │                    │
└──────────────────┘               └──────────────────┘
```

### Frontend Polling Flow (Real-Time Substitute)

```
Dashboard (BugListPage)
  │
  ├─ On mount: GET /bugs?project_id=X&status=open
  │
  ├─ useEffect: setInterval every 10s
  │   └─ GET /bugs?project_id=X&status=open&updated_after={last_poll}
  │   └─ Merge results into local state (Zustand store)
  │
  ├─ On status change action:
  │   └─ PATCH /bugs/{id} { status: "triaging" }
  │   └─ Optimistic update + revalidate on error
  │
  └─ On unmount: clearInterval
```

### State Machine (Bug Lifecycle)

```
                    ┌─────────────────────────┐
                    │                         │
                    ▼                         │
  ┌────────┐   ┌──────────┐   ┌─────────┐   │
  │  OPEN   │──▶│ TRIAGING │──▶│ TRIAGED │───┘
  └────────┘   └──────────┘   └─────────┘
                                  │  │
                          ┌───────┘  └───────┐
                          ▼                   ▼
                    ┌──────────┐        ┌──────────┐
                    │   OPEN   │        │  CLOSED   │
                    │ (reopen) │        │           │
                    └──────────┘        └─────┬─────┘
                                              │
                                              ▼
                                        ┌──────────┐
                                        │   OPEN   │
                                        │ (reopen) │
                                        └──────────┘

Valid Transitions:
  open     → triaging   (auto: when triage task starts)
  triaging → triaged    (auto: when triage task completes)
  triaged  → closed     (manual: user resolves)
  triaged  → open       (manual: user reopens / needs more info)
  closed   → open       (manual: user reopens)

Invalid transitions return 400 Bad Request.
```

---

## 4. API Contract Detail

### Base URL

```
Development: http://localhost:8000/api/v1
```

### Common Headers

```
Authorization: Bearer <jwt_access_token>
Content-Type: application/json (or multipart/form-data for uploads)
X-Request-ID: <uuid> (optional, auto-generated if missing)
```

### Common Error Envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "Title is required",
    "details": [
      { "field": "title", "message": "Field required" }
    ]
  }
}
```

Standard HTTP codes: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `500`

---

### 4.1 Authentication

#### `POST /auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "qa@company.com",
  "password": "SecurePass123!",
  "name": "Jane QA"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "qa@company.com",
    "name": "Jane QA",
    "role": "qa",
    "tenant_id": "uuid"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errors:** `409` (email exists), `422` (weak password, invalid email)

**Decision:** First registered user auto-creates the default tenant and gets `admin` role. Subsequent users join the same tenant (Phase 1 = single tenant).

---

#### `POST /auth/login`

**Request:**
```json
{
  "email": "qa@company.com",
  "password": "SecurePass123!"
}
```

**Response (200):** Same shape as register response.

**Errors:** `401` (invalid credentials)

---

#### `POST /auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errors:** `401` (expired/invalid refresh token)

---

### 4.2 Bug Reports

#### `POST /bugs` (multipart/form-data)

Create a new bug report with optional capture files.

**Request:**
```
Content-Type: multipart/form-data

Fields:
  title         (string, required, max 500)
  description   (string, optional)
  project_id    (uuid, required)
  severity      (string, optional: P0|P1|P2|P3, default: null — AI assigns)
  steps_to_reproduce  (string, optional)
  expected_behavior   (string, optional)
  actual_behavior     (string, optional)

Files:
  captures[]    (optional, multiple files — screenshots, logs, HAR, etc.)
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Login button unresponsive on Safari 17",
  "project_id": "uuid",
  "severity": null,
  "status": "open",
  "component": null,
  "risk_score": null,
  "assignee_id": null,
  "reporter_id": "uuid",
  "duplicate_of": null,
  "captures": [
    {
      "id": "uuid",
      "capture_type": "screenshot",
      "file_url": "http://localhost:9000/qara-captures/...",
      "file_size_bytes": 245000,
      "created_at": "2026-06-22T10:30:00Z"
    }
  ],
  "created_at": "2026-06-22T10:30:00Z",
  "updated_at": "2026-06-22T10:30:00Z"
}
```

**Side Effects:**
- Enqueues `triage_bug` ARQ task (LLM classify + embed + dedup)
- After triage completes: enqueues `create_jira_ticket` + `send_slack_notify` (if integrations configured)

**Errors:** `401` (unauth), `404` (project not found), `422` (validation)

---

#### `GET /bugs`

List bugs with filters and pagination.

**Query Parameters:**
```
project_id    (uuid, required)
status        (string, optional: open|triaging|triaged|closed)
severity      (string, optional: P0|P1|P2|P3)
assignee_id   (uuid, optional)
search        (string, optional — ILIKE on title + description)
sort_by       (string, optional: created_at|updated_at|severity|risk_score, default: created_at)
sort_order    (string, optional: asc|desc, default: desc)
page          (int, default: 1)
page_size     (int, default: 20, max: 100)
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Login button unresponsive",
      "severity": "P1",
      "status": "triaged",
      "component": "auth",
      "risk_score": 6.5,
      "assignee": { "id": "uuid", "name": "Jane", "email": "jane@co.com" },
      "reporter": { "id": "uuid", "name": "Bob", "email": "bob@co.com" },
      "capture_count": 3,
      "created_at": "2026-06-22T10:30:00Z",
      "updated_at": "2026-06-22T11:00:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

#### `GET /bugs/{id}`

Get bug detail with captures and similar bugs.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Login button unresponsive on Safari 17",
  "description": "...",
  "steps_to_reproduce": "...",
  "expected_behavior": "...",
  "actual_behavior": "...",
  "severity": "P1",
  "status": "triaged",
  "component": "auth",
  "risk_score": 6.5,
  "assignee": { "id": "uuid", "name": "Jane" },
  "reporter": { "id": "uuid", "name": "Bob" },
  "duplicate_of": null,
  "env_fingerprint": {
    "os": "macOS 15.2",
    "browser": "Safari 17.6",
    "resolution": "2560x1440",
    "language": "en-US"
  },
  "captures": [
    {
      "id": "uuid",
      "capture_type": "screenshot",
      "file_url": "http://...",
      "file_size_bytes": 245000,
      "metadata": {},
      "created_at": "2026-06-22T10:30:00Z"
    }
  ],
  "similar_bugs": [
    { "id": "uuid", "title": "Login fails in Safari private mode", "similarity": 0.72 }
  ],
  "ticket_url": "https://company.atlassian.net/browse/QA-456",
  "created_at": "2026-06-22T10:30:00Z",
  "updated_at": "2026-06-22T11:00:00Z"
}
```

---

#### `PATCH /bugs/{id}`

Update bug fields and/or transition state.

**Request (partial):**
```json
{
  "status": "triaging",
  "assignee_id": "uuid",
  "severity": "P1",
  "component": "auth",
  "title": "Updated title"
}
```

**State Transition Rules:**
- Only these transitions are valid: `open→triaging`, `triaging→triaged`, `triaged→closed`, `triaged→open`, `closed→open`
- Invalid transitions → `400` with message: `"Invalid transition: triaging → closed"`
- When `status` changes to `closed`, `resolved_at` is auto-set
- When `status` changes from `closed` to `open`, `resolved_at` is cleared

**Response (200):** Full bug object (same as GET /bugs/{id}).

**Errors:** `400` (invalid transition), `401`, `404`, `422`

---

#### `GET /bugs/{id}/similar`

Find similar bugs via pgvector cosine similarity.

**Query Parameters:**
```
limit      (int, default: 5, max: 20)
threshold  (float, default: 0.7, min: 0.0, max: 1.0)
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Login fails in Safari private mode",
      "severity": "P2",
      "status": "closed",
      "similarity": 0.82
    }
  ]
}
```

---

### 4.3 Captures

#### `POST /captures/upload` (multipart/form-data)

Upload additional capture files to an existing bug.

**Request:**
```
bug_report_id  (uuid, required)
capture_type   (string, required: screenshot|video|console_log|network_har|dom_snapshot|env_fingerprint|session_replay)
file           (binary, required)
```

**Response (201):**
```json
{
  "id": "uuid",
  "bug_report_id": "uuid",
  "capture_type": "screenshot",
  "file_url": "http://...",
  "file_size_bytes": 245000,
  "created_at": "2026-06-22T10:30:00Z"
}
```

**File Size Limit:** 50MB per file (configured via uvicorn `--limit-max-request-size 52428800`).

**Errors:** `401`, `404` (bug not found), `413` (file too large), `422`

---

#### `GET /captures/{id}`

Download or redirect to a capture file.

**Response:** `302` redirect to MinIO presigned URL (1h expiry).

---

#### `GET /captures/bug/{bug_id}`

List all captures for a bug.

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "capture_type": "screenshot",
      "file_url": "http://...",
      "file_size_bytes": 245000,
      "created_at": "2026-06-22T10:30:00Z"
    }
  ]
}
```

---

### 4.4 Projects

#### `POST /projects`

**Request:**
```json
{
  "name": "Payment Service",
  "vcs_url": "https://github.com/org/payment-service"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Payment Service",
  "vcs_url": "https://github.com/org/payment-service",
  "settings": {
    "auto_create_test_case": true,
    "auto_assign": true,
    "triage_model": "ai"
  },
  "created_at": "2026-06-22T10:30:00Z"
}
```

---

#### `GET /projects`

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Payment Service",
      "bug_count": 47,
      "created_at": "2026-06-22T10:30:00Z"
    }
  ]
}
```

---

#### `GET /projects/{id}`

Full project detail (same shape as POST response + bug_count).

#### `PATCH /projects/{id}`

Update project name, vcs_url, or settings.

---

### 4.5 Integrations

#### `POST /integrations`

**Request:**
```json
{
  "provider": "jira",
  "config": {
    "url": "https://company.atlassian.net",
    "email": "qa@company.com",
    "api_token": "xxx",
    "project_key": "QA"
  }
}
```

Or for Slack:
```json
{
  "provider": "slack",
  "config": {
    "bot_token": "xoxb-...",
    "channel": "#qa-alerts"
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "provider": "jira",
  "enabled": true,
  "config": {
    "url": "https://company.atlassian.net",
    "email": "qa@company.com",
    "api_token": "***",
    "project_key": "QA"
  },
  "created_at": "2026-06-22T10:30:00Z"
}
```

**Note:** Sensitive config fields (`api_token`, `bot_token`) are masked in responses.

---

#### `GET /integrations`

List all integrations for tenant (sensitive fields masked).

#### `DELETE /integrations/{id}`

Remove an integration. Returns `204`.

#### `POST /integrations/{id}/test`

Test integration connectivity.

**Response (200):**
```json
{
  "success": true,
  "message": "Connected to Jira. Found project QA with 12 issue types."
}
```

---

### 4.6 Health

#### `GET /health`

**Response (200):**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-06-22T10:30:00Z"
}
```

#### `GET /ready`

Checks DB, Redis, MinIO connectivity.

**Response (200):**
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "minio": "ok",
    "9router": "ok"
  }
}
```

**Response (503):** If any check fails.

---

## 5. Database Migration Plan

### Overview

- **ORM:** SQLAlchemy 2.0 async with asyncpg
- **Migrations:** Alembic with async env.py
- **Extension:** pgvector (for bug embedding + similarity search)
- **Single tenant:** `tenant_id` column exists on all tables but Phase 1 seeds one default tenant

### Deviation from Blueprint

The blueprint `data-model.md` users table has no `password_hash` or `name` columns. Phase 1 adds both because we use password auth (not SSO) and need a display name.

```sql
-- ADDITIONS to users table (not in blueprint):
ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN refresh_token_hash VARCHAR(255);
```

### Migration Order

```
001_create_tenants
│   └─ tenants table
│
002_create_users
│   ├─ users table (with name, password_hash, refresh_token_hash)
│   └─ Index: users.email (unique)
│   └─ Index: users.tenant_id
│
003_create_projects
│   ├─ projects table
│   └─ Index: projects.tenant_id
│
004_create_bug_reports
│   ├─ bug_reports table
│   ├─ Index: bug_reports.project_id + status
│   ├─ Index: bug_reports.assignee_id
│   ├─ Index: bug_reports.severity
│   └─ Index: bug_reports.created_at (for sorting)
│
005_create_bug_captures
│   ├─ bug_captures table
│   └─ Index: bug_captures.bug_report_id
│
006_create_integrations
│   ├─ integrations table
│   └─ Index: integrations.tenant_id + provider (unique)
│
007_create_audit_log
│   ├─ audit_log table (partitioned by created_at RANGE)
│   ├─ Create initial partition: audit_log_y2026 (2026-01-01 to 2027-01-01)
│   └─ Index: audit_log.tenant_id + entity_id
│
008_create_bug_embeddings
│   ├─ CREATE EXTENSION IF NOT EXISTS vector
│   ├─ bug_embeddings table:
│   │   id UUID PK
│   │   bug_report_id UUID FK → bug_reports(id) ON DELETE CASCADE
│   │   embedding vector(384)     ← 384 for 9Router / TF-IDF
│   │   created_at TIMESTAMPTZ
│   ├─ Index: IVFFlat on embedding (lists = 100) — CREATE CONCURRENTLY
│   └─ Note: If table empty at migration time, defer index creation
│            to seed script or use HNSW (works on empty tables)
```

### Full DDL (for reference)

```sql
-- 001: Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(20) NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 002: Users (DEVIATION: added name, password_hash, refresh_token_hash)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'qa',
    preferences JSONB DEFAULT '{}',
    slack_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- 003: Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    vcs_url VARCHAR(500),
    settings JSONB DEFAULT '{
        "auto_create_test_case": true,
        "auto_assign": true,
        "triage_model": "ai"
    }',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);

-- 004: Bug Reports
CREATE TABLE bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    severity VARCHAR(5) CHECK (severity IN ('P0','P1','P2','P3')),
    status VARCHAR(20) DEFAULT 'open',
    component VARCHAR(255),
    assignee_id UUID REFERENCES users(id),
    reporter_id UUID REFERENCES users(id),
    duplicate_of UUID REFERENCES bug_reports(id),
    risk_score DECIMAL(5,2),
    regression_zones JSONB,
    env_fingerprint JSONB,
    ticket_url VARCHAR(1000),
    metadata JSONB,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bugs_project_status ON bug_reports(project_id, status);
CREATE INDEX idx_bugs_assignee ON bug_reports(assignee_id);
CREATE INDEX idx_bugs_severity ON bug_reports(severity);
CREATE INDEX idx_bugs_created ON bug_reports(created_at DESC);

-- 005: Bug Captures
CREATE TABLE bug_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID REFERENCES bug_reports(id) ON DELETE CASCADE,
    capture_type VARCHAR(20) NOT NULL
        CHECK (capture_type IN (
            'screenshot','video','console_log','network_har',
            'dom_snapshot','env_fingerprint','session_replay'
        )),
    file_url VARCHAR(1000),
    file_size_bytes BIGINT,
    content_hash VARCHAR(64),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_captures_bug ON bug_captures(bug_report_id);

-- 006: Integrations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

-- 007: Audit Log (partitioned)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_log_y2026 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE INDEX idx_audit_tenant_entity ON audit_log(tenant_id, entity_id);

-- 008: Bug Embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE bug_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID REFERENCES bug_reports(id) ON DELETE CASCADE UNIQUE,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use HNSW instead of IVFFlat for empty table safety
CREATE INDEX idx_bug_embeddings_vector
    ON bug_embeddings USING hnsw (embedding vector_cosine_ops);
```

### Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Vector index type | **HNSW** (not IVFFlat) | HNSW works on empty tables; IVFFlat requires data to build meaningful clusters. Slightly more memory but fine for Phase 1 scale. |
| Embedding dimension | **384** (not 1536) | 9Router local models and TF-IDF fallback produce smaller vectors. Can migrate to 1536 in Phase 2 if using OpenAI embeddings. |
| ticket_url on bug_reports | **Added** | Blueprint stores this implicitly via integrations. Phase 1 denormalizes for simpler queries. |
| Partitioning audit_log | **Yes, by year** | Even in Phase 1, audit logs grow fast. Yearly partitions make retention management trivial. |
| password_hash in users | **Added** | Blueprint assumes SSO. Phase 1 uses bcrypt password auth. |
| name in users | **Added** | Blueprint has no display name. Dashboard and notifications need it. |

---

## 6. 9Router Integration Spec

### Connection

```
Base URL:    http://host.docker.internal:20128/v1
             (from Docker containers; use localhost:20128 from host)
Model:       qoder/qmodel-latest
API Key:     (not required for local 9Router, send dummy header)
Protocol:    OpenAI-compatible REST API
```

### Docker Networking

9Router runs on the **host machine** at `127.0.0.1:20128`, not inside Docker. Docker containers access it via:

```yaml
# docker-compose.yml
services:
  api:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      NINE_ROUTER_URL: "http://host.docker.internal:20128/v1"
```

### Endpoints Used

#### Chat Completion (Bug Classification)

```
POST /v1/chat/completions

{
  "model": "qoder/qmodel-latest",
  "messages": [
    {
      "role": "system",
      "content": "You are a QA triage specialist..."
    },
    {
      "role": "user",
      "content": "<bug report details>"
    }
  ],
  "temperature": 0.2,
  "response_format": { "type": "json_object" }
}
```

#### Embeddings (Bug Similarity)

```
POST /v1/embeddings

{
  "model": "qoder/qmodel-latest",
  "input": "Login button unresponsive on Safari 17"
}
```

**Response:**
```json
{
  "data": [{ "embedding": [0.12, -0.34, ...], "index": 0 }],
  "model": "qoder/qmodel-latest"
}
```

### Bug Classification Prompt Template

```python
TRIAGE_SYSTEM_PROMPT = """You are a QA triage specialist. Analyze the bug report and return a JSON classification.

Severity Levels:
- P0: Critical path broken, revenue impact, no workaround
- P1: Major feature broken, workaround exists
- P2: Minor feature broken, non-critical
- P3: Cosmetic, edge case, low impact

Respond with ONLY a JSON object:
{
  "severity": "P0" | "P1" | "P2" | "P3",
  "component": "component-name",
  "risk_score": 0.0,
  "summary": "One-line triage summary",
  "suggested_assignee_role": "backend-dev" | "frontend-dev" | "devops" | "qa"
}"""

TRIAGE_USER_TEMPLATE = """Bug Report:
Title: {title}
Description: {description}
Steps to Reproduce: {steps_to_reproduce}
Expected: {expected_behavior}
Actual: {actual_behavior}
URL: {url}
Browser: {browser}
OS: {os}
Console Errors: {console_errors}
"""
```

### TF-IDF Fallback

If `POST /v1/embeddings` returns `404` or times out, fall back to TF-IDF:

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class TfidfEmbedder:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=384)
        self.matrix = None
        self.texts = []

    def fit(self, texts: list[str]):
        self.texts = texts
        self.matrix = self.vectorizer.fit_transform(texts)

    def embed(self, text: str) -> list[float]:
        vec = self.vectorizer.transform([text])
        # Return as 384-dim vector (padded/truncated)
        arr = vec.toarray()[0]
        if len(arr) < 384:
            arr = np.pad(arr, (0, 384 - len(arr)))
        return arr[:384].tolist()

    def similarity(self, text: str) -> list[tuple[int, float]]:
        vec = self.vectorizer.transform([text])
        sims = cosine_similarity(vec, self.matrix)[0]
        return sorted(enumerate(sims), key=lambda x: -x[1])
```

### Feature Flag

```python
# app/config.py
class Settings(BaseSettings):
    nine_router_url: str = "http://host.docker.internal:20128/v1"
    nine_router_model: str = "qoder/qmodel-latest"
    embedding_provider: Literal["9router", "tfidf"] = "9router"  # feature flag
    embedding_dimension: int = 384
```

On startup, probe `/v1/embeddings` with a test input. If 404 or timeout, auto-switch to `tfidf`:

```python
async def probe_embedding_endpoint():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.nine_router_url}/embeddings",
                json={"model": settings.nine_router_model, "input": "test"}
            )
            if resp.status_code == 200:
                return "9router"
    except (httpx.TimeoutException, httpx.ConnectError):
        pass
    return "tfidf"
```

### Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Model | `qoder/qmodel-latest` | Via 9Router Round Robin (10 accounts). Cheap, fast, good enough for classification. |
| Embedding fallback | **TF-IDF** | 9Router embedding endpoint may not exist. TF-IDF + cosine similarity is a reasonable fallback for < 100K bugs. |
| Response format | `json_object` | Forces structured output from LLM. Avoids regex parsing of freeform text. |
| Temperature | `0.2` | Low temperature for consistent classification. Not creative work. |
| Timeout | `30s` | Classification must complete within ARQ task timeout. 30s is generous for local LLM. |

---

## 7. Risk Assessment

### Technical Risks

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | **9Router unavailable during dev** | Triage pipeline fails | Medium | TF-IDF fallback for embeddings. LLM classify task retries 3x with exponential backoff. Bug created without AI fields; user can manually set severity. |
| 2 | **pgvector performance at scale** | Similarity search slows | Low (Phase 1) | Phase 1 target < 100K bugs. HNSW index handles this easily. Phase 2 migrates to Qdrant if needed. |
| 3 | **MinIO init race condition** | App starts before MinIO bucket exists | High | `depends_on` with `service_started` + retry loop in storage service init (5 retries, 2s apart). |
| 4 | **Chrome extension service worker timeout** | Capture data incomplete | Medium | Collect ALL data in one burst. Service worker sends message to content script, waits for response, then sends to API. Total time < 10s. |
| 5 | **CORS blocks extension requests** | Extension can't reach API | High | FastAPI CORS middleware explicitly allows `chrome-extension://*` origins. Configurable via env var `CORS_ORIGINS`. |
| 6 | **Large file uploads timeout** | Upload fails for video captures | Medium | Set uvicorn `--limit-max-request-size 52428800` (50MB). Streaming upload for files > 10MB. |
| 7 | **Alembic async misconfiguration** | Migrations fail silently | Medium | Use `asyncio.run()` pattern in `env.py`. Test migration in CI. Never use sync Alembic with async engine. |
| 8 | **ARQ worker crashes on LLM timeout** | Triage backlog grows | Medium | ARQ task has `max_tries=3`, `retry_delay=10`. Dead letter: mark bug as `triage_failed`, allow manual retry. |
| 9 | **Jira API v3 project/issue type IDs** | Ticket creation fails | High | Cache project + issue type mapping on first use. Validate on integration test endpoint. Show clear error if project_key not found. |
| 10 | **Docker host networking on Linux** | Containers can't reach 9Router | High | Add `extra_hosts: ["host.docker.internal:host-gateway"]` to docker-compose.yml. Document Linux-specific setup. |

### Trade-off Analysis

| Decision | Option A | Option B | Chosen | Why |
|---|---|---|---|---|
| Task queue | Celery | ARQ | **ARQ** | Async-native, lighter, same Redis. Celery is overkill for 3 task types. Trade-off: smaller ecosystem, fewer docs. |
| Vector DB | Qdrant | pgvector | **pgvector** | One less service to run. Simpler ops. Trade-off: fewer ANN algorithms, no built-in filtering. Fine for Phase 1. |
| Auth | SSO/SAML | Password + JWT | **Password + JWT** | Phase 1 = dev/internal tool. SSO adds weeks of work. Trade-off: must migrate to SSO in Phase 2. |
| Real-time | WebSocket/SSE | 10s Polling | **Polling** | Phase 1 dashboard shows bug list, not live metrics. Polling is trivial to implement and debug. Trade-off: 10s delay, more HTTP requests. |
| Frontend | Next.js (SSR) | Vite SPA | **Vite SPA** | No SSR needed for authenticated dashboard. Simpler deployment. Trade-off: no SEO (irrelevant for internal tool). |
| State machine | Configurable | Hardcoded | **Hardcoded** | Only 5 transitions in Phase 1. Building a configurable engine is premature. Trade-off: must refactor in Phase 2. |
| Multi-tenant | RLS policies | Column only | **Column only** | Single tenant in Phase 1. `tenant_id` column ready for Phase 2 RLS. Trade-off: no isolation guarantees yet. |

### Decision Log

| Decision | Context | Outcome |
|---|---|---|
| No WebSocket in Phase 1 | Blueprint mentions real-time extensively | 10s polling is sufficient for bug list dashboard. WebSocket adds complexity (connection management, reconnection, backpressure) with no Phase 1 requirement. |
| No RabbitMQ in Phase 1 | Blueprint uses RabbitMQ for event bus | ARQ + Redis covers all Phase 1 async needs. RabbitMQ adds operational complexity for event-driven orchestration that Phase 1 doesn't need. |
| No Qdrant in Phase 1 | Blueprint uses Qdrant for vector search | pgvector is sufficient for < 100K bug embeddings. One less container in docker-compose. |
| No Neo4j in Phase 1 | Blueprint uses Neo4j for graph relationships | Phase 1 doesn't need bug×module×test coupling analysis. SQL JOINs cover the simple relationships. |
| No Elasticsearch in Phase 1 | Blueprint mentions full-text search | PostgreSQL `ILIKE` and `to_tsvector` are sufficient for Phase 1 search volume. |
| No TimescaleDB in Phase 1 | Blueprint uses TimescaleDB for metrics | Phase 1 dashboard shows basic counts, not time-series analytics. Regular PostgreSQL aggregation is fine. |

---

## 8. Implementation Order

### Phase 1A: Infrastructure & Core (Week 1-2)

```
Step 1: Docker Compose + Environment Setup                     [4h]
  ├─ docker-compose.yml: postgres (pgvector/pgvector:pg16),
  │   redis (7-alpine), minio, api, worker, frontend
  ├─ .env.example with all config vars
  ├─ extra_hosts for host.docker.internal
  ├─ Health checks for all services
  ├─ minio-init container: create qara-captures bucket
  └─ Verify: docker compose up → all services healthy

Step 2: FastAPI Project Skeleton                               [4h]
  ├─ pyproject.toml: fastapi, uvicorn, sqlalchemy[asyncio],
  │   asyncpg, alembic, pydantic-settings, python-jose,
  │   passlib[bcrypt], python-multipart, boto3, httpx, arq
  ├─ app/main.py: app factory, CORS, lifespan, router includes
  ├─ app/config.py: pydantic-settings with all env vars
  ├─ app/database.py: async engine + session factory
  ├─ app/dependencies.py: get_db, get_current_user stubs
  └─ Verify: uvicorn starts, GET /health returns 200

Step 3: Alembic + Database Migrations                          [6h]
  ├─ alembic init with async env.py (asyncio.run pattern)
  ├─ Migration 001-008: all tables per §5
  ├─ Seed script: default tenant + admin user + sample project
  ├─ app/models/: SQLAlchemy ORM models matching migrations
  └─ Verify: alembic upgrade head → all tables created

Step 4: Auth System                                            [6h]
  ├─ app/services/auth_service.py: register, login, refresh
  ├─ bcrypt password hashing
  ├─ JWT access_token (1h) + refresh_token (30d) with python-jose
  ├─ app/routes/auth.py: /auth/register, /auth/login, /auth/refresh
  ├─ app/dependencies.py: get_current_user (JWT decode + DB lookup)
  ├─ First user auto-creates default tenant with admin role
  └─ Verify: register → login → access protected route → refresh
```

### Phase 1B: Bug Management (Week 2-3)

```
Step 5: Bug CRUD + State Machine                               [8h]
  ├─ app/services/bug_service.py:
  │   create, list (with filters/pagination), get, update, delete
  │   state transition validator (hardcoded: 5 valid transitions)
  ├─ app/routes/bugs.py:
  │   POST /bugs (multipart: title, desc, project_id, captures[])
  │   GET /bugs (filters: status, severity, assignee, search, sort)
  │   GET /bugs/{id} (detail + captures + similar)
  │   PATCH /bugs/{id} (update + state transition)
  │   GET /bugs/{id}/similar (pgvector cosine search)
  ├─ app/schemas/bug.py: Pydantic models for all request/response
  └─ Verify: create bug → list → get → update status → invalid transition → 400

Step 6: Capture Upload + MinIO Storage                         [6h]
  ├─ app/services/storage_service.py:
  │   MinIO client init, create_bucket, put_object, get_presigned_url
  │   Path: {tenant_id}/{bug_id}/{capture_type}/{filename}
  ├─ app/services/capture_service.py:
  │   upload (file → MinIO → DB record), list by bug, get presigned URL
  ├─ app/routes/captures.py:
  │   POST /captures/upload (multipart: bug_report_id, capture_type, file)
  │   GET /captures/{id} (302 redirect to presigned URL)
  │   GET /captures/bug/{bug_id} (list captures)
  ├─ POST /bugs integrates capture upload inline (multipart files)
  ├─ File size limit: 50MB (uvicorn config)
  └─ Verify: upload screenshot → download via presigned URL → list captures

Step 7: Project Management                                     [3h]
  ├─ app/routes/projects.py: CRUD
  ├─ app/services/project_service.py
  ├─ app/schemas/project.py
  └─ Verify: create project → list → update → bugs reference project
```

### Phase 1C: AI Triage (Week 3-4)

```
Step 8: 9Router LLM Client                                     [6h]
  ├─ app/llm/client.py: OpenAI-compatible async client (httpx)
  │   Chat completion, embedding
  │   Timeout: 30s, retry: 3x with exponential backoff
  ├─ app/llm/prompts.py: TRIAGE_SYSTEM_PROMPT, TRIAGE_USER_TEMPLATE
  ├─ app/llm/embeddings.py: 9Router embed + TF-IDF fallback
  ├─ Startup probe: detect embedding provider (9router vs tfidf)
  └─ Verify: classify sample bug → get severity/component/risk_score

Step 9: ARQ Worker + Triage Task                               [6h]
  ├─ app/tasks/worker.py: ARQ WorkerSettings (Redis broker)
  ├─ app/tasks/triage_task.py:
  │   1. Load bug + captures from DB
  │   2. Build prompt from bug data + console errors + env
  │   3. Call 9Router /v1/chat/completions
  │   4. Parse JSON response → update bug (severity, component, risk_score)
  │   5. Generate embedding for bug title+description
  │   6. Store embedding in bug_embeddings table
  │   7. Cosine similarity search for duplicates (threshold: 0.85)
  │   8. If duplicate found: set duplicate_of field
  │   9. Enqueue Jira + Slack tasks (if integrations configured)
  ├─ POST /bugs enqueues triage_bug task after creation
  ├─ ARQ worker runs as separate Docker container
  └─ Verify: create bug → triage runs → severity assigned → embedding stored

Step 10: Bug Embedding + Similarity Search                     [4h]
  ├─ Store embedding on triage (vector(384))
  ├─ GET /bugs/{id}/similar:
  │   SELECT bug_report_id, 1 - (embedding <=> $1) AS similarity
  │   FROM bug_embeddings
  │   WHERE 1 - (embedding <=> $1) > $threshold
  │   ORDER BY embedding <=> $1
  │   LIMIT $limit
  ├─ TF-IDF fallback: in-memory similarity if 9Router unavailable
  └─ Verify: create 5 similar bugs → similarity search returns correct matches
```

### Phase 1D: Integrations (Week 4-5)

```
Step 11: Jira Integration                                      [6h]
  ├─ app/integrations/jira_client.py:
  │   Async Jira REST API v3 client (httpx)
  │   create_issue: project_id, issuetype_id, summary, description, priority
  │   get_projects: cache project key → ID mapping
  │   get_issue_types: cache issue type name → ID mapping
  │   Priority mapping: P0→Highest, P1→High, P2→Medium, P3→Low
  ├─ app/tasks/integration_task.py:
  │   create_jira_ticket(bug_id) → POST /rest/api/3/issue
  │   → Update bug.ticket_url with response
  ├─ app/routes/integrations.py:
  │   POST /integrations (store encrypted config)
  │   POST /integrations/{id}/test (validate connection)
  └─ Verify: configure Jira → create bug → triage → ticket created → ticket_url set

Step 12: Slack Integration                                     [4h]
  ├─ app/integrations/slack_client.py:
  │   Async Slack Web API client (httpx)
  │   post_message: channel, blocks (Block Kit)
  │   Message template: bug title, severity badge, screenshot, link
  ├─ app/tasks/integration_task.py:
  │   send_slack_notify(bug_id) → POST /chat.postMessage
  ├─ Triggered after triage completes (if Slack integration configured)
  └─ Verify: configure Slack → create bug → triage → Slack message posted

Step 13: Integration CRUD + Config                             [3h]
  ├─ app/routes/integrations.py: full CRUD
  ├─ Sensitive fields masked in responses (api_token, bot_token)
  ├─ Config stored as JSONB (Phase 1: no column-level encryption)
  ├─ app/schemas/integration.py
  └─ Verify: add Jira → add Slack → list → test connection → delete
```

### Phase 1E: Frontend Dashboard (Week 5-7)

```
Step 14: Frontend Skeleton + Auth                              [8h]
  ├─ Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui
  ├─ React Router v7: /login, /, /bugs, /bugs/new, /bugs/:id
  ├─ API client: fetch wrapper with JWT injection + auto-refresh
  ├─ Auth store (Zustand): login, logout, token state
  ├─ ProtectedRoute component: redirect to /login if no token
  ├─ LoginPage: email + password form
  ├─ Layout: sidebar (nav + project selector) + top bar + content
  └─ Verify: login → protected route → auto-refresh on 401

Step 15: Bug List + Dashboard                                  [8h]
  ├─ BugListPage: BugTable component with columns
  │   (title, severity badge, status badge, component, assignee, created)
  ├─ Filters: status, severity, search text
  ├─ Sorting: created_at, severity, risk_score
  ├─ Pagination (20 per page)
  ├─ 10s polling: setInterval → GET /bugs?updated_after={last}
  ├─ DashboardPage: StatsCards + RecentBugsWidget + SeverityChart
  └─ Verify: list bugs → filter → sort → paginate → auto-refresh

Step 16: Bug Detail + Create                                   [8h]
  ├─ BugDetailPage:
  │   Full bug info, status badge, severity badge
  │   CaptureViewer (tabs: screenshot, console, network, env)
  │   SimilarBugsList
  │   Status transition buttons (context-aware: show valid transitions)
  │   Assignee selector
  │   Ticket URL link (if Jira integration active)
  ├─ BugCreatePage:
  │   Form: title, description, project, severity (optional),
  │   steps to reproduce, expected/actual behavior
  │   File upload (drag & drop, multiple files)
  └─ Verify: create bug → view detail → transition status → see captures
```

### Phase 1F: Chrome Extension (Week 7-8)

```
Step 17: Extension Skeleton + Auth                             [6h]
  ├─ Manifest V3: permissions, background service worker, content script
  ├─ Vite + CRXJS for development
  ├─ Popup: login form → store JWT in chrome.storage.local
  ├─ API client: fetch wrapper with JWT, multipart builder
  ├─ Project selector (GET /projects)
  └─ Verify: install extension → login → select project

Step 18: Data Collection                                       [8h]
  ├─ screenshot.ts: chrome.tabs.captureVisibleTab → PNG blob
  ├─ console.ts: content script intercepts console.* → circular buffer (500)
  ├─ network.ts: chrome.debugger.attach → Network.enable → HAR format
  │   Last 100 requests, includes headers + timing
  ├─ fingerprint.ts: navigator.userAgent, screen, language, timezone
  ├─ content/collector.ts: DOM snapshot (outerHTML), perf metrics
  ├─ service-worker.ts: orchestrate all collectors in parallel
  │   ⚠ Must complete in < 25s (service worker 30s timeout)
  └─ Verify: click capture → all data collected in < 10s

Step 19: Submit to API                                         [4h]
  ├─ Package FormData: title, description, project_id, severity
  │   + files (screenshot, console_log.json, network.har, etc.)
  ├─ POST /api/v1/bugs (multipart)
  ├─ CORS: API must allow chrome-extension:// origin
  ├─ Success: show notification with bug link
  ├─ Error: show error message + retry button
  └─ Verify: capture → submit → bug appears in dashboard
```

### Phase 1G: CLI Tool (Week 8)

```
Step 20: CLI Skeleton                                          [4h]
  ├─ Node.js + Commander.js + TypeScript
  ├─ qara config set api-key / endpoint
  ├─ Config stored in ~/.qara/config.json
  ├─ qara bugs list --project X --status open --severity P1
  ├─ qara bugs create --title "..." --project X --screenshot ./file.png
  ├─ qara capture (interactive: prompt for title, project, files)
  ├─ qara integrations add jira/slack
  └─ Verify: config → create bug → list bugs → see in dashboard

Step 21: Audit Logging                                         [3h]
  ├─ app/middleware/audit.py: intercept state-changing requests
  ├─ Log: user_id, action, entity_type, entity_id, changes (JSON diff)
  ├─ Write to audit_log table (auto-partitioned)
  ├─ Include IP address and request_id
  └─ Verify: create bug → update status → check audit_log entries
```

### Phase 1H: Polish + Testing (Week 8-9)

```
Step 22: Test Suite                                            [8h]
  ├─ tests/conftest.py: async test client, DB fixture, auth fixture
  ├─ tests/test_auth.py: register, login, refresh, invalid creds
  ├─ tests/test_bugs.py: CRUD, state transitions, filters, pagination
  ├─ tests/test_captures.py: upload, download, list
  ├─ tests/test_triage.py: mock 9Router, verify classification applied
  ├─ tests/test_integrations.py: mock Jira/Slack, verify calls made
  └─ Target: 80% coverage on services layer

Step 23: Error Handling + Edge Cases                           [4h]
  ├─ Global exception handler → structured JSON errors
  ├─ Request ID propagation (X-Request-ID)
  ├─ Graceful degradation: bug created even if triage fails
  ├─ File upload: validate content type, size limit
  ├─ Concurrent state transitions: optimistic locking on status
  └─ Verify: all error paths return proper status codes + messages

Step 24: Documentation + Dev Experience                        [4h]
  ├─ README.md: quick start, docker compose up, first bug
  ├─ .env.example: all config vars with comments
  ├─ Makefile: dev, test, migrate, seed, lint commands
  ├─ Docker Compose: all services with health checks
  └─ Verify: fresh clone → docker compose up → create bug in < 5 min
```

### Milestones

| Milestone | Target | Exit Criteria |
|---|---|---|
| **M1: Infra + Auth** | Week 2 | Docker compose up, register/login, JWT working |
| **M2: Bug CRUD** | Week 3 | Create/list/update bugs, file upload, state machine |
| **M3: AI Triage** | Week 4 | Bug auto-classified, embedding stored, similar bugs found |
| **M4: Integrations** | Week 5 | Jira ticket created, Slack notification sent on bug triage |
| **M5: Dashboard** | Week 7 | Bug list, detail, create in React. 10s polling. |
| **M6: Extension** | Week 8 | Chrome extension captures + submits bugs to API |
| **M7: CLI + Polish** | Week 9 | CLI working, tests pass, docs complete |

### Effort Summary

| Module | Estimated Effort | Dependencies |
|---|---|---|
| Docker Compose + Env | 4h | None |
| FastAPI Skeleton | 4h | Docker |
| Alembic + Migrations | 6h | FastAPI skeleton |
| Auth System | 6h | Migrations |
| Bug CRUD + State Machine | 8h | Auth, Migrations |
| Capture Upload + MinIO | 6h | Bug CRUD |
| Project Management | 3h | Auth |
| 9Router LLM Client | 6h | Docker (9Router on host) |
| ARQ Worker + Triage | 6h | LLM Client, Bug CRUD |
| Embedding + Similarity | 4h | ARQ Worker |
| Jira Integration | 6h | Triage, Bug CRUD |
| Slack Integration | 4h | Triage, Bug CRUD |
| Integration CRUD | 3h | Auth |
| Frontend Skeleton + Auth | 8h | Auth API |
| Bug List + Dashboard | 8h | Bug API |
| Bug Detail + Create | 8h | Bug API, Capture API |
| Extension Skeleton | 6h | Auth API |
| Extension Data Collection | 8h | Extension skeleton |
| Extension Submit | 4h | Bug API, CORS config |
| CLI Tool | 4h | Bug API |
| Audit Logging | 3h | Migrations |
| Test Suite | 8h | All modules |
| Error Handling | 4h | All modules |
| Documentation | 4h | All modules |
| **Total** | **~133h (~17 days)** | |

---

## Appendix A: Environment Variables

```bash
# .env.example

# === Database ===
DATABASE_URL=postgresql+asyncpg://qara:qara@localhost:5432/qara
DATABASE_URL_SYNC=postgresql://qara:qara@localhost:5432/qara  # for Alembic

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === MinIO (S3) ===
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=qara-captures
MINIO_USE_SSL=false

# === 9Router (LLM) ===
NINE_ROUTER_URL=http://host.docker.internal:20128/v1
NINE_ROUTER_MODEL=qoder/qmodel-latest
EMBEDDING_PROVIDER=9router  # or "tfidf" as fallback
EMBEDDING_DIMENSION=384

# === Auth ===
JWT_SECRET=change-me-to-random-64-char-string
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# === CORS ===
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,chrome-extension://*

# === Server ===
API_HOST=0.0.0.0
API_PORT=8000
API_MAX_UPLOAD_SIZE=52428800  # 50MB

# === Worker ===
ARQ_MAX_TRIES=3
ARQ_RETRY_DELAY=10
```

## Appendix B: Docker Compose

```yaml
version: "3.8"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: qara
      POSTGRES_USER: qara
      POSTGRES_PASSWORD: qara
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qara"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes: ["minio_data:/data"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      sleep 5;
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/qara-captures;
      mc anonymous set download local/qara-captures;
      echo 'MinIO bucket ready';
      "

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports: ["8000:8000"]
    env_file: .env
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully
    volumes:
      - ./api:/app
    command: >
      sh -c "
      alembic upgrade head &&
      python -m app.seed &&
      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
      --limit-max-request-size 52428800
      "

  worker:
    build:
      context: ./api
      dockerfile: Dockerfile
    env_file: .env
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./api:/app
    command: arq app.tasks.worker.WorkerSettings

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports: ["3000:5173"]
    depends_on:
      - api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev -- --host 0.0.0.0

volumes:
  pgdata:
  minio_data:
```

## Appendix C: API Endpoints Summary

| Method | Path | Phase 1 | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Yes | No |
| POST | `/api/v1/auth/login` | Yes | No |
| POST | `/api/v1/auth/refresh` | Yes | No |
| POST | `/api/v1/bugs` | Yes | JWT |
| GET | `/api/v1/bugs` | Yes | JWT |
| GET | `/api/v1/bugs/{id}` | Yes | JWT |
| PATCH | `/api/v1/bugs/{id}` | Yes | JWT |
| GET | `/api/v1/bugs/{id}/similar` | Yes | JWT |
| POST | `/api/v1/captures/upload` | Yes | JWT |
| GET | `/api/v1/captures/{id}` | Yes | JWT |
| GET | `/api/v1/captures/bug/{bug_id}` | Yes | JWT |
| POST | `/api/v1/projects` | Yes | JWT |
| GET | `/api/v1/projects` | Yes | JWT |
| GET | `/api/v1/projects/{id}` | Yes | JWT |
| PATCH | `/api/v1/projects/{id}` | Yes | JWT |
| POST | `/api/v1/integrations` | Yes | JWT |
| GET | `/api/v1/integrations` | Yes | JWT |
| DELETE | `/api/v1/integrations/{id}` | Yes | JWT |
| POST | `/api/v1/integrations/{id}/test` | Yes | JWT |
| GET | `/api/v1/health` | Yes | No |
| GET | `/api/v1/ready` | Yes | No |
| POST | `/api/v1/bugs/{id}/merge` | No (Phase 2) | — |
| POST | `/api/v1/captures/session/start` | No (Phase 3) | — |
| POST | `/api/v1/test-cases/generate` | No (Phase 2) | — |
| POST | `/api/v1/rag/query` | No (Phase 2) | — |
| POST | `/api/v1/workflows` | No (Phase 2) | — |
| GET | `/api/v1/analytics/dashboard` | No (Phase 2) | — |
| WS | `/ws` | No (Phase 2) | — |
