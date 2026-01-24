import { join } from "path"
import type { InstallConfig } from "./types"
import { DEFAULT_AGENT_SKILLS } from "@firefly-swarm/tool-skills"
import { loadAndCompileNetwork } from "@firefly-swarm/network-compiler"

/**
 * Provider configurations for Google models (via Antigravity auth plugin)
 */
export const GOOGLE_PROVIDER_CONFIG = {
  google: {
    name: "Google",
    models: {
      "gemini-3-pro-high": {
        name: "Gemini 3 Pro High",
        thinking: true,
        attachment: true,
        limit: { context: 1048576, output: 65535 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
      "gemini-3-flash": {
        name: "Gemini 3 Flash",
        attachment: true,
        limit: { context: 1048576, output: 65536 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
      "claude-opus-4-5-thinking": {
        name: "Claude Opus 4.5 Thinking",
        attachment: true,
        limit: { context: 200000, output: 32000 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
      "claude-sonnet-4-5-thinking": {
        name: "Claude Sonnet 4.5 Thinking",
        attachment: true,
        limit: { context: 200000, output: 32000 },
        modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      },
    },
  },
}

// Model mappings by provider priority
export const FALLBACK_MODEL_MAPPINGS = {
  antigravity: {
    orchestrator: { model: "google/claude-opus-4-5-thinking" },
    oracle: { model: "google/claude-opus-4-5-thinking", variant: "high" },
    librarian: { model: "google/gemini-3-flash", variant: "low" },
    explorer: { model: "google/gemini-3-flash", variant: "low" },
    designer: { model: "google/gemini-3-flash", variant: "medium" },
    fixer: { model: "google/gemini-3-flash", variant: "low" },
    archivist: { model: "google/gemini-3-flash", variant: "low" },
    prober: { model: "google/gemini-3-flash", variant: "low" },
    analyst: { model: "google/gemini-3-flash", variant: "medium" },
    scribe: { model: "google/gemini-3-flash", variant: "low" },
  },
  openai: {
    orchestrator: { model: "openai/gpt-5.2-codex" },
    oracle: { model: "openai/gpt-5.2-codex", variant: "high" },
    librarian: { model: "openai/gpt-5.1-codex-mini", variant: "low" },
    explorer: { model: "openai/gpt-5.1-codex-mini", variant: "low" },
    designer: { model: "openai/gpt-5.1-codex-mini", variant: "medium" },
    fixer: { model: "openai/gpt-5.1-codex-mini", variant: "low" },
    archivist: { model: "openai/gpt-5.1-codex-mini", variant: "low" },
    prober: { model: "openai/gpt-5.1-codex-mini", variant: "low" },
    analyst: { model: "openai/gpt-5.1-codex-mini", variant: "medium" },
    scribe: { model: "openai/gpt-5.1-codex-mini", variant: "low" },
  },
  "zen-free": {
    orchestrator: { model: "opencode/big-pickle" },
    oracle: { model: "opencode/big-pickle", variant: "high" },
    librarian: { model: "opencode/big-pickle", variant: "low" },
    explorer: { model: "opencode/big-pickle", variant: "low" },
    designer: { model: "opencode/big-pickle", variant: "medium" },
    fixer: { model: "opencode/big-pickle", variant: "low" },
    archivist: { model: "opencode/big-pickle", variant: "low" },
    prober: { model: "opencode/big-pickle", variant: "low" },
    analyst: { model: "opencode/big-pickle", variant: "medium" },
    scribe: { model: "opencode/big-pickle", variant: "low" },
  },
} as const;

/**
 * Resolves agent -> model mappings from the compiled network.
 * 
 * For each provider in manifest, builds the mapping by reading each agent's variant
 * and looking up the corresponding model from the provider preset.
 */
export function getModelMappingsFromNetwork(networkDir: string): Record<string, Record<string, { model: string; variant?: string }>> | null {
  try {
    const result = loadAndCompileNetwork(networkDir);
    if (!result.success) {
      return null;
    }

    const { network } = result;
    const { providers } = network.manifest.frontMatter;
    const mappings: Record<string, Record<string, { model: string; variant?: string }>> = {};

    for (const [providerName, providerPreset] of Object.entries(providers)) {
      const agentMappings: Record<string, { model: string; variant?: string }> = {};
      
      for (const [agentName, agent] of network.agents.entries()) {
        // Orchestrator defaults to 'high' in the legacy mappings, but 'low' in the schema.
        // We respect the schema default unless it's the orchestrator.
        let variant = agent.frontMatter.variant || "low";
        if (agentName === "orchestrator" && variant === "low") {
          variant = "high";
        }
        
        const model = providerPreset[variant as keyof typeof providerPreset];
        
        agentMappings[agentName] = {
          model,
          // Don't include variant in output for orchestrator to match legacy style
          variant: agentName === "orchestrator" ? undefined : variant,
        };
      }
      
      mappings[providerName] = agentMappings;
    }

    return mappings;
  } catch (error) {
    return null;
  }
}

export function generateLiteConfig(installConfig: InstallConfig): Record<string, unknown> {
  // Try to load mappings from network first
  const networkDir = join(process.cwd(), "network");
  const networkMappings = getModelMappingsFromNetwork(networkDir);
  const mappings = networkMappings || FALLBACK_MODEL_MAPPINGS;

  // Determine base provider
  const baseProvider = installConfig.hasAntigravity
    ? "antigravity"
    : installConfig.hasOpenAI
      ? "openai"
      : "zen-free";

  const config: Record<string, unknown> = {
    preset: baseProvider,
    presets: {},
  };

  // Generate all presets
  for (const [providerName, models] of Object.entries(mappings)) {
    const agents: Record<string, { model: string; variant?: string; skills: string[] }> = Object.fromEntries(
      Object.entries(models as Record<string, { model: string; variant?: string }>).map(([k, v]) => [
        k,
        {
          model: v.model,
          variant: v.variant,
          skills: DEFAULT_AGENT_SKILLS[k as keyof typeof DEFAULT_AGENT_SKILLS] ?? [],
        },
      ])
    );
    (config.presets as Record<string, unknown>)[providerName] = agents;
  }

  // Always add antigravity-openai preset
  const mixedAgents: Record<string, { model: string; variant?: string }> = { 
    ...((mappings as any).antigravity || FALLBACK_MODEL_MAPPINGS.antigravity) 
  };
  
  // Use oracle from openai if available, otherwise fallback
  const openaiOracle = (mappings as any).openai?.oracle || FALLBACK_MODEL_MAPPINGS.openai.oracle;
  mixedAgents.oracle = { ...openaiOracle };
  
  const agents: Record<string, { model: string; variant?: string; skills: string[] }> = Object.fromEntries(
    Object.entries(mixedAgents).map(([k, v]) => [
      k,
      {
        model: v.model,
        variant: v.variant,
        skills: DEFAULT_AGENT_SKILLS[k as keyof typeof DEFAULT_AGENT_SKILLS] ?? [],
      },
    ])
  );
  (config.presets as Record<string, unknown>)["antigravity-openai"] = agents;

  // Set default preset based on user choice
  if (installConfig.hasAntigravity && installConfig.hasOpenAI) {
    config.preset = "antigravity-openai";
  }

  if (installConfig.hasTmux) {
    config.tmux = {
      enabled: true,
      layout: "main-vertical",
      main_pane_size: 60,
    };
  }

  return config;
}
