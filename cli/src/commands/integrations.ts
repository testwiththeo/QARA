import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { apiPost, apiGet, apiDelete } from "../lib/api-client.js";

interface IntegrationItem {
  id: string;
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export function createIntegrationsCommand(): Command {
  const integrations = new Command("integrations").description(
    "Manage Jira and Slack integrations"
  );

  // ── integrations add jira ──────────────────────────────────────

  const add = new Command("add").description("Add an integration");

  add
    .command("jira")
    .description("Add a Jira integration")
    .requiredOption("--url <url>", "Jira instance URL (e.g., https://company.atlassian.net)")
    .requiredOption("--email <email>", "Jira account email")
    .requiredOption("--api-token <token>", "Jira API token")
    .requiredOption("--project-key <key>", "Jira project key (e.g., QA)")
    .action(
      async (opts: {
        url: string;
        email: string;
        apiToken: string;
        projectKey: string;
      }) => {
        const spinner = ora("Adding Jira integration...").start();

        try {
          await apiPost("/integrations", {
            provider: "jira",
            config: {
              url: opts.url,
              email: opts.email,
              api_token: opts.apiToken,
              project_key: opts.projectKey,
            },
          });

          spinner.succeed(chalk.green("Jira integration added successfully!"));
          console.log(
            chalk.dim(`  Instance: ${opts.url} | Project: ${opts.projectKey}`)
          );
          console.log();
        } catch (err) {
          spinner.fail(chalk.red((err as Error).message));
          process.exit(1);
        }
      }
    );

  add
    .command("slack")
    .description("Add a Slack integration")
    .requiredOption("--bot-token <token>", "Slack bot token (xoxb-...)")
    .requiredOption("--channel <channel>", "Slack channel (e.g., #qa-alerts)")
    .action(async (opts: { botToken: string; channel: string }) => {
      const spinner = ora("Adding Slack integration...").start();

      try {
        await apiPost("/integrations", {
          provider: "slack",
          config: {
            bot_token: opts.botToken,
            channel: opts.channel,
          },
        });

        spinner.succeed(chalk.green("Slack integration added successfully!"));
        console.log(chalk.dim(`  Channel: ${opts.channel}`));
        console.log();
      } catch (err) {
        spinner.fail(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  integrations.addCommand(add);

  // ── integrations list ──────────────────────────────────────────

  integrations
    .command("list")
    .description("List all configured integrations")
    .action(async () => {
      const spinner = ora("Fetching integrations...").start();

      try {
        const resp = await apiGet<{ items: IntegrationItem[] }>("/integrations");
        spinner.stop();

        const items = resp.data.items;
        if (!items || items.length === 0) {
          console.log(chalk.yellow("\n  No integrations configured.\n"));
          console.log(
            chalk.dim("  Add one with: qara integrations add jira --url ... --email ... --api-token ... --project-key ...")
          );
          console.log(
            chalk.dim("  Or:           qara integrations add slack --bot-token ... --channel ...\n")
          );
          return;
        }

        console.log();
        console.log(
          "  " +
            [
              chalk.bold(pad("Provider", 12)),
              chalk.bold(pad("Enabled", 10)),
              chalk.bold(pad("ID", 38)),
              chalk.bold("Created"),
            ].join(" ")
        );
        console.log(
          "  " +
            [
              "─".repeat(12),
              "─".repeat(10),
              "─".repeat(38),
              "─".repeat(20),
            ].join(" ")
        );

        for (const item of items) {
          const provider =
            item.provider === "jira"
              ? chalk.blue(item.provider)
              : chalk.magenta(item.provider);
          const enabled = item.enabled
            ? chalk.green("yes")
            : chalk.red("no");
          const created = chalk.dim(
            new Date(item.created_at).toLocaleString()
          );

          console.log(
            "  " +
              [
                pad(provider, 12),
                pad(enabled, 10),
                pad(chalk.dim(item.id), 38),
                created,
              ].join(" ")
          );
        }
        console.log();
      } catch (err) {
        spinner.fail(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  // ── integrations remove ────────────────────────────────────────

  integrations
    .command("remove")
    .description("Remove an integration by ID")
    .argument("<id>", "Integration ID")
    .action(async (id: string) => {
      const spinner = ora("Removing integration...").start();
      try {
        await apiDelete(`/integrations/${id}`);
        spinner.succeed(chalk.green("Integration removed."));
      } catch (err) {
        spinner.fail(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  return integrations;
}

// ── helpers ────────────────────────────────────────────────────────

function pad(str: string, len: number): string {
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, "");
  const diff = len - stripped.length;
  return diff > 0 ? str + " ".repeat(diff) : str;
}
