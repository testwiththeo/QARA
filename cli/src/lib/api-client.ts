import { loadConfig, saveConfig, getEndpoint, type QaraConfig } from "./config.js";
import chalk from "chalk";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function rawFetch(
  endpoint: string,
  path: string,
  accessToken: string | undefined,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${endpoint}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Only set Content-Type for non-form-data requests
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...options, headers });
}

async function attemptRefresh(endpoint: string, config: QaraConfig): Promise<string | null> {
  if (!config.refresh_token) return null;

  try {
    const resp = await fetch(`${endpoint}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: config.refresh_token }),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as { access_token: string };
    config.access_token = data.access_token;
    await saveConfig(config);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<ApiResponse<T>> {
  const config = await loadConfig();
  const endpoint = getEndpoint(config);

  let response = await rawFetch(endpoint, path, config.access_token, options);

  // Auto-refresh on 401
  if (response.status === 401 && retryOn401 && config.refresh_token) {
    const newToken = await attemptRefresh(endpoint, config);
    if (newToken) {
      response = await rawFetch(endpoint, path, newToken, options);
    } else {
      // Refresh failed — prompt re-login
      console.error(
        chalk.red("Session expired. Please run ") +
          chalk.bold("qara login") +
          chalk.red(" to re-authenticate.")
      );
      process.exit(1);
    }
  }

  const contentType = response.headers.get("content-type") || "";
  let data: T;
  if (contentType.includes("application/json")) {
    data = (await response.json()) as T;
  } else {
    data = (await response.text()) as unknown as T;
  }

  if (!response.ok) {
    const errBody = data as Record<string, unknown>;
    const errorObj = errBody?.error as Record<string, unknown> | undefined;
    throw new ApiError(
      response.status,
      (errorObj?.code as string) || "request_failed",
      (errorObj?.message as string) || `Request failed with status ${response.status}`,
      errorObj?.details
    );
  }

  return { ok: true, status: response.status, data };
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export async function apiGet<T = unknown>(
  path: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "GET" });
}

export async function apiDelete<T = unknown>(
  path: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "DELETE" });
}
