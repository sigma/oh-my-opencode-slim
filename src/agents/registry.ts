/**
 * Agent Registry - Loads agent metadata from role files.
 *
 * Each agent is defined in a single markdown file with YAML front matter
 * containing all metadata. This provides a single source of truth for
 * each agent's configuration, description, and prompt.
 */

import type { AgentConfig } from "@opencode-ai/sdk";
import { parseRoleFile, type AgentFrontMatter, type ParsedRole } from "./frontmatter";
import { renderTemplate, generateAgentsSectionWithOracleNote } from "./template";

// Import role files as text
import orchestratorRole from "./roles/orchestrator.md" with { type: "text" };
import explorerRole from "./roles/explorer.md" with { type: "text" };
import librarianRole from "./roles/librarian.md" with { type: "text" };
import oracleRole from "./roles/oracle.md" with { type: "text" };
import designerRole from "./roles/designer.md" with { type: "text" };
import fixerRole from "./roles/fixer.md" with { type: "text" };

/** Re-export types for convenience */
export type { AgentFrontMatter as AgentMetadata, ParsedRole };

/** Agent definition structure */
export interface AgentDefinition {
  name: string;
  description?: string;
  config: AgentConfig;
}

/** Parsed role data including metadata and prompt content */
export interface LoadedRole extends ParsedRole {
  /** The raw file content (for reference) */
  raw: string;
}

/** Map of role file imports by agent name */
const ROLE_FILES: Record<string, string> = {
  orchestrator: orchestratorRole,
  explorer: explorerRole,
  librarian: librarianRole,
  oracle: oracleRole,
  designer: designerRole,
  fixer: fixerRole,
};

/** Cache of parsed roles */
const parsedRoles: Map<string, LoadedRole> = new Map();

/**
 * Load and parse a role file, with caching.
 *
 * @param name - Agent name
 * @returns Parsed role data
 * @throws Error if agent not found or file malformed
 */
export function loadRole(name: string): LoadedRole {
  // Check cache first
  const cached = parsedRoles.get(name);
  if (cached) return cached;

  const raw = ROLE_FILES[name];
  if (!raw) {
    throw new Error(`Unknown agent: ${name}. Available: ${Object.keys(ROLE_FILES).join(", ")}`);
  }

  const parsed = parseRoleFile(raw);
  const loaded: LoadedRole = { ...parsed, raw };

  parsedRoles.set(name, loaded);
  return loaded;
}

/**
 * Get agent metadata (front matter) by name.
 *
 * @param name - Agent name
 * @returns Agent metadata
 */
export function getAgentMetadata(name: string): AgentFrontMatter {
  return loadRole(name).frontMatter;
}

/**
 * Get agent prompt content by name.
 *
 * @param name - Agent name
 * @returns Prompt content (without front matter)
 */
export function getAgentPrompt(name: string): string {
  return loadRole(name).content;
}

/** List of all registered agent names */
export const ALL_AGENT_NAMES = Object.keys(ROLE_FILES) as readonly string[];

/** List of subagent names (excludes orchestrator) */
export const SUBAGENT_NAMES = ALL_AGENT_NAMES.filter(
  (name) => name !== "orchestrator"
) as readonly string[];

/**
 * Get all subagent metadata (excludes orchestrator).
 *
 * @returns Array of subagent metadata
 */
export function getSubagentMetadata(): AgentFrontMatter[] {
  return SUBAGENT_NAMES.map((name) => getAgentMetadata(name));
}

/**
 * Create an agent definition from a role file.
 *
 * This is the generic factory function that creates an AgentDefinition
 * from the role file's front matter and content. For most agents, this
 * is all that's needed. The orchestrator has special handling for
 * template variables.
 *
 * @param name - Agent name
 * @param model - Model identifier to use (overrides default from role file)
 * @returns Agent definition ready for use
 */
export function createAgent(name: string, model: string): AgentDefinition {
  const metadata = getAgentMetadata(name);
  let prompt = getAgentPrompt(name);

  // Special handling for orchestrator: render {{AGENTS}} template
  if (name === "orchestrator") {
    prompt = renderTemplate(prompt, {
      AGENTS: generateAgentsSectionWithOracleNote(),
    });
  }

  return {
    name: metadata.name,
    description: metadata.description,
    config: {
      model,
      temperature: metadata.defaultTemperature,
      prompt,
    },
  };
}

/**
 * Build the AGENT_REGISTRY object for backward compatibility.
 * This lazily loads all agents and returns a record.
 */
export const AGENT_REGISTRY: Record<string, AgentFrontMatter> = new Proxy(
  {} as Record<string, AgentFrontMatter>,
  {
    get(_, name: string) {
      if (name in ROLE_FILES) {
        return getAgentMetadata(name);
      }
      return undefined;
    },
    ownKeys() {
      return ALL_AGENT_NAMES as string[];
    },
    getOwnPropertyDescriptor(_, name: string) {
      if (name in ROLE_FILES) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  }
);
