/**
 * content/collector.ts — Content script that runs in every page.
 *
 * Responsibilities:
 * 1. Intercept console.* calls (circular buffer, 500 entries)
 * 2. Capture DOM snapshot (document.documentElement.outerHTML)
 * 3. Capture performance metrics (LCP, CLS, FID, TTFB, FCP)
 * 4. Listen for messages from the service worker and respond with data
 */

import type { ConsoleEntry, PerfMetrics, ContentCollection } from "../types/capture";

// ── Console Intercept ──

const MAX_CONSOLE = 500;
const consoleBuffer: ConsoleEntry[] = [];

function installConsoleIntercept(): void {
  const levels: ConsoleEntry["level"][] = ["log", "warn", "error", "info", "debug"];

  for (const level of levels) {
    const original = console[level].bind(console);
    const patched = (...args: unknown[]) => {
      const entry: ConsoleEntry = {
        level,
        message: args
          .map((a) => {
            if (typeof a === "string") return a;
            if (a instanceof Error) return a.stack ?? a.message;
            try { return JSON.stringify(a); } catch { return String(a); }
          })
          .join(" "),
        timestamp: new Date().toISOString(),
        stack: level === "error" ? new Error().stack : undefined,
      };

      consoleBuffer.push(entry);
      if (consoleBuffer.length > MAX_CONSOLE) {
        consoleBuffer.splice(0, consoleBuffer.length - MAX_CONSOLE);
      }

      original(...args);
    };
    console[level] = patched;
  }
}

// ── Performance Metrics ──

function collectPerfMetrics(): PerfMetrics {
  const metrics: PerfMetrics = {};

  // Navigation timing
  const navEntry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navEntry) {
    metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
    metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.startTime;
    metrics.load = navEntry.loadEventEnd - navEntry.startTime;
  }

  // Paint timing
  const paintEntries = performance.getEntriesByType("paint");
  for (const entry of paintEntries) {
    if (entry.name === "first-contentful-paint") {
      metrics.fcp = entry.startTime;
    }
  }

  // LCP — use largest-contentful-paint if available
  // (PerformanceObserver may not fire synchronously, so we use what we have)
  try {
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      const last = lcpEntries[lcpEntries.length - 1];
      metrics.lcp = last.startTime;
    }
  } catch {
    // Not supported in all browsers
  }

  // Long task for FID approximation
  try {
    const longTasks = performance.getEntriesByType("longtask");
    if (longTasks.length > 0) {
      // FID approximation: first input delay not directly available synchronously,
      // use first long task duration as proxy
      metrics.fid = longTasks[0].duration;
    }
  } catch {
    // Not available
  }

  // CLS — layout shift entries
  try {
    const layoutShifts = performance.getEntriesByType("layout-shift");
    let clsValue = 0;
    for (const entry of layoutShifts) {
      const e = entry as unknown as Record<string, unknown>;
      if (!e.hadRecentInput) {
        clsValue += (e.value as number) ?? 0;
      }
    }
    metrics.cls = clsValue;
  } catch {
    // Not available
  }

  return metrics;
}

// ── DOM Snapshot ──

function captureDomSnapshot(): string {
  return document.documentElement.outerHTML;
}

// ── Message Listener ──

chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, sendResponse) => {
    if (message.type === "COLLECT_DATA") {
      const data: ContentCollection = {
        domSnapshot: captureDomSnapshot(),
        perfMetrics: collectPerfMetrics(),
        consoleLog: [...consoleBuffer],
        url: window.location.href,
        title: document.title,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        colorDepth: screen.colorDepth,
      };
      sendResponse({ success: true, data });
      return true; // async response
    }

    if (message.type === "GET_CONSOLE_LOG") {
      sendResponse({ success: true, data: [...consoleBuffer] });
      return true;
    }
  }
);

// Install immediately (runs at document_start)
installConsoleIntercept();
