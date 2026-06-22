<div align="center">

<br />

<img src="frontend/public/favicon.svg" width="72" alt="QARA" />

# QARA

**Quality Assurance Review & Automation**

One-click bug capture. AI-powered triage. Automated test generation.

Your QA workflow, reduced from hours to seconds.

<br />

<a href="#quick-start"><img src="https://img.shields.io/badge/Quick_Start-009688?style=for-the-badge&logoColor=white" alt="Quick Start" /></a>
<a href="docs"><img src="https://img.shields.io/badge/Docs-333?style=for-the-badge&logoColor=white" alt="Docs" /></a>

<br />

<img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/License-MIT-green" />

<br /><br />

</div>

```
 🐛 Bug found  →  📸 Auto-capture  →  🧠 AI triage  →  🧪 Test generated  →  🔔 Team notified
```

---

## The Problem

QA teams spend **60% of their time** on manual busywork. Writing bug reports. Chasing missing context. Syncing tickets across tools. Reproducing issues that should have been caught by tests.

QARA kills that loop.

## What QARA Does

| | Feature | Description |
|:---:|---|---|
| 📸 | **Smart Capture** | One click grabs everything: screenshot, video, console logs, network HAR, session replay, environment fingerprint |
| 🧠 | **AI Triage** | Auto-dedup, severity classification (P0 through P3), component routing, risk scoring, smart assignment |
| 🧪 | **Test Generation** | Turn bugs, PR diffs, and PRDs into runnable Playwright and Cypress tests |
| 📚 | **RAG Knowledge Base** | Ask questions about your bugs, tests, and releases. Get answers with citations |
| ⚙️ | **Workflow Engine** | Custom state machine with auto-notify on Slack and auto-create in Jira |
| 🔗 | **PR Integration** | Every PR gets risk analysis, generated tests, and CI triggers automatically |
| 📊 | **Live Dashboard** | Bug trends, flaky test tracking, regression heatmap, team workload, release risk |

## Quick Start

**Docker Compose** (recommended):

```bash
git clone https://github.com/your-org/qara.git
cd qara
cp .env.example .env
docker compose up -d
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

**CLI** (for quick capture from terminal):

```bash
npm install -g qara-cli
qara config set endpoint http://localhost:8000/api/v1
qara login
qara bugs create --title "Login fails on Safari" --project my-project
```

**Chrome Extension** (for one-click browser capture):

1. Build: `cd extension && npm run build`
2. Open `chrome://extensions` → Enable Developer Mode → Load unpacked → Select `extension/dist`
3. Click the QARA icon → Login → Capture bugs from any page

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
│                                                         │
│   Chrome Extension    CLI Tool    React Dashboard       │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  FastAPI API │
                    │   :8000     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       Bug Capture    AI Triage     Integrations
       & Storage      & Embedding   (Jira, Slack)
            │              │              │
            └──────────────┼──────────────┘
                           │
              ┌────────────▼────────────┐
              │                         │
         PostgreSQL 16           Redis          MinIO
         + pgvector             (ARQ queue)    (file storage)
```

**Phase 1** runs as a single FastAPI monolith with an ARQ background worker. The modular service layer (`services/` directory) is designed for future extraction into microservices.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, async SQLAlchemy 2.0, Alembic |
| **AI / LLM** | 9Router (qoder/qmodel-latest), TF-IDF fallback for embeddings |
| **Database** | PostgreSQL 16 + pgvector (HNSW index for similarity search) |
| **Task Queue** | ARQ + Redis (async-native, lightweight) |
| **File Storage** | MinIO (S3-compatible, self-hosted) |
| **Frontend** | React 19, Vite, TypeScript, shadcn/ui, Tailwind CSS 4, Zustand |
| **Extension** | Chrome Manifest V3, TypeScript, CRXJS |
| **CLI** | Node.js 22, Commander.js, TypeScript |
| **Infra** | Docker Compose (dev), Kubernetes (prod, Phase 3+) |

## Project Structure

```
qara/
├── api/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py         # App factory, CORS, lifespan, routers
│   │   ├── config.py       # Pydantic settings (env vars)
│   │   ├── database.py     # Async engine + session factory
│   │   ├── dependencies.py # get_db, get_current_user, get_tenant
│   │   ├── models/         # SQLAlchemy ORM (7 tables + pgvector)
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── routes/         # API endpoints (auth, bugs, captures, projects, integrations)
│   │   ├── services/       # Business logic (auth, bug, capture, triage, storage, integration)
│   │   ├── tasks/          # ARQ background tasks (triage, Jira, Slack)
│   │   ├── integrations/   # External API clients (Jira REST v3, Slack Web)
│   │   ├── llm/            # 9Router client, prompt templates, TF-IDF fallback
│   │   └── middleware/      # Audit log, request ID correlation
│   ├── alembic/            # Database migrations (8 migrations)
│   ├── tests/              # pytest test suite
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/               # React dashboard
│   └── src/
│       ├── pages/          # Login, Dashboard, BugList, BugDetail, BugCreate, Projects
│       ├── components/     # BugTable, CaptureViewer, SeverityBadge, Layout
│       ├── hooks/          # useAuth, useBugs, useProjects
│       ├── stores/         # Zustand (auth, bugs)
│       └── api/            # Typed fetch client with JWT auto-refresh
│
├── extension/              # Chrome extension (Manifest V3)
│   └── src/
│       ├── background/     # Service worker (orchestrates capture)
│       ├── content/        # Content script (DOM, console, perf metrics)
│       ├── popup/          # React popup UI (login, capture form)
│       └── lib/            # screenshot, console, network HAR, fingerprint
│
├── cli/                    # CLI tool
│   └── src/
│       ├── commands/       # config, login, bugs, capture, integrations
│       └── lib/            # API client, config manager, interactive forms
│
├── docs/                   # Blueprint documentation
├── docker-compose.yml      # Dev environment (Postgres, Redis, MinIO, API, Worker, Frontend)
└── phase-1-plan.md         # Implementation plan
```

## Development

```bash
# Start infrastructure
docker compose up -d postgres redis minio minio-init

# Run API locally (with hot reload)
cd api
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000

# Run ARQ worker
arq app.tasks.worker.WorkerSettings

# Run frontend
cd frontend
npm install && npm run dev

# Run tests
cd api && pytest -v
```

## Roadmap

| Phase | Scope | Status |
|:---:|---|:---:|
| **1** | Foundation: bug capture, AI triage, dashboard, Jira + Slack, Chrome extension, CLI | 🔨 Building |
| **2** | Intelligence: duplicate detection (vector DB), RAG, test generation, multi-tenant, workflow engine | 📋 Planned |
| **3** | Scale: session replay (rrweb), PR integration, graph DB, flaky test detection, K8s deployment | 📋 Planned |
| **4** | Autonomous: self-healing tests, predictive regression, CI auto-gate, SSO/SCIM, marketplace | 📋 Planned |

## Contributing

See [docs/contributing.md](docs/contributing.md) for setup, coding standards, and PR workflow.

## License

[MIT](LICENSE)

<br />

<div align="center">

**Stop writing bug reports. Start fixing bugs.**

</div>
