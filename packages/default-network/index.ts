/**
 * @firefly-swarm/default-network
 *
 * Standard agent network for OpenCode Swarm.
 * This package provides a curated set of AI coding agents defined declaratively in Markdown.
 *
 * Usage:
 *   bunx @firefly-swarm/installer install @firefly-swarm/default-network
 */

import { join } from "path";
import { validateNetworkCLI, loadAndCompileNetwork } from "@firefly-swarm/network-compiler";
import { createNetworkPlugin } from "@firefly-swarm/core";
import type { Plugin } from "@opencode-ai/plugin";

/**
 * Path to the network definition directory.
 */
const NETWORK_DIR = join(import.meta.dir, "network");

// Re-export types for convenience
export type { CompileResult, CompiledNetwork } from "@firefly-swarm/network-compiler";

/**
 * Loads and compiles the default network.
 */
export function getNetwork() {
  const result = loadAndCompileNetwork(NETWORK_DIR);
  if (!result.success) {
    throw new Error(`Failed to compile default network: ${JSON.stringify(result.errors)}`);
  }
  return result.network;
}

/**
 * Default Network Plugin
 * 
 * Functional plugin that provides the curated default agent network.
 */
const defaultNetworkPlugin: Plugin = createNetworkPlugin(
  NETWORK_DIR,
  "@firefly-swarm/default-network",
  "firefly-swarm-default-network.json"
);

// Export as default
export default defaultNetworkPlugin;

// CLI validation when run directly
if (import.meta.main) {
  validateNetworkCLI(NETWORK_DIR);
}
