/**
 * console.ts — Console log interceptor with circular buffer.
 * 
 * This module is used by the content script. It monkey-patches console.*
 * methods to capture log entries in a ring buffer of 500 entries.
 * The buffer is flushed on request from the service worker.
 */

import type { ConsoleEntry } from "../types/capture";

const MAX_ENTRIES = 500;

export class ConsoleBuffer {
  private buffer: ConsoleEntry[] = [];
  private originalMethods: Partial<Record<string, typeof console.log>> = {};
  private installed = false;

  /**
   * Install console interceptors. Call once at content script init.
   */
  install(): void {
    if (this.installed) return;
    this.installed = true;

    const levels: ConsoleEntry["level"][] = ["log", "warn", "error", "info", "debug"];

    for (const level of levels) {
      this.originalMethods[level] = console[level];
      const original = console[level];

      console[level] = (...args: unknown[]) => {
        // Capture the entry
        const entry: ConsoleEntry = {
          level,
          message: args
            .map((a) => {
              if (typeof a === "string") return a;
              try {
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            })
            .join(" "),
          timestamp: new Date().toISOString(),
          stack: level === "error" ? new Error().stack : undefined,
        };

        this.push(entry);

        // Call original
        original.apply(console, args);
      };
    }
  }

  private push(entry: ConsoleEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer = this.buffer.slice(-MAX_ENTRIES);
    }
  }

  /**
   * Get all buffered entries and clear the buffer.
   */
  flush(): ConsoleEntry[] {
    const entries = [...this.buffer];
    this.buffer = [];
    return entries;
  }

  /**
   * Get all buffered entries without clearing.
   */
  peek(): ConsoleEntry[] {
    return [...this.buffer];
  }

  /**
   * Restore original console methods.
   */
  uninstall(): void {
    if (!this.installed) return;
    for (const [level, original] of Object.entries(this.originalMethods)) {
      if (original) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (console as unknown as Record<string, unknown>)[level] = original;
      }
    }
    this.installed = false;
  }
}

/**
 * Serialize console entries to JSON Blob for upload.
 */
export function consoleEntriesToJson(entries: ConsoleEntry[]): Blob {
  return new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
}
