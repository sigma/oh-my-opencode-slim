/**
 * Static Agent Type Definitions
 *
 * This is the single source of truth for agent names.
 * These are defined statically to break the circular dependency between
 * config/constants.ts and agents/registry.ts.
 *
 * When adding a new agent:
 * 1. Add the name to ALL_AGENT_NAMES tuple
 * 2. Create the role file in src/agents/roles/
 * 3. Import it in src/agents/registry.ts
 */

/**
 * All agent names as a readonly tuple.
 * Order: orchestrator first (primary), then subagents alphabetically.
 */
export const ALL_AGENT_NAMES = [
  "orchestrator",
  "analyst",
  "archivist",
  "designer",
  "explorer",
  "fixer",
  "librarian",
  "oracle",
  "prober",
  "scribe",
] as const;

/**
 * Agent name type - union of all valid agent names.
 */
export type AgentName = (typeof ALL_AGENT_NAMES)[number];

/**
 * Orchestrator agent name constant.
 */
export const ORCHESTRATOR_NAME = "orchestrator" as const;

/**
 * Subagent names (all agents except orchestrator).
 */
export const SUBAGENT_NAMES = ALL_AGENT_NAMES.filter(
  (name): name is Exclude<AgentName, "orchestrator"> => name !== ORCHESTRATOR_NAME
);

/**
 * Type guard to check if a string is a valid agent name.
 */
export function isAgentName(name: string): name is AgentName {
  return (ALL_AGENT_NAMES as readonly string[]).includes(name);
}

/**
 * Type guard to check if a string is a subagent name.
 */
export function isSubagentName(name: string): name is Exclude<AgentName, "orchestrator"> {
  return isAgentName(name) && name !== ORCHESTRATOR_NAME;
}
