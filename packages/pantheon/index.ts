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
