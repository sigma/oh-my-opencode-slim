/**
 * Configuration Schemas
 *
 * Zod schemas for plugin configuration validation.
 */

import { z } from "zod";

// =============================================================================
// Agent Override Configuration
// =============================================================================

/**
 * Agent override configuration (distinct from SDK's AgentConfig).
 * Used to customize agent behavior in plugin config.
 */
export const AgentOverrideConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  variant: z.string().optional().catch(undefined),
  skills: z.array(z.string()).optional(), // skills this agent can use ("*" = all)
});

export type AgentOverrideConfig = z.infer<typeof AgentOverrideConfigSchema>;

// =============================================================================
// Tmux Configuration
// =============================================================================

/**
 * Tmux layout options.
 */
export const TmuxLayoutSchema = z.enum([
  "main-horizontal", // Main pane on top, agents stacked below
  "main-vertical",   // Main pane on left, agents stacked on right
  "tiled",           // All panes equal size grid
  "even-horizontal", // All panes side by side
  "even-vertical",   // All panes stacked vertically
]);

export type TmuxLayout = z.infer<typeof TmuxLayoutSchema>;

/**
 * Tmux integration configuration.
 */
export const TmuxConfigSchema = z.object({
  enabled: z.boolean().default(false),
  layout: TmuxLayoutSchema.default("main-vertical"),
  main_pane_size: z.number().min(20).max(80).default(60), // percentage for main pane
});

export type TmuxConfig = z.infer<typeof TmuxConfigSchema>;

// =============================================================================
// MCP Configuration
// =============================================================================

/**
 * MCP integration names.
 */
export const McpNameSchema = z.enum(["websearch", "context7", "grep_app"]);

export type McpName = z.infer<typeof McpNameSchema>;

// =============================================================================
// Preset Configuration
// =============================================================================

/**
 * A preset is a record of agent names to their override configurations.
 */
export const PresetSchema = z.record(z.string(), AgentOverrideConfigSchema);

export type Preset = z.infer<typeof PresetSchema>;

// =============================================================================
// Main Plugin Configuration
// =============================================================================

/**
 * Main plugin configuration schema.
 */
export const PluginConfigSchema = z.object({
  preset: z.string().optional(),
  presets: z.record(z.string(), PresetSchema).optional(),
  agents: z.record(z.string(), AgentOverrideConfigSchema).optional(),
  disabled_mcps: z.array(z.string()).optional(),
  tmux: TmuxConfigSchema.optional(),
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;
