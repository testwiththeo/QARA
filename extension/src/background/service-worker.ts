/**
 * service-worker.ts — Background service worker for QARA extension.
 *
 * Orchestrates all data collectors, packages FormData, and POSTs to the API.
 * Must complete within 25 seconds (service worker 30s timeout).
 */

import { login, logout, getAuthState, fetchProjects, submitBug } from "../lib/api";
import { captureScreenshot } from "../lib/screenshot";
import { collectFingerprint, fingerprintToJson } from "../lib/fingerprint";
import { captureNetworkHar, harToJsonBlob } from "../lib/network";
import { consoleEntriesToJson } from "../lib/console";
import type {
  BugFormData,
  ContentCollection,
  EnvFingerprint,
} from "../types/capture";

// ── Message Router ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse(result))
    .catch((err) =>
      sendResponse({ success: false, error: (err as Error).message })
    );
  return true; // keep channel open for async
});

async function handleMessage(
  message: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (message.type) {
    case "LOGIN":
      return handleLogin(
        message.email as string,
        message.password as string
      );
    case "LOGOUT":
      await logout();
      return { success: true };
    case "GET_STATE":
      return { success: true, data: await getAuthState() };
    case "GET_PROJECTS":
      return { success: true, data: await fetchProjects() };
    case "CAPTURE_BUG":
      return handleCaptureBug(message.bugData as BugFormData);
    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

async function handleLogin(
  email: string,
  password: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const state = await login(email, password);
    return { success: true, data: state };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Bug Capture Orchestration ──

async function handleCaptureBug(
  bugData: BugFormData
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const errors: string[] = [];

  // 1. Get active tab info
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id) {
    return { success: false, error: "No active tab found" };
  }

  // 2. Run collectors in parallel (with individual error handling)
  const [contentResult, screenshotResult, networkResult] = await Promise.allSettled([
    collectFromContentScript(activeTab.id),
    captureScreenshot(),
    captureNetworkHar(activeTab.id),
  ]);

  // Process content script data
  let contentData: ContentCollection | null = null;
  if (contentResult.status === "fulfilled") {
    contentData = contentResult.value;
  } else {
    errors.push(`Content script: ${contentResult.reason?.message ?? "failed"}`);
  }

  // Process screenshot
  let screenshotBlob: Blob | null = null;
  if (screenshotResult.status === "fulfilled") {
    screenshotBlob = screenshotResult.value;
  } else {
    errors.push(`Screenshot: ${screenshotResult.reason?.message ?? "failed"}`);
  }

  // Process network HAR
  let networkHar: ReturnType<typeof harToJsonBlob> | null = null;
  if (networkResult.status === "fulfilled") {
    networkHar = harToJsonBlob(networkResult.value);
  } else {
    errors.push(`Network: ${networkResult.reason?.message ?? "failed"}`);
  }

  // 3. Collect fingerprint (uses content script data for screen/viewport info)
  const fingerprint: EnvFingerprint = collectFingerprint(
    contentData
      ? {
          screenResolution: contentData.screenResolution,
          viewportSize: contentData.viewportSize,
          colorDepth: contentData.colorDepth,
        }
      : undefined
  );

  // 4. Build FormData
  const formData = new FormData();
  formData.append("title", bugData.title);
  formData.append("description", enrichDescription(bugData.description, contentData));
  formData.append("project_id", bugData.project_id);
  formData.append("severity", bugData.severity);

  // Append files (only successful collections)
  if (screenshotBlob) {
    formData.append("files", screenshotBlob, "screenshot.png");
  }

  if (contentData?.consoleLog?.length) {
    formData.append(
      "files",
      consoleEntriesToJson(contentData.consoleLog),
      "console_log.json"
    );
  }

  if (networkHar) {
    formData.append("files", networkHar, "network.har");
  }

  if (contentData?.domSnapshot) {
    formData.append(
      "files",
      new Blob([contentData.domSnapshot], { type: "text/html" }),
      "dom_snapshot.html"
    );
  }

  formData.append("files", fingerprintToJson(fingerprint), "env_fingerprint.json");

  // 5. Submit
  try {
    const result = await submitBug(formData);

    const summary = errors.length > 0
      ? `Bug submitted with warnings: ${errors.join("; ")}`
      : "Bug captured and submitted successfully!";

    showNotification("QARA Bug Submitted", summary, errors.length > 0);

    return { success: true, data: result };
  } catch (err) {
    const errorMsg = `Submission failed: ${(err as Error).message}`;
    showNotification("QARA Submission Failed", errorMsg, true);
    return { success: false, error: errorMsg };
  }
}

// ── Helpers ──

async function collectFromContentScript(
  tabId: number
): Promise<ContentCollection> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Content script timed out (10s)")),
      10000
    );

    chrome.tabs.sendMessage(
      tabId,
      { type: "COLLECT_DATA" },
      (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.success) {
          resolve(response.data as ContentCollection);
        } else {
          reject(new Error(response?.error ?? "Content script returned error"));
        }
      }
    );
  });
}

function enrichDescription(
  userDescription: string,
  contentData: ContentCollection | null
): string {
  let description = userDescription;

  if (contentData) {
    description += `\n\n---\n**Page URL:** ${contentData.url}\n**Page Title:** ${contentData.title}`;

    const pm = contentData.perfMetrics;
    const metrics: string[] = [];
    if (pm.lcp != null) metrics.push(`LCP: ${pm.lcp.toFixed(0)}ms`);
    if (pm.cls != null) metrics.push(`CLS: ${pm.cls.toFixed(3)}`);
    if (pm.fid != null) metrics.push(`FID: ${pm.fid.toFixed(0)}ms`);
    if (pm.ttfb != null) metrics.push(`TTFB: ${pm.ttfb.toFixed(0)}ms`);
    if (pm.fcp != null) metrics.push(`FCP: ${pm.fcp.toFixed(0)}ms`);
    if (metrics.length > 0) {
      description += `\n**Performance:** ${metrics.join(" | ")}`;
    }
  }

  return description;
}

function showNotification(
  title: string,
  message: string,
  isError: boolean
): void {
  chrome.notifications.create({
    type: "basic",
    iconUrl: isError ? "icons/icon128.png" : "icons/icon128.png",
    title,
    message: message.slice(0, 200), // Notification message limit
    priority: isError ? 2 : 1,
  });
}
