import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as api from "@/api/client";
import type { Bug, BugStatus } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugStatusBadge } from "@/components/BugStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { CaptureViewer } from "@/components/CaptureViewer";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Valid state transitions
const validTransitions: Record<BugStatus, BugStatus[]> = {
  open: ["triaging"],
  triaging: ["triaged"],
  triaged: ["closed", "open"],
  closed: ["open"],
};

const transitionLabels: Record<string, { label: string; icon: typeof Play }> = {
  triaging: { label: "Start Triaging", icon: Play },
  triaged: { label: "Mark Triaged", icon: CheckCircle },
  closed: { label: "Close Bug", icon: CheckCircle },
  open: { label: "Reopen", icon: RotateCcw },
};

export function BugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bug, setBug] = useState<Bug | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .getBug(id)
      .then((data) => {
        setBug(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load bug");
        setIsLoading(false);
      });
  }, [id]);

  const handleStatusTransition = async (newStatus: BugStatus) => {
    if (!bug) return;
    setIsUpdating(true);
    try {
      const updated = await api.updateBug(bug.id, { status: newStatus });
      setBug(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/bugs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bugs
        </Button>
        <div className="text-center text-muted-foreground py-12">
          {error || "Bug not found"}
        </div>
      </div>
    );
  }

  const transitions = validTransitions[bug.status] || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bugs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{bug.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <BugStatusBadge status={bug.status} />
            <SeverityBadge severity={bug.severity} />
            {bug.component && (
              <Badge variant="outline">{bug.component}</Badge>
            )}
            {bug.risk_score != null && (
              <span className="text-sm text-muted-foreground">
                Risk: {bug.risk_score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status Transition Buttons */}
      {transitions.length > 0 && (
        <div className="flex items-center gap-2">
          {transitions.map((newStatus) => {
            const config = transitionLabels[newStatus];
            const Icon = config?.icon || Play;
            return (
              <Button
                key={newStatus}
                variant={newStatus === "closed" ? "destructive" : "outline"}
                size="sm"
                disabled={isUpdating}
                onClick={() => handleStatusTransition(newStatus)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {config?.label || newStatus}
              </Button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {bug.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{bug.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Steps to Reproduce */}
          {bug.steps_to_reproduce && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Steps to Reproduce</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{bug.steps_to_reproduce}</p>
              </CardContent>
            </Card>
          )}

          {/* Expected vs Actual */}
          {(bug.expected_behavior || bug.actual_behavior) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expected vs Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bug.expected_behavior && (
                  <div>
                    <p className="text-sm font-medium text-green-500 mb-1">Expected:</p>
                    <p className="text-sm">{bug.expected_behavior}</p>
                  </div>
                )}
                {bug.actual_behavior && (
                  <div>
                    <p className="text-sm font-medium text-red-500 mb-1">Actual:</p>
                    <p className="text-sm">{bug.actual_behavior}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Captures */}
          {bug.captures && bug.captures.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Captures</h2>
              <CaptureViewer captures={bug.captures} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow label="Reporter" value={bug.reporter?.name || "Unknown"} />
              <DetailRow label="Assignee" value={bug.assignee?.name || "Unassigned"} />
              <DetailRow label="Created" value={new Date(bug.created_at).toLocaleString()} />
              <DetailRow label="Updated" value={new Date(bug.updated_at).toLocaleString()} />
              {bug.resolved_at && (
                <DetailRow label="Resolved" value={new Date(bug.resolved_at).toLocaleString()} />
              )}
              {bug.duplicate_of && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">Duplicate of</span>
                  <a href={`/bugs/${bug.duplicate_of}`} className="text-primary hover:underline">
                    #{bug.duplicate_of.slice(0, 8)}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environment */}
          {bug.env_fingerprint && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Environment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DetailRow label="OS" value={bug.env_fingerprint.os} />
                <DetailRow label="Browser" value={bug.env_fingerprint.browser} />
                <DetailRow label="Resolution" value={bug.env_fingerprint.resolution} />
                <DetailRow label="Language" value={bug.env_fingerprint.language} />
              </CardContent>
            </Card>
          )}

          {/* Ticket Link */}
          {bug.ticket_url && (
            <Card>
              <CardContent className="p-4">
                <a
                  href={bug.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  View Jira Ticket
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Similar Bugs */}
          {bug.similar_bugs && bug.similar_bugs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Bugs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bug.similar_bugs.map((similar) => (
                  <a
                    key={similar.id}
                    href={`/bugs/${similar.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors text-sm"
                  >
                    <span className="truncate">{similar.title}</span>
                    <span className={cn(
                      "shrink-0 ml-2 text-xs",
                      similar.similarity >= 0.8 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {Math.round(similar.similarity * 100)}%
                    </span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
