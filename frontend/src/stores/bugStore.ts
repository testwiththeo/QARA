import { create } from "zustand";
import type { BugListItem, BugListParams, ProjectListItem } from "@/api/types";
import * as api from "@/api/client";

interface BugState {
  bugs: BugListItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  fetchBugs: (params: BugListParams) => Promise<void>;
}

export const useBugStore = create<BugState>((set) => ({
  bugs: [],
  total: 0,
  page: 1,
  totalPages: 0,
  isLoading: false,
  error: null,

  fetchBugs: async (params: BugListParams) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.listBugs(params);
      set({
        bugs: data.items,
        total: data.total,
        page: data.page,
        totalPages: data.total_pages,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch bugs";
      set({ isLoading: false, error: message });
    }
  },
}));

interface ProjectState {
  projects: ProjectListItem[];
  selectedProjectId: string | null;
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  setSelectedProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  selectedProjectId: localStorage.getItem("selected_project_id"),
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const data = await api.listProjects();
      set((state) => ({
        projects: data.items,
        isLoading: false,
        selectedProjectId:
          state.selectedProjectId || (data.items.length > 0 ? data.items[0].id : null),
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  setSelectedProject: (id: string) => {
    localStorage.setItem("selected_project_id", id);
    set({ selectedProjectId: id });
  },
}));
