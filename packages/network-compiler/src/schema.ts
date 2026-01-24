/**
 * Network Schema Definitions
 *
 * Zod schemas for validating the declarative agent network configuration.
 * These schemas define the structure of manifest.md, agent/*.md, and skill/*.md files.
 */

import { z } from "zod";

// =============================================================================
// Skill Schema
// =============================================================================

/**
 * MCP (Model Context Protocol) server configuration for skills that require external tools.
 */
export const McpConfigSchema = z
  .object({
    command: z.string().optional().describe("Command to run the MCP server"),
    package: z.string().optional().describe("NPM package to run with bunx"),
    args: z.array(z.string()).default([]).describe("Arguments to pass to the command"),
  })
  .refine((data) => data.command || data.package, {
    message: "Either command or package must be provided",
    path: ["command"],
  });

/**
 * Skill definition schema.
 * Skills are capabilities that agents can use - either builtin prompts or MCP tools.
 */
export const SkillFrontMatterSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Skill name must be lowercase alphanumeric with dashes")
    .describe("Unique skill identifier"),
  description: z.string().describe("Human-readable description of what the skill does"),
  type: z.enum(["mcp", "builtin"]).default("builtin").describe("Whether this skill uses an MCP server"),
  mcp: McpConfigSchema.optional().describe("MCP server configuration (required if type is 'mcp')"),
});

export type SkillFrontMatter = z.infer<typeof SkillFrontMatterSchema>;

/**
 * Complete parsed skill including frontmatter and prompt content.
 */
export interface ParsedSkill {
  frontMatter: SkillFrontMatter;
  content: string; // The markdown body (skill prompt/instructions)
}

// =============================================================================
// Agent Schema
// =============================================================================

/**
 * Model variant determines the reasoning effort/cost tier.
 */
export const ModelVariantSchema = z.enum(["high", "medium", "low"]).default("low");

export type ModelVariant = z.infer<typeof ModelVariantSchema>;

/**
 * Agent definition schema.
 * Each agent is a node in the network graph with defined relationships.
 */
export const AgentFrontMatterSchema = z.object({
  // Identity
  name: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Agent name must be lowercase alphanumeric with dashes")
    .describe("Unique agent identifier"),
  primary: z.boolean().default(false).describe("Whether this is a primary agent (gets special permissions)"),
  role: z.string().describe("Short role description for the agent"),
  description: z.string().describe("Full description used in SDK agent config"),

  // Network Relationships (for static linking/validation)
  delegates: z
    .array(z.string())
    .default([])
    .describe("List of agent IDs this agent can delegate to"),
  skills: z
    .array(z.string())
    .default([])
    .describe("List of skill IDs this agent can use"),

  // Runtime Configuration
  variant: ModelVariantSchema.optional().describe("Model tier for this agent"),
  defaultModel: z.string().describe("Default model identifier"),
  defaultTemperature: z.number().min(0).max(2).default(0.1),

  // Prompt Generation Metadata
  capabilities: z.array(z.string()).default([]).describe("What this agent can do"),
  constraints: z.array(z.string()).default([]).describe("Limitations and rules"),
  triggers: z.array(z.string()).default([]).describe("Keywords that trigger this agent"),
  delegationHints: z.array(z.string()).default([]).describe("When to delegate to this agent"),
  delegationNote: z.string().optional().describe("Special note for the agent's delegation blurb"),
});

export type AgentFrontMatter = z.infer<typeof AgentFrontMatterSchema>;

/**
 * Complete parsed agent including frontmatter and prompt content.
 */
export interface ParsedAgent {
  frontMatter: AgentFrontMatter;
  content: string; // The markdown body (system prompt)
}

// =============================================================================
// Manifest Schema
// =============================================================================

/**
 * Provider preset configuration.
 * Maps model variants to concrete model identifiers for each provider.
 */
export const ProviderPresetSchema = z.object({
  high: z.string().describe("Model for high-reasoning tasks"),
  medium: z.string().describe("Model for medium-complexity tasks"),
  low: z.string().describe("Model for simple/fast tasks"),
});

export type ProviderPreset = z.infer<typeof ProviderPresetSchema>;

/**
 * Network manifest schema.
 * Global configuration for the entire agent network.
 */
export const ManifestFrontMatterSchema = z.object({
  name: z.string().describe("Network name"),
  version: z.string().describe("Network version"),
  defaults: z.object({
    temperature: z.number().min(0).max(2).default(0.1),
  }).default({ temperature: 0.1 }),
  providers: z
    .record(z.string(), ProviderPresetSchema)
    .describe("Provider-specific model mappings"),
});

export type ManifestFrontMatter = z.infer<typeof ManifestFrontMatterSchema>;

/**
 * Complete parsed manifest including frontmatter and description.
 */
export interface ParsedManifest {
  frontMatter: ManifestFrontMatter;
  content: string; // The markdown body (network description)
}

// =============================================================================
// Compiled Network Types
// =============================================================================

/**
 * A fully compiled and validated network.
 * All references have been resolved and validated.
 */
export interface CompiledNetwork {
  manifest: ParsedManifest;
  agents: Map<string, ParsedAgent>;
  skills: Map<string, ParsedSkill>;
  
  // Computed graph edges
  delegationGraph: Map<string, string[]>; // agent -> agents it delegates to
  skillGraph: Map<string, string[]>;      // agent -> skills it uses
}

/**
 * Validation error from the compiler.
 */
export interface CompilerError {
  type: "missing_agent" | "missing_skill" | "cycle_detected" | "schema_error";
  message: string;
  source: string; // File or agent that caused the error
  target?: string; // The missing reference
}

/**
 * Result of network compilation.
 */
export type CompileResult =
  | { success: true; network: CompiledNetwork }
  | { success: false; errors: CompilerError[] };
