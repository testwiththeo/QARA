# QARA

**Quality Assurance Review & Automation**

AI-powered QA workflow platform. Capture bugs automatically, triage with AI, generate test cases — turning QA workflow from hours to seconds.

## Features

- **Smart Bug Capture** — One-click capture with full context: screenshot, video, console logs, network HAR, env fingerprint, session replay
- **AI Triage** — Auto-dedup, severity classification, component routing, risk scoring, auto-assign
- **Test Generation** — Generate Playwright/Cypress tests from bugs, PR diffs, or PRD sections
- **RAG Knowledge Base** — Query historical bugs, test cases, PRDs, release notes — get answers with citations
- **Workflow Engine** — Customizable state machine: bug → triage → assign → fix → verify → close, with Slack/Jira/GitHub integration
- **PR Integration** — Auto-risk analysis, test generation, and CI test triggering on every pull request
- **Real-Time Dashboard** — Bug trends, flaky test tracking, team workload, regression heatmap, risk reports
- **Integrations** — Jira, Linear, GitHub, GitLab, Slack, Discord, TestRail, Sentry, and more

## Quick Start

```bash
npm install -g qara-cli
qara start
# Dashboard at http://localhost:3000
```

## Architecture

```
Capture (browser ext/CLI) → API Gateway → 
  ├─ Capture Service    (screenshots, video, logs, HAR, session replay)
  ├─ Triage Service     (dedup, classify, route, risk score)
  ├─ Test Gen Service   (generate tests from bugs/PRs/PRDs)
  ├─ Workflow Engine    (state machine, automation, notifications)
  ├─ RAG Service        (query knowledge base with citations)
  ├─ Analytics Service  (metrics, trends, reports)
  └─ Integration Hub    (Jira, Slack, GitHub, Linear, TestRail, etc.)
```

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | FastAPI + WebSocket + Postgres |
| AI | LLM via 9Router (Qoder/Antigravity/OpenCode Free) |
| Vector DB | Qdrant |
| Graph DB | Neo4j |
| Cache/Queue | Redis + RabbitMQ |
| Storage | S3/MinIO |
| Session Replay | rrweb |
| Frontend | React + shadcn/ui + Tailwind |
| Infrastructure | Kubernetes, Docker |

## License

MIT
