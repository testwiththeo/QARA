import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { apiGet, apiPost } from "../lib/api-client.js";
import { loadConfig, getDashboardUrl } from "../lib/config.js";
import { buildBugFormData } from "../lib/bug-form.js";

// ── Severity / status color helpers ──────────────────────────────────

function severityColor(sev: string): string {
  switch (sev) {
    case "P0":
      return chalk.red.bold(sev);
    case "P1":
      return chalk.hex("#FF8C00")(sev); // orange
    case "P2":
      return chalk.yellow(sev);
    case "P3":
      return chalk.blue(sev);
    default:
      return chalk.dim(sev || "—");
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "open":
      return chalk.green(status);
    case "triaging":
      return chalk.yellow(status);
    case "triaged":
      return chalk.cyan(status);
    case "closed":
      return chalk.dim(status);
    default:
      return chalk.dim(status || "—");
  }
}

// ── Table formatter ──────────────────────────────────────────────────

interface BugRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  component?: string;
  reporter?: { name?: string };
  capture_count?: number;
  created_at: string;
}

function pad(str: string, len: number): string {
  // Strip ANSI for width calculation
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, "");
  const diff = len - stripped.length;
  return diff > 0 ? str + " ".repeat(diff) : str;
}

function printBugTable(bugs: BugRow[]): void {
  if (bugs.length === 0) {
    console.log(chalk.yellow("\n  No bugs found.\n"));
    return;
  }

  const headers = ["ID", "Title", "Severity", "Status", "Component", "Reporter", "Captures", "Created"];
  const widths = [8, 40, 10, 12, 16, 16, 10, 20];

  // Header line
  const headerLine = headers
    .map((h, i) => chalk.bold(pad(h, widths[i])))
    .join(" ");
  console.log();
  console.log("  " + headerLine);
  console.log("  " + widths.map((w) => "─".repeat(w)).join(" "));

  for (const bug of bugs) {
    const id = chalk.dim(bug.id.slice(0, 8));
    const title =
      bug.title.length > 38 ? bug.title.slice(0, 35) + "..." : bug.title;
    const sev = severityColor(bug.severity);
    const status = statusColor(bug.status);
    const component = chalk.dim(bug.component || "—");
    const reporter = chalk.dim(bug.reporter?.name || "—");
    const captures = String(bug.capture_count ?? 0);
    const created = chalk.dim(
      bug.created_at ? new Date(bug.created_at).toLocaleString() : "—"
    );

    const row = [
      pad(id, widths[0]),
      pad(title, widths[1]),
      pad(sev, widths[2]),
      pad(status, widths[3]),
      pad(component, widths[4]),
      pad(reporter, widths[5]),
      pad(captures, widths[6]),
      pad(created, widths[7]),
    ].join(" ");

    console.log("  " + row);
  }
  console.log();
}

// ── Bugs command group ───────────────────────────────────────────────

export function createBugsCommand(): Command {
  const bugs = new Command("bugs").description("Manage bug reports");

  // ── bugs list ────────────────────────────────────────────────────

  bugs
    .command("list")
    .description("List bug reports with optional filters")
    .option("--project <project_id>", "Filter by project ID")
    .option("--status <status>", "Filter by status (open, triaging, triaged, closed)")
    .option("--severity <severity>", "Filter by severity (P0, P1, P2, P3)")
    .option("--search <query>", "Search in title/description")
    .option("--page <page>", "Page number", "1")
    .option("--page-size <size>", "Results per page", "20")
    .action(
      async (opts: {
        project?: string;
        status?: string;
        severity?: string;
        search?: string;
        page: string;
        pageSize: string;
      }) => {
        const spinner = ora("Fetching bugs...").start();

        try {
          const params = new URLSearchParams();
          if (opts.project) params.set("project_id", opts.project);
          if (opts.status) params.set("status", opts.status);
          if (opts.severity) params.set("severity", opts.severity);
          if (opts.search) params.set("search", opts.search);
          params.set("page", opts.page);
          params.set("page_size", opts.pageSize);

          const queryStr = params.toString();
          const path = `/bugs${queryStr ? `?${queryStr}` : ""}`;

          const resp = await apiGet<{
            items: BugRow[];
            total: number;
            page: number;
            page_size: number;
            total_pages: number;
          }>(path);

          spinner.stop();

          printBugTable(resp.data.items);

          console.log(
            chalk.dim(
              `  Page ${resp.data.page} of ${resp.data.total_pages} (${resp.data.total} total bugs)`
            )
          );
          console.log();
        } catch (err) {
          spinner.fail(chalk.red((err as Error).message));
          process.exit(1);
        }
      }
    );

  // ── bugs create ──────────────────────────────────────────────────

  bugs
    .command("create")
    .description("Create a new bug report")
    .option("-t, --title <title>", "Bug title (required)")
    .option("-p, --project <project_id>", "Project ID (required)")
    .option("-s, --severity <severity>", "Severity: P0, P1, P2, P3")
    .option("-d, --description <desc>", "Bug description")
    .option("--file <path...>", "Attach capture file(s)")
    .option("--steps <steps>", "Steps to reproduce")
    .option("--expected <expected>", "Expected behavior")
    .option("--actual <actual>", "Actual behavior")
    .action(
      async (opts: {
        title?: string;
        project?: string;
        severity?: string;
        description?: string;
        file?: string[];
        steps?: string;
        expected?: string;
        actual?: string;
      }) => {
        if (!opts.title) {
          console.error(chalk.red("Error: --title is required"));
          process.exit(1);
        }
        if (!opts.project) {
          console.error(chalk.red("Error: --project is required"));
          process.exit(1);
        }

        const spinner = ora("Creating bug report...").start();

        try {
          const form = await buildBugFormData({
            title: opts.title,
            project_id: opts.project,
            severity: opts.severity,
            description: opts.description,
            steps: opts.steps,
            expected: opts.expected,
            actual: opts.actual,
            files: opts.file,
          });

          const resp = await apiPost<{ id: string; title: string }>(
            "/bugs",
            form
          );

          spinner.succeed(
            chalk.green(`Bug created: ${chalk.bold(resp.data.title)}`)
          );
          console.log(chalk.dim(`  ID: ${resp.data.id}`));

          // Show dashboard link
          const config = await loadConfig();
          const dashboardUrl = getDashboardUrl(config, `/bugs/${resp.data.id}`);
          console.log(
            chalk.dim(`  Dashboard: ${dashboardUrl}`)
          );
          console.log();
        } catch (err) {
          spinner.fail(chalk.red((err as Error).message));
          process.exit(1);
        }
      }
    );

  return bugs;
}
