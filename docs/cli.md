# CLI Reference

## Installation

```bash
npm install -g qara-cli
```

## Commands

### `qara dev`
Start development server.

### `qara start`
Start production server.

### `qara capture`
Start interactive bug capture from terminal.

### `qara capture --url https://example.com`
Capture bug from a URL (headless browser).

### `qara bugs list`
```bash
qara bugs list \
  --project my-project \
  --status open \
  --severity P1
```

### `qara bugs create`
```bash
qara bugs create \
  --title "Login fails on Safari" \
  --project my-project \
  --screenshot ./screenshot.png
```

### `qara tests generate`
```bash
qara tests generate \
  --source bug:b-123 \
  --framework playwright \
  --output ./tests
```

### `qara pr analyze`
```bash
qara pr analyze \
  --project my-project \
  --diff ./changes.diff
```

### `qara integrations add`
```bash
qara integrations add slack --bot-token xxx
qara integrations add jira --url https://... --api-token xxx
```

### `qara workflow create`
```bash
qara workflow create \
  --name "P0 Alert" \
  --trigger bug.created \
  --condition 'severity == "P0"' \
  --action notify_slack:#alerts
```

### `qara rag query`
```bash
qara rag query "What's the flakiest test?" \
  --project my-project
```

### `qara analytics dashboard`
```bash
qara analytics dashboard \
  --project my-project \
  --period 30d
```

### `qara config`
```bash
qara config set api-key qara_sk_xxx
qara config set endpoint https://api.qara.dev
```

### `qara help`
Show help for any command.

```bash
qara help capture
```
