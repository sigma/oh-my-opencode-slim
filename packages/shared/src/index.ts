/**
 * @firefly-swarm/shared
 *
 * Shared types, utilities, and constants for OpenCode Swarm.
 * This package has zero internal dependencies on the rest of the codebase.
 */

// Agent types (single source of truth for agent names)
export {
  ALL_AGENT_NAMES,
  ORCHESTRATOR_NAME,
  SUBAGENT_NAMES,
  isAgentName,
  isSubagentName,
  type AgentName,
} from "./agents";

// Constants
export {
  POLL_INTERVAL_MS,
  POLL_INTERVAL_SLOW_MS,
  POLL_INTERVAL_BACKGROUND_MS,
  DEFAULT_TIMEOUT_MS,
  MAX_POLL_TIME_MS,
  STABLE_POLLS_THRESHOLD,
} from "./constants";

// Utilities
export { log } from "./utils/logger";
export {
  pollUntilStable,
  delay,
  type PollOptions,
  type PollResult,
} from "./utils/polling";

// Schemas
export {
  AgentOverrideConfigSchema,
  TmuxLayoutSchema,
  TmuxConfigSchema,
  McpNameSchema,
  PresetSchema,
  PluginConfigSchema,
  type AgentOverrideConfig,
  type TmuxLayout,
  type TmuxConfig,
  type McpName,
  type Preset,
  type PluginConfig,
} from "./schemas/config";
