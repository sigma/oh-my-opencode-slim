/**
 * Template processing utilities for agent prompts.
 *
 * Provides simple {{VARIABLE}} replacement and dynamic generation
 * of orchestrator sections from the agent registry.
 */

import { type AgentMetadata, getSubagentMetadata } from "./registry";

/**
 * Render a template string by replacing {{KEY}} placeholders with values.
 *
 * @param template - Template string with {{KEY}} placeholders
 * @param variables - Key-value pairs for replacement
 * @returns Rendered template with all placeholders replaced
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template
  );
}

/**
 * Format a single agent's metadata for the orchestrator's <Agents> section.
 */
function formatAgentForOrchestrator(agent: AgentMetadata): string {
  const lines: string[] = [
    `@${agent.name}`,
    `- Role: ${agent.role}`,
    `- Capabilities: ${agent.capabilities.join("; ")}`,
    `- Tools/Constraints: ${agent.constraints.join("; ")}`,
    `- Triggers: ${agent.triggers.map((t) => `"${t}"`).join(", ")}`,
    `- Delegate to @${agent.name} when you need things such as:`,
    ...agent.delegationHints.map((hint) => `  * ${hint}`),
  ];
  return lines.join("\n");
}

/**
 * Generate the <Agents> section content for the orchestrator prompt.
 *
 * Dynamically builds the agent descriptions from the registry,
 * ensuring the orchestrator always has up-to-date information
 * about available subagents.
 *
 * @returns Formatted string with all subagent descriptions
 */
export function generateAgentsSection(): string {
  const subagents = getSubagentMetadata();
  return subagents.map(formatAgentForOrchestrator).join("\n\n");
}

/**
 * Special handling for oracle's "About" line in orchestrator prompt.
 * This adds context about why the orchestrator should consult oracle.
 */
export function generateOracleAboutLine(): string {
  return "- About: Orchestrator should not make high-risk architecture calls alone; oracle validates direction";
}

/**
 * Generate the complete <Agents> section with oracle's special "About" line.
 */
export function generateAgentsSectionWithOracleNote(): string {
  const subagents = getSubagentMetadata();
  return subagents
    .map((agent) => {
      const base = formatAgentForOrchestrator(agent);
      if (agent.name === "oracle") {
        // Insert the "About" line after @oracle
        const lines = base.split("\n");
        lines.splice(1, 0, generateOracleAboutLine());
        return lines.join("\n");
      }
      return base;
    })
    .join("\n\n");
}
