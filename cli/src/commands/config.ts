import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, getConfigPath } from "../lib/config.js";

export function createConfigCommand(): Command {
  const config = new Command("config").description("Manage QARA CLI configuration");

  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Config key (e.g., endpoint)")
    .argument("<value>", "Config value")
    .action(async (key: string, value: string) => {
      const cfg = await loadConfig();
      cfg[key] = value;
      await saveConfig(cfg);
      const displayValue =
        key.includes("token") || key.includes("secret")
          ? "****" + String(value).slice(-4)
          : String(value);
      console.log(chalk.green(`✓ Set ${chalk.bold(key)} = ${chalk.bold(displayValue)}`));
      console.log(chalk.dim(`  Config saved to ${getConfigPath()}`));
    });

  config
    .command("get")
    .description("Get a configuration value")
    .argument("<key>", "Config key")
    .action(async (key: string) => {
      const cfg = await loadConfig();
      const value = cfg[key];
      if (value === undefined) {
        console.log(chalk.yellow(`Key "${key}" is not set.`));
      } else {
        console.log(`${chalk.bold(key)} = ${String(value)}`);
      }
    });

  config
    .command("show")
    .description("Show all configuration values")
    .action(async () => {
      const cfg = await loadConfig();
      console.log(chalk.bold("QARA CLI Configuration"));
      console.log(chalk.dim(`  Path: ${getConfigPath()}\n`));

      const keys = Object.keys(cfg);
      if (keys.length === 0) {
        console.log(chalk.yellow("  No configuration set. Run: qara config set <key> <value>"));
        return;
      }

      for (const k of keys) {
        const displayValue =
          k.includes("token") || k.includes("secret")
            ? "****" + String(cfg[k]).slice(-4)
            : String(cfg[k]);
        console.log(`  ${chalk.cyan(k)}: ${displayValue}`);
      }
    });

  return config;
}
