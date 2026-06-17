# Deployment

## Quick Start (Development)

```bash
# Prerequisites: Node 22+, Docker
npm install -g qara-cli
qara dev
# Dashboard: http://localhost:3000
# API: http://localhost:8000
```

## Docker Compose

```yaml
version: "3.8"
services:
  api:
    build: ./api
    ports: ["8000:8000"]
    depends_on: [postgres, redis, qdrant]
    env_file: .env

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [api]

  worker:
    build: ./api
    command: celery -A qara.tasks worker
    depends_on: [postgres, redis, qdrant]

  postgres:
    image: pgvector/pgvector:pg16
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: qara
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine

  qdrant:
    image: qdrant/qdrant
    volumes: [qdrant_data:/qdrant/storage]

  rabbitmq:
    image: rabbitmq:3-management

volumes: { pgdata, qdrant_data }
```

## Kubernetes (Production)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qara-api
  namespace: qara-prod
spec:
  replicas: 3
  selector:
    matchLabels: { app: qara-api }
  template:
    metadata:
      labels: { app: qara-api }
    spec:
      containers:
        - name: api
          image: qara/api:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: qara-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: qara-secrets
                  key: jwt-secret
          resources:
            requests: { cpu: "1", memory: "2Gi" }
            limits: { cpu: "2", memory: "4Gi" }
          livenessProbe:
            httpGet: { path: /health, port: 8000 }
          readinessProbe:
            httpGet: { path: /ready, port: 8000 }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: qara-api-hpa
  namespace: qara-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: qara-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

## Infrastructure

| Resource | Spec | Cost/Month |
|---|---|---|
| Postgres | db.r6g.2xlarge (8 vCPU, 64GB), 500GB gp3 | ~$600 |
| Redis | cache.r6g.large, 3 shards | ~$200 |
| Qdrant | 3 nodes, 16GB RAM, 200GB NVMe | ~$300 |
| Compute | K8s: 3-10 pods × 2-4GB | ~$1,400 |
| Storage | S3: 10TB | ~$300 |
| LLM | 9Router Qoder + Antigravity | ~$1,000 |
| Total | Production | ~$5,200/mo |

## Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:pass@host:5432/qara

# LLM (9Router)
NINE_ROUTER_URL=http://localhost:20128/v1
NINE_ROUTER_API_KEY=qara_sk_xxx
MODEL_CLASSIFY=qoder/qmodel-latest
MODEL_GENERATE=antigravity/claude-sonnet
MODEL_RAG=qoder/qmodel-latest

# Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=qara-captures

# Auth
JWT_SECRET=...
JWT_EXPIRY=24h

# Integrations
SLACK_BOT_TOKEN=...
JIRA_API_TOKEN=...
GITHUB_APP_ID=...

# Redis
REDIS_URL=redis://host:6379
RABBITMQ_URL=amqp://host:5672
```

## Observability

- **Metrics**: Prometheus + Grafana (request rate, latency p50/p95/p99, error rate)
- **Logs**: Loki, structured JSON, `request_id` correlation across services
- **Traces**: OpenTelemetry + Jaeger (10% head sampling, 100% error sampling)
- **Alerts**:
  - P0: service_down, latency > 5s, error_rate > 5%
  - P1: latency > 2s, error_rate > 2%, queue_backlog > 1000
  - P2: cpu > 80%, disk > 80%
