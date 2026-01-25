import type { AgentConfig as SDKAgentConfig } from "@opencode-ai/sdk";
import { type PluginConfig, type AgentOverrideConfig } from "@firefly-swarm/shared";
import {
  createAgent,
  type AgentDefinition,
  AGENT_REGISTRY,
  ALL_AGENT_NAMES,
  SUBAGENT_NAMES,
  DEFAULT_MODELS,
} from "./registry";

export type { AgentDefinition } from "./registry";
export { DEFAULT_MODELS };

// Re-export registry items for consumers
export {
  AGENT_REGISTRY,
  ALL_AGENT_NAMES,
  SUBAGENT_NAMES,
  createAgent,
  getAgentMetadata,
  getAgentPrompt,
  getSubagentMetadata,
  loadRole,
  type AgentMetadata,
  type LoadedRole,
  type ParsedRole,
} from "./registry";

export { type AgentFrontMatter } from "./frontmatter";

// Backward Compatibility

/** Map old agent names to new names for backward compatibility */
const AGENT_ALIASES: Record<string, string> = {
  explore: "explorer",
  "frontend-ui-ux-engineer": "designer",
};

/**
 * Get agent override config by name, supporting backward-compatible aliases.
 * Checks both the current name and any legacy alias names.
 */
function getOverride(
  overrides: Record<string, AgentOverrideConfig>,
  name: string
): AgentOverrideConfig | undefined {
  return overrides[name] ?? overrides[Object.keys(AGENT_ALIASES).find((k) => AGENT_ALIASES[k] === name) ?? ""];
}

// Agent Configuration Helpers

/**
 * Apply user-provided overrides to an agent's configuration.
 * Supports overriding model and temperature.
 */
function applyOverrides(agent: AgentDefinition, override: AgentOverrideConfig): void {
  if (override.model) agent.config.model = override.model;
  if (override.temperature !== undefined) agent.config.temperature = override.temperature;
}

/**
 * Apply default permissions to an agent.
 * Currently sets 'question' permission to 'allow' for all agents.
 */
function applyDefaultPermissions(agent: AgentDefinition): void {
  const existing = (agent.config.permission ?? {}) as Record<string, "ask" | "allow" | "deny">;
  agent.config.permission = { ...existing, question: "allow" } as SDKAgentConfig["permission"];
}

// Agent Classification

export type SubagentName = (typeof SUBAGENT_NAMES)[number];

export function isSubagent(name: string): name is SubagentName {
  return (SUBAGENT_NAMES as readonly string[]).includes(name);
}

// Public API

/**
 * Create all agent definitions with optional configuration overrides.
 * Instantiates the orchestrator and all subagents, applying user config and defaults.
 *
 * @param config - Optional plugin configuration with agent overrides
 * @returns Array of agent definitions (orchestrator first, then subagents)
 */
export function createAgents(config?: PluginConfig): AgentDefinition[] {
  const agentOverrides = config?.agents ?? {};

  // TEMP: If fixer has no config, inherit from librarian's model to avoid breaking
  // existing users who don't have fixer in their config yet
  const getModelForAgent = (name: string): string => {
    if (name === "fixer" && !getOverride(agentOverrides, "fixer")?.model) {
      return getOverride(agentOverrides, "librarian")?.model ?? DEFAULT_MODELS["librarian"];
    }
    return AGENT_REGISTRY[name]?.defaultModel ?? DEFAULT_MODELS[name as keyof typeof DEFAULT_MODELS];
  };

  // Create all agents using the generic factory
  const agents = ALL_AGENT_NAMES.map((name) => {
    const agent = createAgent(name, getModelForAgent(name));

    // Apply user overrides
    const override = getOverride(agentOverrides, name);
    if (override) {
      applyOverrides(agent, override);
    }

    // Apply default permissions to primary agents
    if (agent.config.mode === "primary") {
      applyDefaultPermissions(agent);
    }

    return agent;
  });

  return agents;
}

/**
 * Get agent configurations formatted for the OpenCode SDK.
 * Converts agent definitions to SDK config format and applies classification metadata.
 *
 * @param config - Optional plugin configuration with agent overrides
 * @returns Record mapping agent names to their SDK configurations
 */
export function getAgentConfigs(config?: PluginConfig): Record<string, SDKAgentConfig> {
  const agents = createAgents(config);
  return Object.fromEntries(
    agents.map((a) => {
      const sdkConfig: SDKAgentConfig = { ...a.config, description: a.description };

      return [a.name, sdkConfig];
    })
  );
}
