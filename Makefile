.PHONY: dev dev-api dev-frontend dev-extension lint test build clean setup db-up db-down db-migrate db-rollback

# ── Development ───────────────────────────────────────────

dev:
	@echo "Starting all services..."
	docker compose -f infra/docker/docker-compose.dev.yml up --build -d
	@echo "API: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@echo "Dashboard: http://localhost:3000"

dev-api:
	cd api && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev-extension:
	cd capture/extension && npm run dev

# ── Database ──────────────────────────────────────────────

db-up:
	docker compose -f infra/docker/docker-compose.dev.yml up -d postgres redis

db-down:
	docker compose -f infra/docker/docker-compose.dev.yml down

db-migrate:
	cd api && alembic upgrade head

db-rollback:
	cd api && alembic downgrade -1

db-new:
	cd api && alembic revision --autogenerate -m "$(name)"

# ── Testing ───────────────────────────────────────────────

test:
	cd api && pytest -v --cov=app

test-api:
	cd api && pytest -v --cov=app tests/test_api/

test-bugs:
	cd api && pytest -v tests/test_bugs.py

test-auth:
	cd api && pytest -v tests/test_auth.py

test-watch:
	cd api && ptw --runner "pytest -v"

# ── Linting ───────────────────────────────────────────────

lint:
	cd api && ruff check . && ruff format --check .
	cd frontend && npm run lint
	cd capture/extension && npm run lint
	cd capture/cli && npm run lint

lint-fix:
	cd api && ruff check --fix . && ruff format .
	cd frontend && npm run lint -- --fix

typecheck:
	cd api && mypy app/
	cd frontend && npm run typecheck

# ── Building ──────────────────────────────────────────────

build:
	docker compose -f infra/docker/docker-compose.yml build

build-api:
	docker build -t qara/api:latest -f infra/docker/api.Dockerfile .

build-frontend:
	docker build -t qara/frontend:latest -f infra/docker/frontend.Dockerfile .

# ── Setup ─────────────────────────────────────────────────

setup:
	@echo "Setting up QARA development environment..."
	cp -n .env.example .env || true
	cd api && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
	cd frontend && npm ci
	cd capture/extension && npm ci
	cd capture/cli && npm ci
	@echo "Done! Run 'make dev' to start."

setup-full: setup
	docker compose -f infra/docker/docker-compose.dev.yml up -d
	cd api && alembic upgrade head
	@echo "Setup complete!"

# ── Cleanup ───────────────────────────────────────────────

clean:
	docker compose -f infra/docker/docker-compose.dev.yml down -v
	rm -rf api/.venv api/__pycache__
	rm -rf frontend/node_modules frontend/dist
	rm -rf capture/extension/node_modules capture/extension/dist
	rm -rf capture/cli/node_modules
	@echo "Cleaned!"

# ── Git ───────────────────────────────────────────────────

git-setup:
	@echo "Initializing git hooks..."
	pre-commit install
	@echo "Done!"

# ── Help ──────────────────────────────────────────────────

help:
	@echo "QARA Development Commands"
	@echo "─────────────────────────"
	@echo "make dev           Start all services (Docker)"
	@echo "make dev-api       Start API (hot reload)"
	@echo "make dev-frontend  Start frontend (hot reload)"
	@echo "make test          Run all tests"
	@echo "make lint          Run all linters"
	@echo "make setup         Install all dependencies"
	@echo "make clean         Remove all build artifacts"
	@echo "make db-migrate    Run database migrations"
