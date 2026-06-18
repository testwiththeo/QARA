import { useCallback, useEffect, useRef } from "react";
import { useBugStore } from "@/stores/bugStore";
import type { BugListParams } from "@/api/types";

export function useBugs(params: BugListParams, pollingInterval = 10000) {
  const { bugs, total, page, totalPages, isLoading, error, fetchBugs } = useBugStore();
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const refetch = useCallback(() => {
    fetchBugs(paramsRef.current);
  }, [fetchBugs]);

  // Initial fetch + refetch when params change
  useEffect(() => {
    refetch();
  }, [
    params.project_id,
    params.status,
    params.severity,
    params.search,
    params.sort_by,
    params.sort_order,
    params.page,
    params.page_size,
    refetch,
  ]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;
    const timer = setInterval(refetch, pollingInterval);
    return () => clearInterval(timer);
  }, [refetch, pollingInterval]);

  return { bugs, total, page, totalPages, isLoading, error, refetch };
}
