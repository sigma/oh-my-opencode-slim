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
 * Order: subagents alphabetically.
 */
export const ALL_AGENT_NAMES = [
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
 * Type guard to check if a string is a valid agent name.
 */
export function isAgentName(name: string): name is AgentName {
  return (ALL_AGENT_NAMES as readonly string[]).includes(name);
}
