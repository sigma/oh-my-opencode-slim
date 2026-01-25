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
import { validateNetworkCLI } from "@firefly-swarm/network-compiler";
import { createNetworkPlugin } from "@firefly-swarm/core";
import type { Plugin } from "@opencode-ai/plugin";

/**
 * Path to the network definition directory.
 */
export const NETWORK_DIR = join(import.meta.dir, "network");

// Re-export types for convenience
export type { CompileResult, CompiledNetwork } from "@firefly-swarm/network-compiler";

/**
 * Pantheon Plugin
 * 
 * Functional plugin that provides the curated Pantheon agent network.
 */
const pantheonPlugin: Plugin = createNetworkPlugin(
  NETWORK_DIR,
  "@firefly-swarm/pantheon",
  "firefly-swarm-pantheon.json"
);

// Export as default
export default pantheonPlugin;

// CLI validation when run directly
if (import.meta.main) {
  validateNetworkCLI(NETWORK_DIR);
}
