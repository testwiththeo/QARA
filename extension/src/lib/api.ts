import type { Project, AuthState } from "../types/capture";

const API_BASE = "http://localhost:8000/api/v1";

async function getStoredToken(): Promise<string | null> {
  const state = await chrome.storage.local.get("auth");
  return state.auth?.token ?? null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ──

export async function login(
  email: string,
  password: string
): Promise<AuthState> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Login failed (${res.status})`);
  }

  const data = await res.json();
  const authState: AuthState = {
    token: data.access_token,
    refreshToken: data.refresh_token,
    user: { email, name: data.name },
  };

  await chrome.storage.local.set({ auth: authState });
  return authState;
}

export async function logout(): Promise<void> {
  await chrome.storage.local.remove("auth");
}

export async function getAuthState(): Promise<AuthState> {
  const stored = await chrome.storage.local.get("auth");
  return (
    stored.auth ?? { token: null, refreshToken: null, user: null }
  );
}

// ── Projects ──

export async function fetchProjects(): Promise<Project[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/projects`, {
    headers: { ...headers, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch projects (${res.status})`);
  }

  const data = await res.json();
  return data.items ?? data;
}

// ── Bug Submission ──

export async function submitBug(formData: FormData): Promise<unknown> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/bugs`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Bug submission failed (${res.status})`);
  }

  return res.json();
}
