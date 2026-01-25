/**
 * Network Compiler - Public API
 *
 * Exports for loading, compiling, and working with declarative agent networks.
 */

// Schema types and validators
export {
  ManifestFrontMatterSchema,
  AgentFrontMatterSchema,
  SkillFrontMatterSchema,
  McpConfigSchema,
  ModelVariantSchema,
  ProviderPresetSchema,
  type ManifestFrontMatter,
  type AgentFrontMatter,
  type SkillFrontMatter,
  type ParsedManifest,
  type ParsedAgent,
  type ParsedSkill,
  type ModelVariant,
  type ProviderPreset,
  type CompiledNetwork,
  type CompilerError,
  type CompileResult,
} from "./schema";

// Loader functions
export {
  loadNetwork,
  loadManifest,
  loadAgents,
  loadSkills,
  ParseError,
} from "./loader";

// Compiler functions
export {
  compileNetwork,
  detectCycles,
  generateMermaidDiagram,
  generateNetworkSummary,
} from "./compiler";

// Agent bridge (exported separately to avoid circular import)
export {
  createAgentsFromNetwork,
  generateDelegatesBlurb,
  type NetworkAgentDefinition,
} from "./agents";

import { loadNetwork } from "./loader";
import { compileNetwork } from "./compiler";
import type { CompileResult } from "./schema";

/**
 * Load and compile a network from a directory.
 * This is the main entry point for using the network module.
 *
 * @param networkDir - Path to the network directory containing manifest.md, agents/, skills/
 * @returns Compiled network or throws on error
 */
export function loadAndCompileNetwork(networkDir: string): CompileResult {
  const { manifest, agents, skills } = loadNetwork(networkDir);
  return compileNetwork(manifest, agents, skills);
}

/**
 * Validate a network and print results to console, then exit.
 * Designed for use in CLI entry points.
 *
 * @param networkDir - Path to the network directory
 */
export function validateNetworkCLI(networkDir: string): void {
  const result = loadAndCompileNetwork(networkDir);
  if (result.success) {
    console.log("✓ Network is valid");
    console.log(`  Agents: ${result.network.agents.size}`);
    console.log(`  Skills: ${result.network.skills.size}`);
    process.exit(0);
  } else {
    console.error("✗ Network has errors:");
    for (const error of result.errors) {
      console.error(`  - ${error.message}`);
    }
    process.exit(1);
  }
}
