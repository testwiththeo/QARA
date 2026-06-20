import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const QARA_DIR = join(homedir(), ".qara");
const CONFIG_PATH = join(QARA_DIR, "config.json");

export interface QaraConfig {
  endpoint?: string;
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

async function ensureConfigDir(): Promise<void> {
  if (!existsSync(QARA_DIR)) {
    await mkdir(QARA_DIR, { recursive: true, mode: 0o700 });
  }
  // Ensure config file has restrictive permissions if it already exists
  if (existsSync(CONFIG_PATH)) {
    await chmod(CONFIG_PATH, 0o600).catch(() => {});
  }
}

export async function loadConfig(): Promise<QaraConfig> {
  await ensureConfigDir();
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as QaraConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(config: QaraConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function getEndpoint(config: QaraConfig): string {
  return (config.endpoint as string) || "http://localhost:8000/api/v1";
}

/** Derive the dashboard base URL from the API endpoint config. */
export function getDashboardUrl(config: QaraConfig, path: string): string {
  const endpoint = getEndpoint(config);
  const baseUrl = endpoint.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${path}`;
}
