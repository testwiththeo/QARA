import type {
  AuthResponse,
  Bug,
  BugCreateRequest,
  BugListItem,
  BugListParams,
  BugUpdateRequest,
  BugCapture,
  CaptureUploadRequest,
  Integration,
  IntegrationCreateRequest,
  IntegrationTestResponse,
  LoginRequest,
  PaginatedResponse,
  Project,
  ProjectCreateRequest,
  ProjectListItem,
  ProjectUpdateRequest,
  RefreshResponse,
  RegisterRequest,
  SimilarBug,
  SimilarBugParams,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// ─── Token Management ────────────────────────────────────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem("access_token");
  }
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (!refreshToken) {
    refreshToken = localStorage.getItem("refresh_token");
  }
  return refreshToken;
}

// ─── Fetch Wrapper ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  detail: string;
  body?: unknown;

  constructor(status: number, detail: string, body?: unknown) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

async function refreshAccessToken(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new ApiError(401, "No refresh token available");

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });

  if (!res.ok) {
    clearTokens();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const data: RefreshResponse = await res.json();
  // Keep the same refresh token, only update access token
  accessToken = data.access_token;
  localStorage.setItem("access_token", data.access_token);
  return data.access_token;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
      }
      const newToken = await refreshPromise;
      refreshPromise = null;

      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    } catch {
      refreshPromise = null;
      clearTokens();
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }
  }

  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetchWithAuth(url, options);

  if (!res.ok) {
    let detail = res.statusText;
    let body: unknown;
    try {
      body = await res.json();
      if (body && typeof body === "object" && "detail" in body) {
        detail = (body as { detail: string }).detail;
      }
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, detail, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setTokens(res.access_token, res.refresh_token);
  return res;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setTokens(res.access_token, res.refresh_token);
  return res;
}

export async function refresh(): Promise<RefreshResponse> {
  const rt = getRefreshToken();
  return request<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: rt }),
  });
}

// ─── Bug Endpoints ───────────────────────────────────────────────────────────

export async function listBugs(params: BugListParams): Promise<PaginatedResponse<BugListItem>> {
  const searchParams = new URLSearchParams();
  searchParams.set("project_id", params.project_id);
  if (params.status) searchParams.set("status", params.status);
  if (params.severity) searchParams.set("severity", params.severity);
  if (params.assignee_id) searchParams.set("assignee_id", params.assignee_id);
  if (params.search) searchParams.set("search", params.search);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));

  return request(`/bugs?${searchParams}`);
}

export async function getBug(id: string): Promise<Bug> {
  return request(`/bugs/${id}`);
}

export async function createBug(data: BugCreateRequest): Promise<Bug> {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("project_id", data.project_id);
  if (data.description) formData.append("description", data.description);
  if (data.severity) formData.append("severity", data.severity);
  if (data.steps_to_reproduce) formData.append("steps_to_reproduce", data.steps_to_reproduce);
  if (data.expected_behavior) formData.append("expected_behavior", data.expected_behavior);
  if (data.actual_behavior) formData.append("actual_behavior", data.actual_behavior);
  if (data.captures) {
    data.captures.forEach((file) => formData.append("captures[]", file));
  }

  return request("/bugs", {
    method: "POST",
    body: formData,
  });
}

export async function updateBug(id: string, data: BugUpdateRequest): Promise<Bug> {
  return request(`/bugs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getSimilarBugs(
  bugId: string,
  params?: SimilarBugParams
): Promise<SimilarBug[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.threshold) searchParams.set("threshold", String(params.threshold));

  return request(`/bugs/${bugId}/similar?${searchParams}`);
}

// ─── Capture Endpoints ───────────────────────────────────────────────────────

export async function uploadCapture(data: CaptureUploadRequest): Promise<BugCapture> {
  const formData = new FormData();
  formData.append("bug_report_id", data.bug_report_id);
  formData.append("capture_type", data.capture_type);
  formData.append("file", data.file);

  return request("/captures/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getCapturesForBug(bugId: string): Promise<BugCapture[]> {
  return request(`/captures/bug/${bugId}`);
}

export function getCaptureUrl(captureId: string): string {
  return `${API_BASE}/captures/${captureId}`;
}

// ─── Project Endpoints ───────────────────────────────────────────────────────

export async function listProjects(): Promise<{ items: ProjectListItem[] }> {
  return request("/projects");
}

export async function getProject(id: string): Promise<Project> {
  return request(`/projects/${id}`);
}

export async function createProject(data: ProjectCreateRequest): Promise<Project> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: ProjectUpdateRequest): Promise<Project> {
  return request(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Integration Endpoints ───────────────────────────────────────────────────

export async function listIntegrations(): Promise<{ items: Integration[] }> {
  return request("/integrations");
}

export async function createIntegration(data: IntegrationCreateRequest): Promise<Integration> {
  return request("/integrations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteIntegration(id: string): Promise<void> {
  return request(`/integrations/${id}`, { method: "DELETE" });
}

export async function testIntegration(id: string): Promise<IntegrationTestResponse> {
  return request(`/integrations/${id}/test`, { method: "POST" });
}
