/**
 * Bridge between network compiler and agent definitions.
 * Creates agent definitions from a compiled network.
 */

import type { AgentConfig } from "@opencode-ai/sdk";
import { loadNetwork } from "./loader";
import { compileNetwork } from "./compiler";
import type { CompiledNetwork, CompileResult, ParsedAgent } from "./schema";

export interface NetworkAgentDefinition {
  name: string;
  description?: string;
  config: AgentConfig;
}

/**
 * Create agent definitions from a compiled network.
 * 
 * @param networkDir - Path to the network directory
 * @param providerName - Which provider preset to use (e.g., "antigravity")
 * @returns Array of agent definitions or null if compilation fails
 */
/**
 * Helper to load and compile a network inline (avoids circular import with index.ts)
 */
function loadAndCompile(networkDir: string): CompileResult {
  const { manifest, agents, skills } = loadNetwork(networkDir);
  return compileNetwork(manifest, agents, skills);
}

export function createAgentsFromNetwork(
  networkDir: string,
  providerName: string
): NetworkAgentDefinition[] | null {
  const result = loadAndCompile(networkDir);
  if (!result.success) {
    return null;
  }

  const { network } = result;
  const providerPreset = network.manifest.frontMatter.providers[providerName];
  if (!providerPreset) {
    return null;
  }

  const definitions: NetworkAgentDefinition[] = [];

  for (const [_, agent] of network.agents) {
    const fm = agent.frontMatter;
    let prompt = agent.content;

    // Handle {{DELEGATES_BLURB}} template if present
    if (prompt.includes("{{DELEGATES_BLURB}}")) {
      const delegatesBlurb = generateDelegatesBlurb(network, agent);
      prompt = prompt.replaceAll("{{DELEGATES_BLURB}}", delegatesBlurb);
    }

    const config: AgentConfig = {
      model: providerPreset[fm.variant || "low"],
      temperature: fm.defaultTemperature,
      prompt: prompt,
    };

    // Apply default permissions to primary agents
    if (fm.primary) {
      // Use any cast to avoid complex type mapping for permissions if not fully defined
      (config as any).permission = { question: "allow" };
      // Also set mode for OpenCode SDK if needed, though NetworkAgentDefinition doesn't explicitly require it
      (config as any).mode = "primary";
    } else {
      (config as any).mode = "subagent";
    }

    definitions.push({
      name: fm.name,
      description: fm.description,
      config,
    });
  }

  return definitions;
}

/**
 * Generate the {{DELEGATES_BLURB}} template content for a specific agent.
 */
export function generateDelegatesBlurb(network: CompiledNetwork, agent: ParsedAgent): string {
  const agentIds = agent.frontMatter.delegates;

  return agentIds
    .map((id) => network.agents.get(id))
    .filter((a): a is ParsedAgent => !!a)
    .map((agent) => {
      const fm = agent.frontMatter;
      const lines: string[] = [
        `@${fm.name}`,
        `- Role: ${fm.role}`,
        `- Capabilities: ${fm.capabilities.join("; ")}`,
        `- Tools/Constraints: ${fm.constraints.join("; ")}`,
        `- Triggers: ${fm.triggers.map((t) => `"${t}"`).join(", ")}`,
      ];

      if (fm.delegationNote) {
        // Insert delegation note as the second line if present
        lines.splice(1, 0, `- About: ${fm.delegationNote}`);
      }

      lines.push(`- Delegate to @${fm.name} when you need things such as:`);
      lines.push(...fm.delegationHints.map((hint) => `  * ${hint}`));

      return lines.join("\n");
    })
    .join("\n\n");
}
