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
// Multiplexer Configuration (Tmux / WezTerm)
// =============================================================================

/**
 * Multiplexer provider type.
 */
export const MultiplexerProviderSchema = z.enum(["tmux", "wezterm", "auto"]);

export type MultiplexerProvider = z.infer<typeof MultiplexerProviderSchema>;

/**
 * Multiplexer layout options.
 */
export const MultiplexerLayoutSchema = z.enum([
  "main-horizontal", // Main pane on top, agents stacked below
  "main-vertical",   // Main pane on left, agents stacked on right
  "tiled",           // All panes equal size grid
  "even-horizontal", // All panes side by side
  "even-vertical",   // All panes stacked vertically
]);

export type MultiplexerLayout = z.infer<typeof MultiplexerLayoutSchema>;

// Alias for backward compatibility
export const TmuxLayoutSchema = MultiplexerLayoutSchema;
export type TmuxLayout = MultiplexerLayout;

/**
 * Multiplexer integration configuration.
 */
export const MultiplexerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: MultiplexerProviderSchema.default("auto"),
  layout: MultiplexerLayoutSchema.default("main-vertical"),
  main_pane_size: z.number().min(20).max(80).default(60), // percentage for main pane
});

export type MultiplexerConfig = z.infer<typeof MultiplexerConfigSchema>;

// Alias for backward compatibility
export const TmuxConfigSchema = MultiplexerConfigSchema;
export type TmuxConfig = MultiplexerConfig;

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
  multiplexer: MultiplexerConfigSchema.optional(),
  tmux: TmuxConfigSchema.optional(), // Alias/Fallback
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;
