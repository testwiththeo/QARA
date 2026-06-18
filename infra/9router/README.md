# 9Router Configuration for QARA

## Setup

```bash
# Ensure 9Router is running
9router
# Dashboard: http://localhost:20128

# Import combo config
curl -X POST http://localhost:20128/api/combos/import \
  -H "Content-Type: application/json" \
  -d @combo-qoder.json
```

## Combo: QARA - Qoder 10x + OpenCode Fallback

| Strategy | Detail |
|---|---|
| Primary | Round Robin across 10 Qoder accounts |
| Sticky | 1 (pure round-robin, no stickiness) |
| Fallback | OpenCode Free jika semua Qoder rate limited |

## Model Routing per Task

| Task | Recommended Model | Why |
|---|---|---|
| Bug classification | `qoder/qmodel-latest` | Cheap, fast, sufficient |
| Test generation | `antigravity/claude-sonnet` | Needs stronger reasoning |
| RAG embedding | `qoder/qmodel-latest` | High throughput, batch-friendly |
| RAG answer | `qoder/qmodel-latest` | Fine for structured answers |
| Formatting/trivial | `opencode-free/free` | Free tier, no cognitive need |

## Environment Variables

```bash
NINE_ROUTER_URL=http://localhost:20128/v1
NINE_ROUTER_API_KEY=<dashboard-api-key>
NINE_ROUTER_MODEL_DEFAULT=qoder/qmodel-latest
NINE_ROUTER_MODEL_TRIAGE=qoder/qmodel-latest
NINE_ROUTER_MODEL_GENERATE=antigravity/claude-sonnet
NINE_ROUTER_MODEL_RAG=qoder/qmodel-latest
NINE_ROUTER_MODEL_CHEAP=opencode-free/free
```

## Healthcheck

```bash
curl http://localhost:20128/v1/models
curl http://localhost:20128/health
```
