import { useEffect } from "react";
import { useProjectStore } from "@/stores/bugStore";

export function useProjects() {
  const { projects, selectedProjectId, isLoading, fetchProjects, setSelectedProject } =
    useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, selectedProjectId, isLoading, setSelectedProject };
}
