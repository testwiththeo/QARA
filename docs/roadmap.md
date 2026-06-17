# Roadmap

## Phase 1 — Foundation (Month 1-2)

**Scope:**
- Bug capture via browser extension + CLI
- Auto-create Jira/GitHub tickets
- Basic severity classification (LLM)
- Single tenant
- Slack notification
- Dashboard with bug list

**Tech:** FastAPI + Postgres + S3, 9Router Qoder, Chrome extension MVP, Docker Compose

## Phase 2 — Intelligence (Month 3-4)

**Scope:**
- Duplicate detection (vector DB)
- Component auto-routing
- Risk scoring
- Basic RAG (Q&A from bug history)
- Test case auto-generation from bugs
- Multi-tenant
- Workflow engine (state machine)
- All integrations (Linear, GitLab, TestRail)
- Real-time dashboard

## Phase 3 — Scale (Month 5-6)

**Scope:**
- Session replay (rrweb)
- PR integration (auto-test generation from diff)
- Graph DB (bug × module × test coupling)
- Full RAG (all knowledge sources)
- Flaky test detection + quarantine
- Visual regression detection
- Mobile app capture
- Kubernetes deployment
- 99.9% SLA

## Phase 4 — Autonomous (Month 7-9)

**Scope:**
- Auto-triage with >95% acceptance
- Auto-fix for flaky tests (selector healing)
- Predictive regression (which tests will fail before running)
- Auto-create test suites from PRD
- Root cause analysis
- CI/CD auto-gate (block merge if risk > threshold)
- SSO, SCIM
- On-prem option
- Marketplace (community workflows)

## Current Status

```
Phase 1: [████░░░░░░] 40%
Phase 2: [██░░░░░░░░] 10%
Phase 3: [░░░░░░░░░░] 0%
Phase 4: [░░░░░░░░░░] 0%
```
