// QARA API Client — TypeScript SDK
// Usage: import { QaraClient } from "@qara/client"

export interface QaraClientOptions {
  baseUrl: string
  apiKey?: string
  token?: string
  onError?: (error: QaraError) => void
}

export interface QaraError {
  code: string
  message: string
  status: number
}

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface BugReport {
  id: string
  title: string
  description?: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  severity: "P0" | "P1" | "P2" | "P3"
  status: BugStatus
  component?: string
  assignee_id?: string
  reporter_id?: string
  duplicate_of?: string
  risk_score?: number
  regression_zones?: string[]
  env_fingerprint?: Record<string, unknown>
  project_id: string
  captures?: BugCapture[]
  created_at: string
  updated_at: string
}

export type BugStatus =
  | "open"
  | "triaging"
  | "triaged"
  | "in_progress"
  | "fix_ready"
  | "verifying"
  | "closed"
  | "duplicate"
  | "wontfix"

export interface CreateBugParams {
  title: string
  description?: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  severity?: "P0" | "P1" | "P2" | "P3"
  component?: string
  project_id: string
}

export interface BugCapture {
  id: string
  bug_report_id: string
  capture_type: CaptureType
  file_url: string
  file_size_bytes?: number
  content_hash?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export type CaptureType =
  | "screenshot"
  | "video"
  | "har_log"
  | "console_log"
  | "dom_snapshot"
  | "session_replay"
  | "performance"
  | "network"

export interface TriageResult {
  severity: "P0" | "P1" | "P2" | "P3"
  component: string
  risk_score: number
  duplicate_of: string | null
  similar_bugs: Array<{ id: string; title: string; score: number }>
}

export interface RAGQueryParams {
  query: string
  project_id: string
  filters?: {
    source_types?: string[]
    date_range?: { from: string; to: string }
    components?: string[]
  }
  mode?: "qa" | "bug" | "test" | "code" | "all"
}

export interface RAGResult {
  answer: string
  citations: Array<{
    id: string
    title: string
    source_type: string
    excerpt: string
    url?: string
    relevance_score: number
  }>
  confidence: number
  suggested_followups: string[]
}

export interface TestCase {
  id: string
  title: string
  description?: string
  preconditions?: string
  steps: TestStep[]
  expected_results?: string
  automated: boolean
  automation_file_path?: string
  automation_framework?: string
  source_bug_id?: string
  tags: string[]
  priority: string
  status: string
  created_at: string
}

export interface TestStep {
  order: number
  action: string
  expected: string
  data?: Record<string, unknown>
}

export interface TestRun {
  id: string
  project_id: string
  trigger_source: string
  branch?: string
  commit_sha?: string
  environment: string
  status: "queued" | "running" | "passed" | "failed" | "aborted"
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration_ms: number
  }
  started_at?: string
  finished_at?: string
}

export interface DashboardAnalytics {
  bugs_opened: number
  bugs_closed: number
  avg_resolution_time_hours: number
  top_flaky_tests: Array<{ name: string; failure_rate: number; runs: number }>
  bug_density_by_module: Record<string, { bugs: number; risk_score: number }>
  trend: Record<string, string>
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export class QaraClient {
  private baseUrl: string
  private apiKey?: string
  private token?: string
  private onError?: (error: QaraError) => void

  constructor(options: QaraClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
    this.apiKey = options.apiKey
    this.token = options.token
    this.onError = options.onError
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { params?: Record<string, string>; files?: File[] },
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const headers: Record<string, string> = {}
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`

    let reqBody: BodyInit | undefined
    if (options?.files) {
      const formData = new FormData()
      if (body) formData.append("data", JSON.stringify(body))
      options.files.forEach((f) => formData.append("files", f))
      reqBody = formData
    } else if (body) {
      headers["Content-Type"] = "application/json"
      reqBody = JSON.stringify(body)
    }

    const resp = await fetch(url.toString(), { method, headers, body: reqBody })
    if (!resp.ok) {
      const err: QaraError = await resp.json().catch(() => ({
        code: "unknown",
        message: resp.statusText,
        status: resp.status,
      }))
      this.onError?.(err)
      throw err
    }

    return resp.json()
  }

  // ── Auth ──
  async register(email: string, password: string, name: string) {
    return this.request<{ access_token: string; refresh_token: string; user: User }>(
      "POST",
      "/api/v1/auth/register",
      { email, password, name },
    )
  }

  async login(email: string, password: string) {
    const res = await this.request<{ access_token: string; refresh_token: string }>(
      "POST",
      "/api/v1/auth/login",
      { email, password },
    )
    this.setToken(res.access_token)
    return res
  }

  // ── Bugs ──
  async listBugs(params?: PaginationParams & { status?: string; severity?: string }) {
    return this.request<BugReport[]>("GET", "/api/v1/bugs", undefined, {
      params: params as Record<string, string>,
    })
  }

  async getBug(id: string) {
    return this.request<BugReport>("GET", `/api/v1/bugs/${id}`)
  }

  async createBug(params: CreateBugParams, files?: File[]) {
    return this.request<BugReport>("POST", "/api/v1/bugs", params, { files })
  }

  async updateBug(id: string, data: Partial<BugReport>) {
    return this.request<BugReport>("PATCH", `/api/v1/bugs/${id}`, data)
  }

  async findSimilarBugs(id: string, limit = 5, threshold = 0.7) {
    return this.request<Array<{ id: string; title: string; score: number }>>(
      "GET",
      `/api/v1/bugs/${id}/similar`,
      undefined,
      { params: { limit: String(limit), threshold: String(threshold) } },
    )
  }

  async mergeBugs(sourceId: string, targetId: string) {
    return this.request<void>("POST", `/api/v1/bugs/${sourceId}/merge`, {
      target_bug_id: targetId,
    })
  }

  async triageBug(id: string) {
    return this.request<TriageResult>("POST", `/api/v1/bugs/${id}/triage`)
  }

  // ── Captures ──
  async uploadCapture(bugId: string, file: File, type: CaptureType) {
    return this.request<BugCapture>("POST", "/api/v1/captures/upload", null, {
      files: [file],
      params: { bug_id: bugId, capture_type: type },
    })
  }

  // ── Test Cases ──
  async generateTests(sourceType: string, sourceId: string, framework = "playwright", count = 3) {
    return this.request<TestCase[]>("POST", "/api/v1/test-cases/generate", {
      source_type: sourceType,
      source_id: sourceId,
      framework,
      count,
    })
  }

  // ── Test Runs ──
  async triggerTestRun(projectId: string, testCaseIds: string[], environment = "staging") {
    return this.request<TestRun>("POST", "/api/v1/test-runs", {
      project_id: projectId,
      test_case_ids: testCaseIds,
      environment,
    })
  }

  // ── RAG ──
  async ragQuery(params: RAGQueryParams) {
    return this.request<RAGResult>("POST", "/api/v1/rag/query", params)
  }

  // ── Analytics ──
  async getDashboard(projectId: string, period: "7d" | "30d" | "90d" = "30d") {
    return this.request<DashboardAnalytics>("GET", "/api/v1/analytics/dashboard", undefined, {
      params: { project_id: projectId, period },
    })
  }

  // ── Integrations ──
  async addIntegration(provider: string, config: Record<string, unknown>) {
    return this.request("POST", "/api/v1/integrations", { provider, config })
  }

  async syncIntegration(id: string) {
    return this.request("POST", `/api/v1/integrations/${id}/sync`)
  }
}

// Singleton export
let defaultClient: QaraClient | null = null

export function initClient(options: QaraClientOptions): QaraClient {
  defaultClient = new QaraClient(options)
  return defaultClient
}

export function getClient(): QaraClient {
  if (!defaultClient) throw new Error("QARA client not initialized. Call initClient() first.")
  return defaultClient
}
