// ── Capture types shared across extension components ──

export type Severity = "P0" | "P1" | "P2" | "P3";

export interface BugFormData {
  title: string;
  description: string;
  project_id: string;
  severity: Severity;
}

export interface ConsoleEntry {
  level: "log" | "warn" | "error" | "info" | "debug";
  message: string;
  timestamp: string;
  stack?: string;
}

export interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  statusText: string;
  mimeType: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  startedAt: string;
  duration: number;
  size: number;
}

export interface HarLog {
  log: {
    version: string;
    creator: { name: string; version: string };
    entries: HarEntry[];
  };
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    headers: HarNameValue[];
    queryString: HarNameValue[];
    postData?: { mimeType: string; text: string };
  };
  response: {
    status: number;
    statusText: string;
    headers: HarNameValue[];
    content: { size: number; mimeType: string; text?: string };
  };
  timings: { send: number; wait: number; receive: number };
}

export interface HarNameValue {
  name: string;
  value: string;
}

export interface EnvFingerprint {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
  deviceMemory?: string;
  hardwareConcurrency?: number;
  connectionType?: string;
}

export interface PerfMetrics {
  lcp?: number;
  cls?: number;
  fid?: number;
  ttfb?: number;
  fcp?: number;
  load?: number;
  domContentLoaded?: number;
}

export interface ContentCollection {
  domSnapshot: string;
  perfMetrics: PerfMetrics;
  consoleLog: ConsoleEntry[];
  url: string;
  title: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
}

// ── Message types between popup ↔ service-worker ↔ content-script ──

export type PopupMessage =
  | { type: "LOGIN"; email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "GET_STATE" }
  | { type: "CAPTURE_BUG"; bugData: BugFormData }
  | { type: "GET_PROJECTS" };

export type ServiceWorkerResponse =
  | { success: true; data?: unknown }
  | { success: false; error: string };

export type ContentMessage =
  | { type: "COLLECT_DATA" }
  | { type: "GET_CONSOLE_LOG" };

export interface Project {
  id: string;
  name: string;
  key: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: { email: string; name?: string } | null;
}

export type CaptureStatus =
  | "idle"
  | "authenticating"
  | "capturing"
  | "submitting"
  | "success"
  | "error";
