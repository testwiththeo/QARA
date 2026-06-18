#!/bin/bash
set -euo pipefail

QARA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$QARA_DIR"

echo "╔══════════════════════════════════════╗"
echo "║     QARA Development Bootstrap       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Prerequisites ────────────────────────────────────────
echo "🔍 Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ Docker Compose required"; exit 1; }

echo "   Python: $(python3 --version)"
echo "   Node:   $(node --version)"
echo "   Docker: $(docker --version)"
echo ""

# ── Environment ──────────────────────────────────────────
echo "📝 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "   Created .env from .env.example"
    echo "   ⚠️  Update .env with your API keys!"
else
    echo "   .env already exists, skipping"
fi

# ── Python backend ──────────────────────────────────────
echo "🐍 Setting up Python backend..."
cd "$QARA_DIR/api"
if [ ! -d .venv ]; then
    python3 -m venv .venv
    echo "   Created virtual environment"
fi
source .venv/bin/activate
pip install -q -r requirements-dev.txt
echo "   Installed Python dependencies"

# ── Frontend ────────────────────────────────────────────
echo "⚛️  Setting up frontend..."
cd "$QARA_DIR/frontend"
npm ci --silent 2>/dev/null || npm install
echo "   Installed frontend dependencies"

# ── Extension ───────────────────────────────────────────
echo "🔧 Setting up Chrome extension..."
cd "$QARA_DIR/capture/extension"
npm ci --silent 2>/dev/null || npm install
echo "   Installed extension dependencies"

# ── CLI ─────────────────────────────────────────────────
echo "🖥️  Setting up CLI tool..."
cd "$QARA_DIR/capture/cli"
npm ci --silent 2>/dev/null || npm install
echo "   Installed CLI dependencies"

# ── Git hooks ───────────────────────────────────────────
echo "🔗 Setting up git hooks..."
cd "$QARA_DIR"
if command -v pre-commit >/dev/null 2>&1; then
    pre-commit install 2>/dev/null || echo "   pre-commit install skipped"
fi

# ── Docker ──────────────────────────────────────────────
echo "🐳 Starting Docker services..."
docker compose -f infra/docker/docker-compose.dev.yml up -d 2>/dev/null || {
    echo "   ⚠️  Docker services failed to start"
    echo "   Run 'make dev' manually after bootstrap"
}

# ── Migrations ──────────────────────────────────────────
echo "🗄️  Running database migrations..."
cd "$QARA_DIR/api"
source .venv/bin/activate
alembic upgrade head 2>/dev/null && echo "   Migrations applied" || echo "   ⚠️  Migrations failed (DB might not be ready)"

# ── Done ────────────────────────────────────────────────
cd "$QARA_DIR"
echo ""
echo "╔══════════════════════════════════════╗"
echo "║     QARA is ready!                    ║"
echo "║                                       ║"
echo "║   API:       http://localhost:8000    ║"
echo "║   Frontend:  http://localhost:5173    ║"
echo "║   Dashboard: http://localhost:3000    ║"
echo "║                                       ║"
echo "║   Run: source api/.venv/bin/activate  ║"
echo "║   Then: make dev                      ║"
echo "╚══════════════════════════════════════╝"
