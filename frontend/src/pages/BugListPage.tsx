import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useBugs } from "@/hooks/useBugs";
import { useProjectStore } from "@/stores/bugStore";
import { BugTable } from "@/components/BugTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import type { BugSortBy, BugStatus, BugSeverity, SortOrder } from "@/api/types";

export function BugListPage() {
  const { selectedProjectId } = useProjectStore();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<BugStatus | "">("");
  const [severity, setSeverity] = useState<BugSeverity | "">("");
  const [sortBy, setSortBy] = useState<BugSortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const params = {
    project_id: selectedProjectId || "",
    status: status || undefined,
    severity: severity || undefined,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: 20,
  };

  const { bugs, total, totalPages, isLoading } = useBugs(
    params,
    selectedProjectId ? 10000 : 0
  );

  const handleSort = useCallback(
    (field: BugSortBy) => {
      if (field === sortBy) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a project to view bugs
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bugs</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-60"
          />
        </div>

        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BugStatus | "");
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="triaging">Triaging</option>
          <option value="triaged">Triaged</option>
          <option value="closed">Closed</option>
        </Select>

        <Select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value as BugSeverity | "");
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All Severity</option>
          <option value="P0">P0 Critical</option>
          <option value="P1">P1 High</option>
          <option value="P2">P2 Medium</option>
          <option value="P3">P3 Low</option>
        </Select>
      </div>

      {/* Table */}
      <BugTable
        bugs={bugs}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
