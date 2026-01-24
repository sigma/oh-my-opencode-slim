/**
 * Network Compiler
 *
 * Validates the loaded network for consistency:
 * - All agent delegates reference existing agents
 * - All agent skills reference existing skills
 * - MCP skills have valid mcp configuration
 *
 * Also generates the delegation and skill graphs.
 */

import {
  type ParsedManifest,
  type ParsedAgent,
  type ParsedSkill,
  type CompiledNetwork,
  type CompilerError,
  type CompileResult,
} from "./schema";

/**
 * Compile and validate a loaded network.
 *
 * Performs the "link phase" to ensure all references are valid.
 * Returns either a compiled network or a list of errors.
 */
export function compileNetwork(
  manifest: ParsedManifest,
  agents: Map<string, ParsedAgent>,
  skills: Map<string, ParsedSkill>
): CompileResult {
  const errors: CompilerError[] = [];

  // Build symbol tables
  const agentIds = new Set(agents.keys());
  const skillIds = new Set(skills.keys());

  // Validate agent references
  for (const [agentId, agent] of agents) {
    // Check delegate references
    for (const delegateId of agent.frontMatter.delegates) {
      if (!agentIds.has(delegateId)) {
        errors.push({
          type: "missing_agent",
          message: `Agent '${agentId}' delegates to '${delegateId}', but '${delegateId}' does not exist.`,
          source: agentId,
          target: delegateId,
        });
      }
    }

    // Check skill references
    for (const skillId of agent.frontMatter.skills) {
      // Skip wildcard
      if (skillId === "*") continue;
      
      if (!skillIds.has(skillId)) {
        errors.push({
          type: "missing_skill",
          message: `Agent '${agentId}' requires skill '${skillId}', but '${skillId}' is not defined.`,
          source: agentId,
          target: skillId,
        });
      }
    }
  }

  // Validate MCP skills have required config
  for (const [skillId, skill] of skills) {
    if (skill.frontMatter.type === "mcp" && !skill.frontMatter.mcp) {
      errors.push({
        type: "schema_error",
        message: `Skill '${skillId}' is type 'mcp' but has no mcp configuration.`,
        source: skillId,
      });
    }
  }

  // If there are errors, return them
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Build the graphs
  const delegationGraph = new Map<string, string[]>();
  const skillGraph = new Map<string, string[]>();

  for (const [agentId, agent] of agents) {
    delegationGraph.set(agentId, [...agent.frontMatter.delegates]);
    
    // Expand "*" to all skills
    const agentSkills = agent.frontMatter.skills.includes("*")
      ? Array.from(skillIds)
      : [...agent.frontMatter.skills];
    skillGraph.set(agentId, agentSkills);
  }

  return {
    success: true,
    network: {
      manifest,
      agents,
      skills,
      delegationGraph,
      skillGraph,
    },
  };
}

/**
 * Detect cycles in the delegation graph.
 * Returns an array of cycles found, where each cycle is a path of agent IDs.
 */
export function detectCycles(delegationGraph: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = delegationGraph.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
      }
    }

    recursionStack.delete(node);
  }

  for (const node of delegationGraph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Generate a Mermaid diagram of the network.
 */
export function generateMermaidDiagram(network: CompiledNetwork): string {
  const lines: string[] = ["graph TD"];

  // Define agent nodes with styling
  for (const [agentId, agent] of network.agents) {
    const label = agent.frontMatter.role || agentId;
    const isPrimary = agent.frontMatter.primary;
    
    if (isPrimary) {
      lines.push(`    ${agentId}[["${label}"]]`);
    } else {
      lines.push(`    ${agentId}["${label}"]`);
    }
  }

  lines.push("");

  // Define skill nodes (rounded)
  for (const [skillId, skill] of network.skills) {
    lines.push(`    skill_${skillId}(("${skillId}"))`);
  }

  lines.push("");

  // Define delegation edges
  for (const [agentId, delegates] of network.delegationGraph) {
    for (const delegateId of delegates) {
      lines.push(`    ${agentId} -->|delegates| ${delegateId}`);
    }
  }

  lines.push("");

  // Define skill edges
  for (const [agentId, skillIds] of network.skillGraph) {
    for (const skillId of skillIds) {
      lines.push(`    ${agentId} -.->|uses| skill_${skillId}`);
    }
  }

  lines.push("");

  // Add styling
  lines.push("    %% Styling");
  lines.push("    classDef primary fill:#f9f,stroke:#333,stroke-width:2px");
  lines.push("    classDef subagent fill:#bbf,stroke:#333");
  lines.push("    classDef skill fill:#bfb,stroke:#393,stroke-dasharray: 5 5");
  
  // Apply classes
  for (const [agentId, agent] of network.agents) {
    if (agent.frontMatter.primary) {
      lines.push(`    class ${agentId} primary`);
    } else {
      lines.push(`    class ${agentId} subagent`);
    }
  }
  
  for (const skillId of network.skills.keys()) {
    lines.push(`    class skill_${skillId} skill`);
  }

  return lines.join("\n");
}

/**
 * Generate a simple text summary of the network.
 */
export function generateNetworkSummary(network: CompiledNetwork): string {
  const lines: string[] = [];

  lines.push(`Network: ${network.manifest.frontMatter.name} v${network.manifest.frontMatter.version}`);
  lines.push(`Agents: ${network.agents.size}`);
  lines.push(`Skills: ${network.skills.size}`);
  lines.push("");

  lines.push("Agents:");
  for (const [agentId, agent] of network.agents) {
    const type = agent.frontMatter.primary ? "★" : "•";
    const variant = agent.frontMatter.variant;
    const delegates = agent.frontMatter.delegates;
    const skills = agent.frontMatter.skills;
    
    lines.push(`  ${type} ${agentId} (${variant})`);
    if (delegates.length > 0) {
      lines.push(`      delegates: ${delegates.join(", ")}`);
    }
    if (skills.length > 0) {
      lines.push(`      skills: ${skills.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("Skills:");
  for (const [skillId, skill] of network.skills) {
    const type = skill.frontMatter.type === "mcp" ? "[MCP]" : "[builtin]";
    lines.push(`  • ${skillId} ${type}`);
  }

  return lines.join("\n");
}
