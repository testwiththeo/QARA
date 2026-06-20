import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { apiPost, apiGet } from "../lib/api-client.js";
import { loadConfig, getDashboardUrl } from "../lib/config.js";
import { buildBugFormData } from "../lib/bug-form.js";

interface Project {
  id: string;
  name: string;
}

export function createCaptureCommand(): Command {
  return new Command("capture")
    .description("Interactive bug capture: prompt for fields, submit to QARA")
    .action(async () => {
      // 1. Fetch projects for selection
      const spinner = ora("Loading projects...").start();
      let projects: Project[];
      try {
        const resp = await apiGet<{ items: Project[] }>("/projects");
        projects = resp.data.items;
        spinner.stop();
      } catch (err) {
        spinner.fail(chalk.red(`Failed to load projects: ${(err as Error).message}`));
        process.exit(1);
      }

      if (projects.length === 0) {
        console.error(
          chalk.red("No projects found. Create a project first via the dashboard or API.")
        );
        process.exit(1);
      }

      // 2. Interactive prompts
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "project_id",
          message: "Project:",
          choices: projects.map((p) => ({ name: p.name, value: p.id })),
        },
        {
          type: "input",
          name: "title",
          message: "Bug title:",
          validate: (v: string) => (v.trim().length > 0 ? true : "Title is required"),
        },
        {
          type: "editor",
          name: "description",
          message: "Description (optional, opens editor):",
          default: "",
        },
        {
          type: "list",
          name: "severity",
          message: "Severity:",
          choices: [
            { name: "P0 - Critical", value: "P0" },
            { name: "P1 - High", value: "P1" },
            { name: "P2 - Medium", value: "P2" },
            { name: "P3 - Low", value: "P3" },
            { name: "Let AI decide", value: "" },
          ],
        },
        {
          type: "input",
          name: "steps",
          message: "Steps to reproduce (optional):",
        },
        {
          type: "input",
          name: "expected",
          message: "Expected behavior (optional):",
        },
        {
          type: "input",
          name: "actual",
          message: "Actual behavior (optional):",
        },
        {
          type: "input",
          name: "files",
          message: "Attach files (comma-separated paths, optional):",
        },
      ]);

      // 3. Build form data and submit
      const submitSpinner = ora("Submitting bug report...").start();

      try {
        // Build list of valid file paths
        let filePaths: string[] = [];
        if (answers.files && answers.files.trim()) {
          const candidates = answers.files
            .split(",")
            .map((f: string) => f.trim())
            .filter(Boolean);
          for (const fp of candidates) {
            try {
              await readFile(fp); // verify file exists
              filePaths.push(fp);
            } catch {
              submitSpinner.warn(chalk.yellow(`Skipped file not found: ${fp}`));
            }
          }
        }

        const form = await buildBugFormData({
          title: answers.title,
          project_id: answers.project_id,
          severity: answers.severity,
          description: answers.description,
          steps: answers.steps,
          expected: answers.expected,
          actual: answers.actual,
          files: filePaths.length > 0 ? filePaths : undefined,
        });

        const resp = await apiPost<{ id: string; title: string }>(
          "/bugs",
          form
        );

        submitSpinner.succeed(
          chalk.green(`Bug captured: ${chalk.bold(resp.data.title)}`)
        );
        console.log(chalk.dim(`  ID: ${resp.data.id}`));

        const config = await loadConfig();
        const dashboardUrl = getDashboardUrl(config, `/bugs/${resp.data.id}`);
        console.log(
          chalk.dim(`  Dashboard: ${dashboardUrl}`)
        );
        console.log();
      } catch (err) {
        submitSpinner.fail(chalk.red(`Submission failed: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
