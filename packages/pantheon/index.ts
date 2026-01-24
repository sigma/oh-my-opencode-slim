/**
 * @firefly-swarm/pantheon
 *
 * Standard agent network for OpenCode Swarm.
 * This package provides a curated set of AI coding agents defined declaratively in Markdown.
 *
 * Usage:
 *   bunx @firefly-swarm/installer install @firefly-swarm/pantheon
 */

import { join } from "path";
import { loadAndCompileNetwork, type CompileResult, type CompiledNetwork } from "@firefly-swarm/network-compiler";
import { createPlugin } from "@firefly-swarm/core";
import type { Plugin } from "@opencode-ai/plugin";

/**
 * Path to the network definition directory.
 */
export const NETWORK_DIR = join(import.meta.dir, "network");

/**
 * Load and compile the pantheon network.
 *
 * @returns CompileResult with the compiled network or errors
 */
export function loadNetwork(): CompileResult {
  return loadAndCompileNetwork(NETWORK_DIR);
}

/**
 * Get the compiled network, throwing on errors.
 *
 * @returns CompiledNetwork
 * @throws Error if compilation fails
 */
export function getNetwork(): CompiledNetwork {
  const result = loadNetwork();
  if (!result.success) {
    const errorMessages = result.errors.map(e => e.message).join("\n");
    throw new Error(`Failed to compile pantheon network:\n${errorMessages}`);
  }
  return result.network;
}

/**
 * Validate the network and return true if valid.
 *
 * @returns true if network compiles successfully
 */
export function isValid(): boolean {
  return loadNetwork().success;
}

// Re-export types for convenience
export type { CompileResult, CompiledNetwork } from "@firefly-swarm/network-compiler";

// Load network for plugin conversion
const network = getNetwork();

// Map network agents to OpenCode SDK agent configurations
// We map them to the format expected by the OpenCode SDK (flat config)
const agents: Record<string, any> = {};

for (const [name, agent] of network.agents) {
  agents[name] = {
    description: agent.frontMatter.description,
    model: agent.frontMatter.defaultModel,
    temperature: agent.frontMatter.defaultTemperature,
    prompt: agent.content,
    mode: agent.frontMatter.primary ? "primary" : "subagent",
  };
}

/**
 * Create the base plugin with custom agents
 */
const basePlugin = createPlugin(agents, "firefly-swarm-pantheon.json", "@firefly-swarm/pantheon");

/**
 * Pantheon Plugin
 * 
 * Functional plugin that provides the curated Pantheon agent network.
 */
const pantheonPlugin: Plugin = async (ctx) => {
  const instance = await basePlugin(ctx);
  const originalConfig = instance.config;

  // Override the config hook to inject skills based on the network definition
  instance.config = async (opencodeConfig: Record<string, any>) => {
    // Run base config hook first (merges agents, sets defaults)
    if (originalConfig) {
      await originalConfig(opencodeConfig);
    }

    // Inject skills into the agents in the config
    // We check both 'agent' and 'agents' for compatibility
    const configAgents = (opencodeConfig.agent || opencodeConfig.agents) as Record<string, any> | undefined;
    if (configAgents) {
      for (const [name, agent] of network.agents) {
        if (configAgents[name]) {
          configAgents[name].skills = agent.frontMatter.skills;
        }
      }
    }
  };

  return instance;
};

// Export as default
export default pantheonPlugin;

// CLI validation when run directly
if (import.meta.main) {
  const result = loadNetwork();
  if (result.success) {
    console.log("✓ Pantheon network is valid");
    console.log(`  Agents: ${result.network.agents.size}`);
    console.log(`  Skills: ${result.network.skills.size}`);
    process.exit(0);
  } else {
    console.error("✗ Pantheon network has errors:");
    for (const error of result.errors) {
      console.error(`  - ${error.message}`);
    }
    process.exit(1);
  }
}
