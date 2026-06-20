import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { loadConfig, saveConfig, getEndpoint } from "../lib/config.js";

export function createLoginCommand(): Command {
  return new Command("login")
    .description("Authenticate with QARA (email + password → JWT)")
    .option("-e, --email <email>", "Email address")
    .option("-p, --password <password>", "Password")
    .action(async (opts: { email?: string; password?: string }) => {
      const config = await loadConfig();
      const endpoint = getEndpoint(config);

      let { email, password } = opts;

      if (!email || !password) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "email",
            message: "Email:",
            when: () => !email,
            validate: (v: string) => (v.includes("@") ? true : "Enter a valid email"),
          },
          {
            type: "password",
            name: "password",
            message: "Password:",
            mask: "*",
            when: () => !password,
            validate: (v: string) => (v.length >= 1 ? true : "Password required"),
          },
        ]);
        email = email || answers.email;
        password = password || answers.password;
      }

      const spinner = ora("Authenticating...").start();

      try {
        const resp = await fetch(`${endpoint}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!resp.ok) {
          const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
          const errObj = body.error as Record<string, unknown> | undefined;
          spinner.fail(
            chalk.red(
              (errObj?.message as string) || `Authentication failed (HTTP ${resp.status})`
            )
          );
          process.exit(1);
        }

        const data = (await resp.json()) as {
          access_token: string;
          refresh_token: string;
          user?: { name?: string; email?: string };
        };

        config.access_token = data.access_token;
        config.refresh_token = data.refresh_token;
        await saveConfig(config);

        spinner.succeed(
          chalk.green("Authenticated successfully!") +
            (data.user?.name ? chalk.dim(` (${data.user.name})`) : "")
        );
        console.log(chalk.dim(`  Tokens saved to ~/.qara/config.json`));
      } catch (err) {
        spinner.fail(chalk.red(`Connection error: ${(err as Error).message}`));
        console.error(
          chalk.dim(`  Is the API running at ${endpoint}?`)
        );
        process.exit(1);
      }
    });
}
