import type { BugStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<BugStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  triaging: { label: "Triaging", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  triaged: { label: "Triaged", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  closed: { label: "Closed", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

interface BugStatusBadgeProps {
  status: BugStatus;
  className?: string;
}

export function BugStatusBadge({ status, className }: BugStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
