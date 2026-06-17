# Architecture

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│  Browser Ext  │  CLI  │  VSCode Ext  │  Mobile App  │  Web App  │
└──────┬──────────┬──────┴──────┬───────┴─────────────┴───────────┘
       │          │             │               │
       ▼          ▼             ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Kong / Envoy)                    │
│           Rate Limit │ Auth │ Tenant Isolation │ Routing          │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CORE SERVICES (Kubernetes)                    │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │ Capture   │ │ Triage   │ │ Workflow │ │ Integration       │    │
│  │ Service   │ │ Service  │ │ Engine   │ │ Hub              │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │ Test Gen │ │ Analytics│ │ RAG      │ │ Notification      │    │
│  │ Service  │ │ Service  │ │ Service  │ │ Service          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
│                                                                   │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                    │
│                                                                   │
│  PostgreSQL (main DB)    │  Redis (cache + queue + pub/sub)       │
│  Qdrant (vector DB)      │  S3/MinIO (screenshots, videos, logs)  │
│  Neo4j (graph DB)        │  RabbitMQ (event bus)                  │
│  TimescaleDB (metrics)   │  Elasticsearch (full-text search)      │
└──────────────────────────────────────────────────────────────────┘
```

## Service Breakdown

### Capture Service
Processes incoming bug reports with full context:
- DOM snapshot (full HTML + CSSOM)
- Console log buffer (last 500 lines)
- Network request waterfall (HAR format)
- Screenshot (full page + viewport)
- Video recording (rrweb format, replayable)
- Environment fingerprint (OS, browser, resolution, language)
- Session replay data (user interaction timeline)
- Performance metrics (LCP, CLS, FID, TTFB)

### Triage Service
AI-powered bug triage pipeline:
1. Duplicate detection via vector similarity (threshold: 0.85)
2. Severity classification (P0/P1/P2/P3)
3. Component routing from stack traces, URLs, error messages
4. Auto-assignment based on expertise + load balancing
5. Risk scoring: `(severity × user_impact × system_criticality) - (time_to_fix)`
6. Regression zone detection via graph DB coupling

### Test Generation Service
Generates executable tests from multiple sources:
- **Bug report** → replay bug flow → generate Playwright/Cypress test
- **PR diff** → analyze changed functions → generate targeted tests
- **PRD section** → parse requirements → generate acceptance tests

### Workflow Engine
Configurable state machine per project/organization:
- States: open → triaging → triaged → in_progress → fix_ready → verifying → closed
- Transitions: triggers (webhook, schedule, manual), actions (notify, run test, update ticket), conditions (severity gate, business hours)
- Built-in templates: standard QA workflow, hotfix workflow, regression workflow

### RAG Service
Multi-source knowledge retrieval with citation:
- Ingests: bug reports, test cases, PRDs, ADRs, release notes, API docs, commit messages
- Multi-route query: vector search, graph traversal, SQL/time-series, code search
- Fusion with cross-encoder re-ranking
- Response with citations and confidence scores

### Analytics Service
Real-time QA metrics:
- Bug trends (opened/closed, avg resolution time)
- Flaky test tracking (failure rate over time)
- Team workload (assignee distribution, cycle time)
- Regression heatmap (bug density by module)
- Risk reports per release

### Integration Hub
Bidirectional sync with external tools:
- Issue trackers: Jira, Linear, GitHub Issues, GitLab
- Communication: Slack, Discord, Microsoft Teams
- Test management: TestRail, Qase, Zephyr
- Monitoring: Sentry, Datadog, PagerDuty
- CI/CD: GitHub Actions, GitLab CI, Jenkins

## Data Flow: Bug Capture → Resolution

```
QA clicks "Capture Bug"
  │
  ▼
Browser extension collects:
  ├─ DOM snapshot
  ├─ Console logs
  ├─ Network HAR
  ├─ Screenshot
  ├─ Video (rrweb)
  └─ Env fingerprint
  │
  ▼
POST /api/v1/bugs → Capture Service
  │
  ▼
Event Bus: "bug.created"
  │
  ├──→ Triage Service
  │     ├─ Duplicate check (Qdrant)
  │     ├─ Severity + component (LLM)
  │     ├─ Risk score
  │     └─ Auto-assign
  │
  ├──→ Integration Hub
  │     └─ Create ticket in Jira/GitHub
  │
  ├──→ Notification Service
  │     └─ Slack message with full context
  │
  ├──→ Workflow Engine
  │     └─ Execute matching workflows
  │
  └──→ Analytics Service
        └─ Update metrics
```

## Event Bus

```python
# RabbitMQ topology
# Exchange: qara.events (topic)

# Bindings:
#   *.bug.*           → Triage Service
#   *.test.*          → Analytics Service
#   *.test_run.*      → Notification Service
#   *.pr.*            → Test Gen Service
#   *.workflow.*      → Workflow Engine
```

## Real-Time Architecture

- **Session Recording**: Browser extension → WebSocket → Capture Service → S3
- **Live Dashboard**: Server-Sent Events for real-time updates
- **Queue**: Redis for job queue + RabbitMQ for event-driven orchestration
