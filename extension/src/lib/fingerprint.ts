/**
 * fingerprint.ts — Collect environment fingerprint data.
 *
 * Service worker context provides: userAgent, platform, language, timezone, etc.
 * Content script provides: screen resolution, viewport size, color depth.
 * These are merged into a single fingerprint object.
 */

import type { EnvFingerprint } from "../types/capture";

interface ScreenInfo {
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
}

export function collectFingerprint(screenInfo?: ScreenInfo): EnvFingerprint {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  return {
    userAgent: nav.userAgent,
    platform: nav.platform ?? "unknown",
    language: nav.language,
    languages: [...nav.languages],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: screenInfo?.screenResolution ?? "unknown",
    viewportSize: screenInfo?.viewportSize ?? "unknown",
    colorDepth: screenInfo?.colorDepth ?? 0,
    deviceMemory: nav.deviceMemory != null ? `${nav.deviceMemory}GB` : undefined,
    hardwareConcurrency: nav.hardwareConcurrency,
    connectionType: nav.connection?.effectiveType,
  };
}

export function fingerprintToJson(fp: EnvFingerprint): Blob {
  return new Blob([JSON.stringify(fp, null, 2)], {
    type: "application/json",
  });
}
