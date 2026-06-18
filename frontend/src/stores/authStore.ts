import { create } from "zustand";
import type { User } from "@/api/types";
import * as api from "@/api/client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login({ email, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ user: null, isAuthenticated: false, isLoading: false, error: message });
      throw err;
    }
  },

  logout: () => {
    api.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  initialize: () => {
    const token = api.getAccessToken();
    if (token) {
      // Try to decode basic user info from JWT payload
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        set({
          user: {
            id: payload.sub || payload.user_id,
            email: payload.email || "",
            name: payload.name || "",
            role: payload.role || "qa",
            tenant_id: payload.tenant_id || "",
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        api.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
