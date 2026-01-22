import { AGENT_REGISTRY, SUBAGENT_NAMES as REGISTRY_SUBAGENT_NAMES } from "../agents/registry";

// Re-export agent names from registry (single source of truth)
export const SUBAGENT_NAMES = REGISTRY_SUBAGENT_NAMES;

export const ORCHESTRATOR_NAME = "orchestrator" as const;

export const ALL_AGENT_NAMES = [ORCHESTRATOR_NAME, ...SUBAGENT_NAMES] as const;

// Agent name type
export type AgentName = (typeof ALL_AGENT_NAMES)[number];

// Default models derived from registry (for backward compatibility)
export const DEFAULT_MODELS: Record<AgentName, string> = Object.fromEntries(
  ALL_AGENT_NAMES.map((name) => [name, AGENT_REGISTRY[name].defaultModel])
) as Record<AgentName, string>;

// Polling configuration
export const POLL_INTERVAL_MS = 500;
export const POLL_INTERVAL_SLOW_MS = 1000;
export const POLL_INTERVAL_BACKGROUND_MS = 2000;

// Timeouts
export const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
export const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes

// Polling stability
export const STABLE_POLLS_THRESHOLD = 3;
