# Architect Prompt — QARA Phase 1

## Context

Kamu adalah **Architect** yang akan stress-test blueprint QARA dan menghasilkan implementation-ready plan untuk Phase 1 (Foundation).

## Input

Blueprint lengkap di `/home/theo/QARA/docs/`:
- `architecture.md` — system design, 8 microservices, data flow
- `api.md` — REST endpoints, WebSocket, webhooks
- `data-model.md` — PostgreSQL + Qdrant + Neo4j schema
- `ai-pipeline.md` — 4 agents, model routing via 9Router
- `deployment.md` — Docker Compose, K8s, infra spec
- `integrations.md` — Jira, Slack, GitHub, TestRail
- `security.md` — encryption, tenant isolation, audit
- `cli.md` — CLI reference
- `roadmap.md` — Phase 1-4 scope
- `README.md` — project overview
- `../architect-prompt.md` — this file

## Task

Stress-test and refine the arsitektur untuk **Phase 1 (Foundation)** dengan scope:

1. **Bug Capture** — browser extension (Chrome) + CLI tool
2. **API Backend** — FastAPI with auto-capture endpoint + basic triage
3. **Database** — PostgreSQL migration dari data-model.sql
4. **Dashboard** — React + shadcn/ui (bug list, create, detail)
5. **Integration** — Jira + Slack (create ticket, notify)
6. **Docker Compose** — dev environment
7. **9Router AI** — LLM calls via localhost:20128/v1 (qoder/qmodel-latest)

## Deliverables

Hasilkan satu file `phase-1-plan.md` yang berisi:

### 1. Folder Structure
```
qara/
├── api/            # FastAPI
├── capture/        # Chrome extension + CLI
├── frontend/       # React dashboard
└── docker-compose.yml
```

### 2. Component Tree
- Backend: routes, services, models, tasks, middleware
- Frontend: pages, components, hooks, api client
- Extension: popup, background, content, manifest

### 3. Data Flow Diagram (ASCII)
- Dragoman: user click capture → extension collect → API → DB → triage → notification

### 4. API Contract Detail
- Setiap endpoint: request/response shape, validation, error codes
- Prioritaskan yang masuk Phase 1 dari docs/api.md

### 5. Database Migration Plan
- Urutan migration dari schema di data-model.md
- Yang Phase 1: tenants, users, projects, bug_reports, bug_captures, integrations, audit_log

### 6. 9Router Integration Spec
- Endpoint: http://localhost:20128/v1
- Model: qoder/qmodel-latest via Round Robin (10 akun)
- Fallback: OpenCode Free
- Prompt template untuk bug classification

### 7. Risk Assessment
- Technical risks, mitigations, decision log
- Trade-off analysis untuk setiap pilihan arsitektur

### 8. Implementation Order
- Step-by-step urutan build dengan dependencies
- Estimasi effort per module (jam/hari)
- Milestone definition

## Constraints

- Backend: Python FastAPI + SQLAlchemy async + Alembic
- Frontend: React 19 + Vite + shadcn/ui + Tailwind 4
- Extension: Manifest V3, TypeScript
- Database: PostgreSQL 16 + pgvector
- LLM: 9Router (127.0.0.1:20128/v1)
- Auth: JWT sederhana dulu (skip SSO Phase 1)
- Single tenant dulu (multi-tenant di Phase 2)
- No Kubernetes (Docker Compose cukup)

## Output Format

File: `/home/theo/QARA/phase-1-plan.md`

Gunakan format markdown dengan:
- Decision Log di setiap section (kenapa milih A bukan B)
- Implementation order yang numbered dan testable
- Jangan over-engineering untuk Phase 1 — fokus deliverable
