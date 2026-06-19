/**
 * network.ts — Network traffic capture via chrome.debugger API.
 *
 * Attaches to the active tab's debugger, enables the Network domain,
 * and collects the last 100 requests in HAR format.
 *
 * NOTE: chrome.debugger.attach shows a "this tab is being debugged" bar.
 * We attach, enable Network, wait for pending requests to settle,
 * then detach. Timeout: 10s max.
 */

import type { HarLog, HarEntry, HarNameValue } from "../types/capture";

const MAX_ENTRIES = 100;
const CAPTURE_TIMEOUT_MS = 8000;
const SETTLE_MS = 1500;

interface RawRequest {
  requestId: string;
  url: string;
  method: string;
  requestHeaders: HarNameValue[];
  postData?: string;
  response?: {
    status: number;
    statusText: string;
    headers: HarNameValue[];
    mimeType: string;
    encodedDataLength: number;
  };
  responseBody?: string;
  timestamp: number;
  endTime?: number;
}

export async function captureNetworkHar(tabId: number): Promise<HarLog> {
  const requests = new Map<string, RawRequest>();
  let attached = false;

  const debuggee = { tabId };

  try {
    // Attach debugger
    await chrome.debugger.attach(debuggee, "1.3");
    attached = true;

    // Enable Network domain
    await chrome.debugger.sendCommand(debuggee, "Network.enable", {
      maxResourceBufferSize: 5 * 1024 * 1024,
      maxTotalBufferSize: 10 * 1024 * 1024,
    });

    // Set up event listener
    const onEvent = (
      source: chrome.debugger.Debuggee,
      method: string,
      params?: object
    ) => {
      if (source.tabId !== tabId) return;
      handleNetworkEvent(method, (params ?? {}) as Record<string, unknown>, requests);
    };

    chrome.debugger.onEvent.addListener(onEvent);

    // Wait for network to settle
    await sleep(SETTLE_MS);

    // Wait up to CAPTURE_TIMEOUT_MS for more requests
    const deadline = Date.now() + CAPTURE_TIMEOUT_MS;
    let lastRequestCount = 0;
    let stableCount = 0;

    while (Date.now() < deadline) {
      const currentCount = requests.size;
      if (currentCount === lastRequestCount) {
        stableCount++;
        if (stableCount >= 3) break; // Stable for 3 checks
      } else {
        stableCount = 0;
        lastRequestCount = currentCount;
      }
      await sleep(500);
    }

    // Try to fetch response bodies for text-based responses
    for (const [, req] of requests) {
      if (req.response && isTextMime(req.response.mimeType)) {
        try {
          const result = await chrome.debugger.sendCommand(
            debuggee,
            "Network.getResponseBody",
            { requestId: req.requestId }
          );
          req.responseBody = (result as { body: string }).body;
        } catch {
          // Body may not be available — that's OK
        }
      }
    }

    chrome.debugger.onEvent.removeListener(onEvent);

    // Build HAR
    const entries = buildHarEntries(requests);
    return createHarLog(entries);
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(debuggee);
      } catch {
        // Tab might have been closed
      }
    }
  }
}

function handleNetworkEvent(
  method: string,
  params: Record<string, unknown>,
  requests: Map<string, RawRequest>
): void {
  switch (method) {
    case "Network.requestWillBeSent": {
      const request = params.request as Record<string, unknown>;
      const requestId = params.requestId as string;
      requests.set(requestId, {
        requestId,
        url: request.url as string,
        method: request.method as string,
        requestHeaders: headersToNameValue(
          request.headers as Record<string, string> | undefined
        ),
        postData: request.postData as string | undefined,
        timestamp: Date.now(),
      });
      break;
    }
    case "Network.responseReceived": {
      const response = params.response as Record<string, unknown>;
      const requestId = params.requestId as string;
      const req = requests.get(requestId);
      if (req) {
        req.response = {
          status: response.status as number,
          statusText: response.statusText as string,
          headers: headersToNameValue(
            response.headers as Record<string, string> | undefined
          ),
          mimeType: (response.mimeType as string) ?? "application/octet-stream",
          encodedDataLength: 0,
        };
      }
      break;
    }
    case "Network.loadingFinished": {
      const requestId = params.requestId as string;
      const req = requests.get(requestId);
      if (req) {
        req.endTime = Date.now();
        if (req.response) {
          req.response.encodedDataLength =
            (params.encodedDataLength as number) ?? 0;
        }
      }
      break;
    }
    case "Network.loadingFailed": {
      const requestId = params.requestId as string;
      const req = requests.get(requestId);
      if (req) {
        req.endTime = Date.now();
        req.response = {
          status: 0,
          statusText: params.errorText as string ?? "Failed",
          headers: [],
          mimeType: "application/octet-stream",
          encodedDataLength: 0,
        };
      }
      break;
    }
  }
}

function buildHarEntries(
  requests: Map<string, RawRequest>
): HarEntry[] {
  const allRequests = [...requests.values()];
  // Keep only last MAX_ENTRIES, sorted by timestamp
  const sorted = allRequests.sort((a, b) => a.timestamp - b.timestamp);
  const trimmed = sorted.slice(-MAX_ENTRIES);

  return trimmed.map((req) => ({
    startedDateTime: new Date(req.timestamp).toISOString(),
    time: req.endTime ? req.endTime - req.timestamp : 0,
    request: {
      method: req.method,
      url: req.url,
      headers: req.requestHeaders,
      queryString: parseQueryString(req.url),
      postData: req.postData
        ? { mimeType: "application/x-www-form-urlencoded", text: req.postData }
        : undefined,
    },
    response: {
      status: req.response?.status ?? 0,
      statusText: req.response?.statusText ?? "",
      headers: req.response?.headers ?? [],
      content: {
        size: req.response?.encodedDataLength ?? 0,
        mimeType: req.response?.mimeType ?? "application/octet-stream",
        text: req.responseBody,
      },
    },
    timings: {
      send: 0,
      wait: req.endTime ? req.endTime - req.timestamp : 0,
      receive: 0,
    },
  }));
}

function createHarLog(entries: HarEntry[]): HarLog {
  return {
    log: {
      version: "1.2",
      creator: { name: "QARA Bug Capture", version: "0.1.0" },
      entries,
    },
  };
}

function headersToNameValue(
  headers?: Record<string, string>
): HarNameValue[] {
  if (!headers) return [];
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

function parseQueryString(url: string): HarNameValue[] {
  try {
    const parsed = new URL(url);
    return [...parsed.searchParams.entries()].map(([name, value]) => ({
      name,
      value,
    }));
  } catch {
    return [];
  }
}

function isTextMime(mime: string): boolean {
  const textMimes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
  ];
  return textMimes.some((t) => mime.startsWith(t));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function harToJsonBlob(har: HarLog): Blob {
  return new Blob([JSON.stringify(har, null, 2)], {
    type: "application/json",
  });
}
