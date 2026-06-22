<div align="center">
  <img src="frontend/public/favicon.svg" width="80" alt="QARA logo" />
  <h1>QARA</h1>
  <p><strong>Quality Assurance Review & Automation</strong></p>
  <p>Bug capture → AI triage → test generation — in one seamless workflow.</p>
  <p>
    <a href="#quick-start"><strong>Quick Start</strong></a> ·
    <a href="#features">Features</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="docs">Docs</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/python-3.12-blue" alt="Python" />
    <img src="https://img.shields.io/badge/react-19-61dafb" alt="React" />
    <img src="https://img.shields.io/badge/fastapi-0.115-009688" alt="FastAPI" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  </p>
  <br />
</div>

---

QA teams spend **60% of their time** on manual busywork — writing bug reports, chasing context, syncing tools. QARA automates the loop:

```
🐛  Bug found  →  🤖  Auto-capture  →  🧠  AI triage  →  ✅  Test generated  →  🔔  Team notified
```

**One click.** Full context. Zero busywork.

---

## Quick Start

```bash
npm install -g qara-cli
qara start
# Dashboard: http://localhost:3000
```

Or with Docker:

```bash
docker compose up -d
```

## Features

| | What |
|---|---|
| 🔍 **Smart Capture** | One-click bug capture with screenshot, video, console logs, network HAR, session replay, and env fingerprint |
| 🧠 **AI Triage** | Auto-dedup, severity classification (P0-P3), component routing, risk scoring, and auto-assignment |
| 🧪 **Test Generation** | Turn bugs, PR diffs, and PRDs into ready-to-run Playwright/Cypress tests |
| 📚 **RAG Knowledge Base** | Ask questions about your bugs, tests, and releases — get answers with citations |
| ⚙️ **Workflow Engine** | Custom state machine: open → triage → assign → fix → verify → close. Auto-notify Slack, auto-create Jira tickets |
| 🔗 **PR Integration** | Every PR gets risk analysis, generated tests, and CI trigger — automatically |
| 📊 **Dashboard** | Real-time bug trends, flaky test tracking, regression heatmap, team workload, release risk reports |

## Architecture

```
                ┌──────────────────────────────┐
                │    Browser Ext  ·  CLI  ·  API │
                └──────────┬───────────────────┘
                           │
                    ┌──────▼───────┐
                    │  API Gateway  │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Capture Service   Triage Service   Workflow Engine
    Test Gen Service  RAG Service      Integration Hub
    Analytics Service
           │               │               │
           └───────────────┼───────────────┘
                           ▼
              ┌────────────────────────┐
              │  PostgreSQL · Redis ·   │
              │  Qdrant · Neo4j · S3   │
              └────────────────────────┘
```

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Python FastAPI + async SQLAlchemy + Alembic |
| AI | 9Router (Qoder · Antigravity · OpenCode) |
| Database | PostgreSQL 16 + pgvector |
| Frontend | React 19 + Vite + shadcn/ui + Tailwind CSS |
| Capture | Chrome Extension (Manifest V3) + CLI (Commander.js) |
| Queue | ARQ + Redis |
| Storage | MinIO / S3 |
| Infra | Docker Compose · Kubernetes |

## Project Structure

```
api/          FastAPI backend (models, routes, services, tasks, LLM)
frontend/     React dashboard (shadcn/ui components, stores, pages)
extension/    Chrome extension (Manifest V3, capture modules)
cli/          CLI tool (auth, bugs, capture, config, integrations)
packages/     Shared TypeScript SDK
infra/        Dockerfiles, nginx, 9Router config
tests/        Integration test suites
```

## Roadmap

- **Phase 1** ✅ Foundation — bug capture, dashboard, CLI, integrations
- **Phase 2** 🔄 Intelligence — RAG, auto-triage, test generation, multi-tenant
- **Phase 3** — Session replay, flaky detection, graph DB, visual regression
- **Phase 4** — Autonomous QA: self-healing tests, predictive regression, CI auto-gate

## License

MIT
