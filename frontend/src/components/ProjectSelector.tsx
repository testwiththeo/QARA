import { useProjects } from "@/hooks/useProjects";
import { Select } from "@/components/ui/select";

export function ProjectSelector() {
  const { projects, selectedProjectId, setSelectedProject, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="h-9 rounded-md border border-input bg-muted animate-pulse" />
    );
  }

  return (
    <Select
      value={selectedProjectId || ""}
      onChange={(e) => setSelectedProject(e.target.value)}
      className="w-full"
    >
      {projects.length === 0 && <option value="">No projects</option>}
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </Select>
  );
}
