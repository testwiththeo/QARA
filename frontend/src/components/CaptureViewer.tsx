import type { BugCapture } from "@/api/types";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, FileText, Globe, Monitor, Code } from "lucide-react";
import { cn } from "@/lib/utils";

const captureTypeIcons: Record<string, typeof Image> = {
  screenshot: Image,
  console_log: FileText,
  network_har: Globe,
  dom_snapshot: Code,
  env_fingerprint: Monitor,
};

const captureTypeLabels: Record<string, string> = {
  screenshot: "Screenshot",
  console_log: "Console Logs",
  network_har: "Network HAR",
  dom_snapshot: "DOM Snapshot",
  env_fingerprint: "Environment",
  video: "Video",
  session_replay: "Session Replay",
};

interface CaptureViewerProps {
  captures: BugCapture[];
}

export function CaptureViewer({ captures }: CaptureViewerProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!captures || captures.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No captures available
        </CardContent>
      </Card>
    );
  }

  const activeCapture = captures[activeTab];

  return (
    <Card>
      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {captures.map((capture, index) => {
          const Icon = captureTypeIcons[capture.capture_type] || FileText;
          return (
            <Button
              key={capture.id}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none border-b-2 flex items-center gap-2 shrink-0",
                index === activeTab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab(index)}
            >
              <Icon className="h-3.5 w-3.5" />
              {captureTypeLabels[capture.capture_type] || capture.capture_type}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {activeCapture.capture_type === "screenshot" && (
          <img
            src={activeCapture.file_url}
            alt="Bug screenshot"
            className="max-w-full rounded-md border border-border"
          />
        )}
        {activeCapture.capture_type === "video" && (
          <video src={activeCapture.file_url} controls className="max-w-full rounded-md" />
        )}
        {(activeCapture.capture_type === "console_log" ||
          activeCapture.capture_type === "network_har" ||
          activeCapture.capture_type === "dom_snapshot") && (
          <div className="bg-muted rounded-md p-4 overflow-auto max-h-[500px]">
            <a
              href={activeCapture.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              View raw file
            </a>
            <iframe
              src={activeCapture.file_url}
              className="w-full h-[400px] mt-2 border-0 rounded bg-background"
              title={captureTypeLabels[activeCapture.capture_type]}
            />
          </div>
        )}
        {activeCapture.capture_type === "env_fingerprint" && (
          <div className="space-y-2">
            <a
              href={activeCapture.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              View environment data
            </a>
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          {(activeCapture.file_size_bytes / 1024).toFixed(1)} KB &middot;{" "}
          {new Date(activeCapture.created_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
