#!/usr/bin/env node

import { Command } from "commander";
import { createConfigCommand } from "./commands/config.js";
import { createLoginCommand } from "./commands/auth.js";
import { createBugsCommand } from "./commands/bugs.js";
import { createCaptureCommand } from "./commands/capture.js";
import { createIntegrationsCommand } from "./commands/integrations.js";

const program = new Command();

program
  .name("qara")
  .description("QARA CLI — Bug capture, triage, and integration management")
  .version("0.1.0");

// Register command groups
program.addCommand(createConfigCommand());
program.addCommand(createLoginCommand());
program.addCommand(createBugsCommand());
program.addCommand(createCaptureCommand());
program.addCommand(createIntegrationsCommand());

// Default: show help if no command given
program.action(() => {
  program.help();
});

program.parse();
