import React, { useState, useEffect, useCallback } from "react";
import type {
  AuthState,
  Project,
  Severity,
  BugFormData,
  CaptureStatus,
} from "../types/capture";

// ── Styles ──

const styles = {
  container: {
    width: 380,
    minHeight: 480,
    padding: 20,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 13,
    color: "#1a1a2e",
    background: "#ffffff",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #e8e8f0",
  } as React.CSSProperties,
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "linear-gradient(135deg, #6C3FD9, #9B6DFF)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontSize: 15,
  } as React.CSSProperties,
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  } as React.CSSProperties,
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  } as React.CSSProperties,
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } as React.CSSProperties,
  labelText: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
    minHeight: 70,
    resize: "vertical" as const,
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  severityRow: {
    display: "flex",
    gap: 6,
  } as React.CSSProperties,
  severityBtn: (active: boolean, severity: Severity): React.CSSProperties => ({
    flex: 1,
    padding: "6px 0",
    border: active ? "2px solid" : "1px solid #d1d5db",
    borderColor: active ? severityColor(severity) : "#d1d5db",
    borderRadius: 6,
    background: active ? `${severityColor(severity)}15` : "#fff",
    color: active ? severityColor(severity) : "#6b7280",
    fontWeight: active ? 700 : 400,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  button: (variant: "primary" | "secondary" | "danger"): React.CSSProperties => ({
    width: "100%",
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    background:
      variant === "primary"
        ? "linear-gradient(135deg, #6C3FD9, #8B5CF6)"
        : variant === "danger"
          ? "#ef4444"
          : "#f3f4f6",
    color: variant === "secondary" ? "#374151" : "#fff",
  }),
  status: (status: CaptureStatus): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    background: statusBg(status),
    color: statusColor(status),
    textAlign: "center" as const,
  }),
  divider: {
    height: 1,
    background: "#e8e8f0",
    margin: "4px 0",
  } as React.CSSProperties,
  errorText: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 2,
  } as React.CSSProperties,
  userInfo: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right" as const,
  } as React.CSSProperties,
} as const;

function severityColor(s: Severity): string {
  return { P0: "#dc2626", P1: "#ea580c", P2: "#ca8a04", P3: "#2563eb" }[s];
}

function statusBg(s: CaptureStatus): string {
  return {
    idle: "#f3f4f6",
    authenticating: "#fef3c7",
    capturing: "#ede9fe",
    submitting: "#ede9fe",
    success: "#dcfce7",
    error: "#fee2e2",
  }[s];
}

function statusColor(s: CaptureStatus): string {
  return {
    idle: "#6b7280",
    authenticating: "#92400e",
    capturing: "#6d28d9",
    submitting: "#6d28d9",
    success: "#166534",
    error: "#991b1b",
  }[s];
}

// ── Component ──

export function Popup() {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    refreshToken: null,
    user: null,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Bug form
  const [selectedProject, setSelectedProject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("P2");
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Load auth state on mount
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: "GET_STATE" },
      (response) => {
        if (response?.success && response.data) {
          setAuth(response.data as AuthState);
        }
        setLoading(false);
      }
    );
  }, []);

  // Load projects when authenticated
  useEffect(() => {
    if (!auth.token) return;
    chrome.runtime.sendMessage(
      { type: "GET_PROJECTS" },
      (response) => {
        if (response?.success && Array.isArray(response.data)) {
          const projs = response.data as Project[];
          setProjects(projs);
          if (projs.length > 0 && !selectedProject) {
            setSelectedProject(projs[0].id);
          }
        }
      }
    );
  }, [auth.token, selectedProject]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError("");
      setStatus("authenticating");
      setStatusMessage("Logging in...");

      chrome.runtime.sendMessage(
        { type: "LOGIN", email, password },
        (response) => {
          if (response?.success) {
            setAuth(response.data as AuthState);
            setStatus("idle");
            setStatusMessage("");
          } else {
            setLoginError(response?.error ?? "Login failed");
            setStatus("error");
            setStatusMessage(response?.error ?? "Login failed");
          }
        }
      );
    },
    [email, password]
  );

  const handleLogout = useCallback(() => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
      setAuth({ token: null, refreshToken: null, user: null });
      setProjects([]);
      setSelectedProject("");
    });
  }, []);

  const handleCapture = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim() || !selectedProject) return;

      setStatus("capturing");
      setStatusMessage("Capturing diagnostic data...");

      const bugData: BugFormData = {
        title: title.trim(),
        description: description.trim(),
        project_id: selectedProject,
        severity,
      };

      // After 2s show "submitting" status
      const submitTimer = setTimeout(() => {
        setStatus("submitting");
        setStatusMessage("Submitting to QARA...");
      }, 2000);

      chrome.runtime.sendMessage(
        { type: "CAPTURE_BUG", bugData },
        (response) => {
          clearTimeout(submitTimer);
          if (response?.success) {
            setStatus("success");
            setStatusMessage("Bug captured and submitted!");
            // Reset form
            setTitle("");
            setDescription("");
            setSeverity("P2");
          } else {
            setStatus("error");
            setStatusMessage(response?.error ?? "Submission failed");
          }
        }
      );
    },
    [title, description, selectedProject, severity]
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>Q</div>
        <h1 style={styles.title}>QARA Bug Capture</h1>
      </div>

      {/* Authenticated: Show Bug Form */}
      {auth.token ? (
        <form style={styles.form} onSubmit={handleCapture}>
          {/* User info + logout */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={styles.userInfo}>
              {auth.user?.email ?? "Logged in"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                ...styles.button("secondary"),
                width: "auto",
                padding: "4px 12px",
                fontSize: 11,
              }}
            >
              Logout
            </button>
          </div>

          <div style={styles.divider} />

          {/* Project selector */}
          <div style={styles.label}>
            <span style={styles.labelText}>Project</span>
            <select
              style={styles.select}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              required
            >
              {projects.length === 0 && (
                <option value="" disabled>
                  No projects found
                </option>
              )}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={styles.label}>
            <span style={styles.labelText}>Title</span>
            <input
              style={styles.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short bug description"
              required
            />
          </div>

          {/* Description */}
          <div style={styles.label}>
            <span style={styles.labelText}>Description</span>
            <textarea
              style={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, expected vs actual behavior..."
            />
          </div>

          {/* Severity */}
          <div style={styles.label}>
            <span style={styles.labelText}>Severity</span>
            <div style={styles.severityRow}>
              {(["P0", "P1", "P2", "P3"] as Severity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  style={styles.severityBtn(severity === s, s)}
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status display */}
          {status !== "idle" && (
            <div style={styles.status(status)}>{statusMessage}</div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            style={styles.button("primary")}
            disabled={
              !title.trim() ||
              !selectedProject ||
              status === "capturing" ||
              status === "submitting" ||
              status === "authenticating"
            }
          >
            {status === "capturing" || status === "submitting"
              ? "Capturing..."
              : "Capture & Submit Bug"}
          </button>
        </form>
      ) : (
        /* Login Form */
        <form style={styles.form} onSubmit={handleLogin}>
          <div style={styles.label}>
            <span style={styles.labelText}>Email</span>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.label}>
            <span style={styles.labelText}>Password</span>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
          </div>

          {loginError && <div style={styles.errorText}>{loginError}</div>}

          {status === "error" && statusMessage && (
            <div style={styles.status("error")}>{statusMessage}</div>
          )}

          <button
            type="submit"
            style={styles.button("primary")}
            disabled={!email || !password || status === "authenticating"}
          >
            {status === "authenticating" ? "Logging in..." : "Log In"}
          </button>
        </form>
      )}
    </div>
  );
}
