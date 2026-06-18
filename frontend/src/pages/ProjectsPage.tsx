import { useEffect, useState } from "react";
import * as api from "@/api/client";
import type { ProjectListItem } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Plus } from "lucide-react";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVcsUrl, setNewVcsUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.listProjects();
      setProjects(data.items);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.createProject({
        name: newName,
        vcs_url: newVcsUrl || undefined,
      });
      setNewName("");
      setNewVcsUrl("");
      setShowCreate(false);
      fetchProjects();
    } catch {
      // handle error
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Payment Service"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vcs_url">VCS URL (optional)</Label>
                <Input
                  id="vcs_url"
                  value={newVcsUrl}
                  onChange={(e) => setNewVcsUrl(e.target.value)}
                  placeholder="https://github.com/org/payment-service"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating || !newName.trim()}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Project List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mb-4" />
          <p className="text-lg">No projects yet</p>
          <p className="text-sm">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{project.bug_count} bugs</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
