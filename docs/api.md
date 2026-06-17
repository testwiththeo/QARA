# API Reference

## Base URL

```
https://api.qara.dev/v1
```

## Authentication

All requests require an API key in the header:

```
Authorization: Bearer qara_sk_xxxxxxxxxxxx
```

## Endpoints

### Bug Reports

#### Create Bug
```http
POST /bugs
Content-Type: multipart/form-data

{
  "title": "Login button unresponsive on Safari 17",
  "project_id": "uuid",
  "captures": [files],
  "auto_capture_payload": { "url": "...", "logs": "...", ... }
}
```

Response:
```json
{
  "id": "b-123",
  "title": "Login button unresponsive on Safari 17",
  "severity": "P1",
  "component": "auth",
  "risk_score": 6.5,
  "duplicate_of": null,
  "similar_bugs": [
    { "id": "b-98", "title": "Login fails in Safari private mode", "score": 0.72 }
  ],
  "ticket_url": "https://company.atlassian.net/browse/QA-456",
  "created_at": "2026-06-22T10:30:00Z"
}
```

#### Get Bug
```http
GET /bugs/{id}
```

#### Update Bug
```http
PATCH /bugs/{id}
Content-Type: application/json

{
  "status": "in_progress",
  "assignee_id": "user-uuid"
}
```

#### Find Similar Bugs
```http
GET /bugs/{id}/similar?limit=5&threshold=0.7
```

#### Merge Duplicates
```http
POST /bugs/{id}/merge
Content-Type: application/json

{ "target_bug_id": "b-456" }
```

### Captures

#### Upload Capture
```http
POST /captures/upload
Content-Type: multipart/form-data

{ "file": ..., "type": "screenshot" }
```

#### Start Session Recording
```http
POST /captures/session/start
```
Response: `{ "session_id": "s-123", "ws_url": "wss://api.qara.dev/ws/capture/s-123" }`

#### Stop Session Recording
```http
POST /captures/session/{id}/stop
```
Response: `{ "replay_url": "...", "events_count": 1423, "duration_ms": 45000 }`

### Test Cases

#### List Test Cases
```http
GET /test-cases?project_id=uuid&status=active&automated=true
```

#### Generate Test Cases
```http
POST /test-cases/generate
Content-Type: application/json

{
  "source_type": "bug",
  "source_id": "b-123",
  "framework": "playwright",
  "count": 3
}
```

#### Approve Test Case
```http
POST /test-cases/{id}/approve
```

### Test Runs

#### Trigger Test Run
```http
POST /test-runs
Content-Type: application/json

{
  "project_id": "uuid",
  "test_case_ids": ["tc-1", "tc-2"],
  "environment": "staging",
  "branch": "feature/payment-fix"
}
```

#### Get Test Run
```http
GET /test-runs/{id}
```

### RAG

#### Query Knowledge Base
```http
POST /rag/query
Content-Type: application/json

{
  "query": "What's the flakiest test this sprint?",
  "project_id": "uuid",
  "filters": {
    "source_types": ["bug_report", "test_case"],
    "date_range": { "from": "2026-06-01", "to": "2026-06-22" }
  },
  "mode": "qa"
}
```

Response:
```json
{
  "answer": "The flakiest test this sprint is **Checkout with promo code** with a 34% failure rate across 12 runs.",
  "citations": [
    {
      "id": "doc-uuid",
      "title": "Test Run #892 - Staging",
      "source_type": "test_run",
      "excerpt": "checkout/promo.spec.ts: failed 4/12 runs",
      "url": "https://..."
    }
  ],
  "confidence": 0.92,
  "suggested_followups": [
    "What's the root cause of the checkout flakiness?",
    "Which commits touched checkout recently?"
  ]
}
```

#### Ingest Document
```http
POST /rag/ingest
Content-Type: application/json

{
  "source_type": "prd",
  "source_id": "doc-123",
  "title": "Payment V2 Requirements",
  "content": "...",
  "metadata": { "author": "product-team", "version": "2.0" }
}
```

### Workflows

#### Create Workflow
```http
POST /workflows
Content-Type: application/json

{
  "name": "Notify on P0 Bug",
  "trigger_event": "bug.created",
  "conditions": { "severity": "P0" },
  "actions": [
    { "type": "notify_slack", "channel": "#alerts", "template": "p0-bug" },
    { "type": "create_jira", "project": "QA", "priority": "Highest" },
    { "type": "assign_team", "team": "oncall" }
  ]
}
```

#### Test Workflow
```http
POST /workflows/{id}/test
```

### Analytics

#### Dashboard
```http
GET /analytics/dashboard?project_id=uuid&period=30d
```

Response:
```json
{
  "bugs_opened": 47,
  "bugs_closed": 38,
  "avg_resolution_time_hours": 28.5,
  "top_flaky_tests": [
    { "name": "Checkout promo", "failure_rate": 0.34, "runs": 12 }
  ],
  "bug_density_by_module": {
    "payment": { "bugs": 12, "risk_score": 8.2 },
    "auth": { "bugs": 5, "risk_score": 3.1 }
  },
  "trend": { "bugs_opened_dod": "+12%", "resolution_time_wow": "-8%" }
}
```

#### Risk Report
```http
GET /analytics/risk-report?project_id=uuid&release=v2.5
```

### Integrations

#### Add Integration
```http
POST /integrations
Content-Type: application/json

{
  "provider": "jira",
  "config": {
    "url": "https://company.atlassian.net",
    "api_token": "encrypted",
    "project_key": "QA"
  }
}
```

#### Sync Integration
```http
POST /integrations/{id}/sync
```

### Admin

#### Usage Stats
```http
GET /admin/usage
```

## WebSocket

```javascript
const ws = new WebSocket("wss://api.qara.dev/ws", { token: "jwt..." });

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.event) {
    case "bug.created":
    case "bug.updated":
    case "test_run.completed":
    case "test.failed":
    case "workflow.executed":
  }
};

ws.send(JSON.stringify({ subscribe: ["project:uuid"] }));
```

## Rate Limits

| Tier | Rate Limit |
|------|-----------|
| Free | 10 req/min |
| Pro | 100 req/min |
| Enterprise | Custom |

## Webhook Events

```json
POST /webhooks/qara

{
  "event": "bug.created",
  "timestamp": "2026-06-22T10:30:00Z",
  "payload": {
    "bug_id": "b-123",
    "title": "Login button unresponsive",
    "severity": "P1",
    "risk_score": 6.5,
    "captures": {
      "screenshot": "https://cdn.qara.dev/b-123/screenshot.png"
    },
    "ticket_url": "https://company.atlassian.net/browse/QA-456"
  }
}
```

## Errors

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry in 5 seconds.",
    "retry_after": 5
  }
}
```

Standard HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500.
