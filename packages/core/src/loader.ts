import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { PluginConfigSchema, type PluginConfig } from "@firefly-swarm/shared";

const CONFIG_FILENAME = "firefly-swarm.json";

/**
 * Get the user's configuration directory following XDG Base Directory specification.
 * Falls back to ~/.config if XDG_CONFIG_HOME is not set.
 * 
 * @returns The absolute path to the user's config directory
 */
function getUserConfigDir(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

/**
 * Load and validate plugin configuration from a specific file path.
 * Returns null if the file doesn't exist, is invalid, or cannot be read.
 * Logs warnings for validation errors and unexpected read errors.
 * 
 * @param configPath - Absolute path to the config file
 * @returns Validated config object, or null if loading failed
 */
function loadConfigFromPath(configPath: string): PluginConfig | null {
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const rawConfig = JSON.parse(content);
    const result = PluginConfigSchema.safeParse(rawConfig);

    if (!result.success) {
      console.warn(`[firefly-swarm] Invalid config at ${configPath}:`);
      console.warn(result.error.format());
      return null;
    }

    return result.data;
  } catch (error) {
    // File doesn't exist or isn't readable - this is expected and fine
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[firefly-swarm] Error reading config from ${configPath}:`, error.message);
    }
    return null;
  }
}

/**
 * Recursively merge two objects, with override values taking precedence.
 * For nested objects, merges recursively. For arrays and primitives, override replaces base.
 * 
 * @param base - Base object to merge into
 * @param override - Override object whose values take precedence
 * @returns Merged object, or undefined if both inputs are undefined
 */
function deepMerge<T extends Record<string, unknown>>(base?: T, override?: T): T | undefined {
  if (!base) return override;
  if (!override) return base;

  const result = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const baseVal = base[key];
    const overrideVal = override[key];

    if (
      typeof baseVal === "object" && baseVal !== null &&
      typeof overrideVal === "object" && overrideVal !== null &&
      !Array.isArray(baseVal) && !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = overrideVal;
    }
  }
  return result;
}

/**
 * Load plugin configuration from user and project config files, merging them appropriately.
 * 
 * Configuration is loaded from two locations:
  * 1. User config: ~/.config/opencode/firefly-swarm.json (or $XDG_CONFIG_HOME)
 * 2. Project config: <directory>/.opencode/firefly-swarm.json
 * 
 * Project config takes precedence over user config. Nested objects (agents, tmux) are
 * deep-merged, while top-level arrays are replaced entirely by project config.
 * 
 * @param directory - Project directory to search for .opencode config
 * @param filename - Optional custom configuration filename (defaults to firefly-swarm.json)
 * @returns Merged plugin configuration (empty object if no configs found)
 */
export function loadPluginConfig(directory: string, filename: string = CONFIG_FILENAME): PluginConfig {
  const userConfigPath = path.join(
    getUserConfigDir(),
    "opencode",
    filename
  );

  const projectConfigPath = path.join(directory, ".opencode", filename);

  let config: PluginConfig = loadConfigFromPath(userConfigPath) ?? {};

  const projectConfig = loadConfigFromPath(projectConfigPath);
  if (projectConfig) {
    config = {
      ...config,
      ...projectConfig,
      agents: deepMerge(config.agents, projectConfig.agents),
      tmux: deepMerge(config.tmux, projectConfig.tmux),
    };
  }

  // Override preset from environment variable if set
  const envPreset = process.env.FIREFLY_SWARM_PRESET;
  if (envPreset) {
    config.preset = envPreset;
  }

  // Resolve preset and merge with root agents
  if (config.preset) {
    const preset = config.presets?.[config.preset];
    if (preset) {
      // Merge preset agents with root agents (root overrides)
      config.agents = deepMerge(preset, config.agents);
    } else {
      // Preset name specified but doesn't exist - warn user
      const presetSource = envPreset === config.preset ? "environment variable" : "config file";
      const availablePresets = config.presets ? Object.keys(config.presets).join(", ") : "none";
      console.warn(`[firefly-swarm] Preset "${config.preset}" not found (from ${presetSource}). Available presets: ${availablePresets}`);
    }
  }

  return config;
}
