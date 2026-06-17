# Contributing

## Setup

```bash
git clone https://github.com/qara/qara
cd qara
npm install
cp .env.example .env
qara dev
```

## Project Structure

```
qara/
├── api/              # FastAPI backend
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   ├── models/       # SQLAlchemy models
│   └── tasks/        # Celery background tasks
├── capture/          # Browser extension + CLI
│   ├── extension/    # Chrome extension
│   └── cli/          # CLI tool
├── frontend/         # React dashboard
├── docs/             # Documentation
└── k8s/              # Kubernetes manifests
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Write tests
4. Run: `qara test`
5. Create a pull request

## Standards

- **Python**: PEP 8, type hints, async/await
- **Frontend**: Prettier + ESLint, shadcn/ui conventions
- **API**: OpenAPI 3.0, semantic versioning
- **Tests**: pytest (backend), Playwright (E2E)
