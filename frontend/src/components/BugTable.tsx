import { Link } from "react-router-dom";
import type { BugListItem } from "@/api/types";
import { BugStatusBadge } from "@/components/BugStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import type { BugSortBy, SortOrder } from "@/api/types";

interface BugTableProps {
  bugs: BugListItem[];
  isLoading: boolean;
  sortBy: BugSortBy;
  sortOrder: SortOrder;
  onSort: (field: BugSortBy) => void;
}

function SortIcon({ field, sortBy, sortOrder }: { field: BugSortBy; sortBy: BugSortBy; sortOrder: SortOrder }) {
  if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
  return sortOrder === "asc" ? (
    <ChevronUp className="h-3 w-3" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
}

export function BugTable({ bugs, isLoading, sortBy, sortOrder, onSort }: BugTableProps) {
  if (isLoading && bugs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (bugs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">No bugs found</p>
        <p className="text-sm">Create a new bug or adjust your filters</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              onClick={() => onSort("created_at")}
            >
              Title <SortIcon field="created_at" sortBy={sortBy} sortOrder={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="w-[120px]">
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              onClick={() => onSort("severity")}
            >
              Severity <SortIcon field="severity" sortBy={sortBy} sortOrder={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[120px]">Component</TableHead>
          <TableHead className="w-[100px]">
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              onClick={() => onSort("risk_score")}
            >
              Risk <SortIcon field="risk_score" sortBy={sortBy} sortOrder={sortOrder} />
            </button>
          </TableHead>
          <TableHead className="w-[120px]">Assignee</TableHead>
          <TableHead className="w-[140px]">
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              onClick={() => onSort("updated_at")}
            >
              Updated <SortIcon field="updated_at" sortBy={sortBy} sortOrder={sortOrder} />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bugs.map((bug) => (
          <TableRow key={bug.id}>
            <TableCell>
              <Link
                to={`/bugs/${bug.id}`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {bug.title}
              </Link>
            </TableCell>
            <TableCell>
              <SeverityBadge severity={bug.severity} />
            </TableCell>
            <TableCell>
              <BugStatusBadge status={bug.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">{bug.component || "—"}</TableCell>
            <TableCell>
              {bug.risk_score != null ? (
                <span className="text-sm">{bug.risk_score.toFixed(1)}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {bug.assignee?.name || "Unassigned"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(bug.updated_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
