# Data Model

## PostgreSQL Schema

### Tenants & Users

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'qa',
  preferences JSONB DEFAULT '{}',
  slack_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  vcs_url VARCHAR(500),
  settings JSONB DEFAULT '{
    "auto_create_test_case": true,
    "auto_assign": true,
    "triage_model": "ai",
    "allowed_severities": ["P0","P1","P2","P3"]
  }',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Bug Reports

```sql
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  severity VARCHAR(5) CHECK (severity IN ('P0','P1','P2','P3')),
  status VARCHAR(20) DEFAULT 'open',
  component VARCHAR(255),
  assignee_id UUID REFERENCES users(id),
  reporter_id UUID REFERENCES users(id),
  duplicate_of UUID REFERENCES bug_reports(id),
  risk_score DECIMAL(5,2),
  regression_zones JSONB,
  env_fingerprint JSONB,
  metadata JSONB,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Captures

```sql
CREATE TABLE bug_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID REFERENCES bug_reports(id) ON DELETE CASCADE,
  capture_type VARCHAR(20) NOT NULL,
  file_url VARCHAR(1000),
  file_size_bytes BIGINT,
  content_hash VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Test Cases

```sql
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  preconditions TEXT,
  steps JSONB NOT NULL,
  expected_results TEXT,
  automated BOOLEAN DEFAULT false,
  automation_file_path VARCHAR(500),
  automation_framework VARCHAR(50),
  source_bug_id UUID REFERENCES bug_reports(id),
  tags TEXT[],
  priority VARCHAR(5),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Test Runs & Results

```sql
CREATE TABLE test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  ci_pipeline_id VARCHAR(255),
  trigger_source VARCHAR(20),
  branch VARCHAR(255),
  commit_sha VARCHAR(40),
  environment VARCHAR(100),
  status VARCHAR(20) DEFAULT 'running',
  summary JSONB,
  metadata JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id),
  status VARCHAR(20) NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  screenshot_url VARCHAR(1000),
  logs TEXT,
  retry_count INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Workflows

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  conditions JSONB,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RAG Documents

```sql
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255),
  title TEXT,
  content TEXT NOT NULL,
  chunk_count INTEGER,
  metadata JSONB,
  checksum VARCHAR(64),
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integrations & Audit

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  provider VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

## Vector Schema (Qdrant)

| Collection | Dimensions | Index | Purpose |
|---|---|---|---|
| `knowledge_chunks` | 1536 | HNSW, ef=200, M=32 | RAG document search |
| `bug_embeddings` | 1536 | HNSW | Duplicate detection |
| `code_embeddings` | 768 | HNSW | Code search |

## Graph Schema (Neo4j)

**Nodes:** Bug, TestCase, Module, User, Release

**Relationships:**
- `(Bug)-[:AFFECTS]->(Module)`
- `(Bug)-[:DUPLICATE_OF]->(Bug)`
- `(Bug)-[:HAS_TEST]->(TestCase)`
- `(TestCase)-[:COVERS]->(Module)`
- `(Module)-[:DEPENDS_ON]->(Module)`
- `(Module)-[:COUPLED_WITH]->(Module)`
- `(User)-[:ASSIGNED]->(Bug)`
- `(User)-[:EXPERT_IN]->(Module)`
