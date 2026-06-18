// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenant_id?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

// ─── Bug Reports ─────────────────────────────────────────────────────────────

export type BugStatus = "open" | "triaging" | "triaged" | "closed";
export type BugSeverity = "P0" | "P1" | "P2" | "P3";
export type BugSortBy = "created_at" | "updated_at" | "severity" | "risk_score";
export type SortOrder = "asc" | "desc";

export interface EnvFingerprint {
  os: string;
  browser: string;
  resolution: string;
  language: string;
}

export interface BugCapture {
  id: string;
  capture_type: string;
  file_url: string;
  file_size_bytes: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SimilarBug {
  id: string;
  title: string;
  severity?: BugSeverity;
  status?: BugStatus;
  similarity: number;
}

export interface Bug {
  id: string;
  title: string;
  description?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  severity?: BugSeverity;
  status: BugStatus;
  component?: string;
  risk_score?: number;
  assignee?: UserSummary;
  reporter?: UserSummary;
  project_id: string;
  duplicate_of?: string;
  env_fingerprint?: EnvFingerprint;
  captures?: BugCapture[];
  similar_bugs?: SimilarBug[];
  ticket_url?: string;
  capture_count?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface BugListItem {
  id: string;
  title: string;
  severity?: BugSeverity;
  status: BugStatus;
  component?: string;
  risk_score?: number;
  assignee?: UserSummary;
  reporter?: UserSummary;
  capture_count: number;
  created_at: string;
  updated_at: string;
}

export interface BugListParams {
  project_id: string;
  status?: BugStatus;
  severity?: BugSeverity;
  assignee_id?: string;
  search?: string;
  sort_by?: BugSortBy;
  sort_order?: SortOrder;
  page?: number;
  page_size?: number;
}

export interface BugCreateRequest {
  title: string;
  description?: string;
  project_id: string;
  severity?: BugSeverity;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  captures?: File[];
}

export interface BugUpdateRequest {
  status?: BugStatus;
  assignee_id?: string;
  severity?: BugSeverity;
  component?: string;
  title?: string;
}

// ─── Paginated Response ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Captures ────────────────────────────────────────────────────────────────

export type CaptureType =
  | "screenshot"
  | "video"
  | "console_log"
  | "network_har"
  | "dom_snapshot"
  | "env_fingerprint"
  | "session_replay";

export interface CaptureUploadRequest {
  bug_report_id: string;
  capture_type: CaptureType;
  file: File;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ProjectSettings {
  auto_create_test_case: boolean;
  auto_assign: boolean;
  triage_model: string;
}

export interface Project {
  id: string;
  name: string;
  vcs_url?: string;
  settings: ProjectSettings;
  bug_count?: number;
  created_at: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  bug_count: number;
  created_at: string;
}

export interface ProjectCreateRequest {
  name: string;
  vcs_url?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  vcs_url?: string;
  settings?: Partial<ProjectSettings>;
}

// ─── Integrations ────────────────────────────────────────────────────────────

export type IntegrationProvider = "jira" | "slack";

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, string>;
  created_at: string;
}

export interface IntegrationCreateRequest {
  provider: IntegrationProvider;
  config: Record<string, string>;
}

export interface IntegrationTestResponse {
  success: boolean;
  message: string;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface ReadyResponse {
  status: string;
  checks: Record<string, string>;
}

// ─── Similar Bugs ────────────────────────────────────────────────────────────

export interface SimilarBugParams {
  limit?: number;
  threshold?: number;
}
