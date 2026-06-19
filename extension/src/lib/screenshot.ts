/**
 * screenshot.ts — Capture a screenshot of the active tab using chrome.tabs.captureVisibleTab.
 */

export async function captureScreenshot(): Promise<Blob> {
  const dataUrl = await chrome.tabs.captureVisibleTab(undefined as never, {
    format: "png",
    quality: 90,
  });

  if (!dataUrl) {
    throw new Error("captureVisibleTab returned empty");
  }

  const res = await fetch(dataUrl);
  return res.blob();
}
