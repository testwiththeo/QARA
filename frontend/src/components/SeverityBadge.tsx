import type { BugSeverity } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const severityConfig: Record<BugSeverity, { label: string; className: string }> = {
  P0: { label: "P0 Critical", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  P1: { label: "P1 High", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  P2: { label: "P2 Medium", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  P3: { label: "P3 Low", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
};

interface SeverityBadgeProps {
  severity: BugSeverity | null | undefined;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  if (!severity) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Pending
      </Badge>
    );
  }
  const config = severityConfig[severity];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
