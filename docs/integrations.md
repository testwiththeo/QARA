# Integrations

## Issue Trackers

### Jira
```bash
qara integrations add jira \
  --url https://company.atlassian.net \
  --api-token $JIRA_TOKEN \
  --project QA
```

Events: bug created/updated → Jira ticket created/updated
Sync: bidirectional (status, comments, assignee)

### GitHub Issues
```bash
qara integrations add github \
  --token $GITHUB_TOKEN \
  --owner org \
  --repo project
```

### Linear
```bash
qara integrations add linear \
  --api-key $LINEAR_KEY \
  --team QA
```

## Communication

### Slack
```bash
qara integrations add slack \
  --bot-token $SLACK_TOKEN \
  --channel #qa-alerts
```

Templates: bug created, test failed, release risk report

### Discord
```bash
qara integrations add discord \
  --webhook-url https://discord.com/api/webhooks/...
```

## Test Management

### TestRail
```bash
qara integrations add testrail \
  --url https://company.testrail.io \
  --user email@company.com \
  --api-key $TESTRAIL_KEY
```

### Qase
```bash
qara integrations add qase \
  --api-token $QASE_TOKEN \
  --project QA
```

## Monitoring

### Sentry
```bash
qara integrations add sentry \
  --dsn https://key@sentry.io/project \
  --organization org-name
```

Auto-create bug report from Sentry error events.

### Datadog
```bash
qara integrations add datadog \
  --api-key $DD_KEY \
  --app-key $DD_APP_KEY
```

## CI/CD

### GitHub Actions
```yaml
- uses: qara/pr-analysis@v1
  with:
    api-key: ${{ secrets.QARA_API_KEY }}
    project-slug: my-project

- uses: qara/generate-tests@v1
  with:
    diff-only: true
    framework: playwright
    max-tests: 5

- uses: qara/upload-results@v1
  with:
    results: test-results.json
```

### GitLab CI
```yaml
qara-analysis:
  image: qara/cli:latest
  script:
    - qara pr analyze --project my-project
    - qara tests generate --diff-only --framework playwright
    - qara results upload test-results.json
```

## Webhook

Send events to any HTTP endpoint:

```bash
qara integrations add webhook \
  --url https://company.com/webhooks/qara \
  --events bug.created,bug.updated,test_run.completed
```

Payload:
```json
{
  "event": "bug.created",
  "timestamp": "2026-06-22T10:30:00Z",
  "payload": {
    "bug_id": "b-123",
    "title": "Login button unresponsive",
    "severity": "P1",
    "risk_score": 6.5,
    "ticket_url": "https://company.atlassian.net/browse/QA-456"
  }
}
```
