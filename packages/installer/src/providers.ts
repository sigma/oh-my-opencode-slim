import type { InstallConfig } from "./types"
import { getNetwork } from "@firefly-swarm/default-network"

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

export function generateLiteConfig(installConfig: InstallConfig): Record<string, unknown> {
  const network = getNetwork()
  const presets: Record<string, any> = {}

  const providerSpecs = [
    { id: "antigravity", prefixes: ["google/", "anthropic/", "mistral/"] },
    { id: "openai", prefixes: ["openai/"] },
    { id: "zai", prefixes: ["zai-coding-plan/"] },
    { id: "copilot", prefixes: ["github-copilot/"] },
    { id: "zen", prefixes: ["opencode/"] },
  ]

  for (const spec of providerSpecs) {
    const agents: Record<string, any> = {}
    for (const [agentId, agent] of network.agents.entries()) {
      const models = agent.frontMatter.models
      const model = models.find((m: string) => spec.prefixes.some((p: string) => m.startsWith(p))) || models[0]

      agents[agentId] = {
        model,
        skills: agent.frontMatter.skills,
      }
    }
    presets[spec.id] = agents
  }

  // Determine base preset
  let basePreset = "zen"
  if (installConfig.hasAntigravity) {
    basePreset = "antigravity"
  } else if (installConfig.hasOpenAI) {
    basePreset = "openai"
  } else if (installConfig.hasZai) {
    basePreset = "zai"
  } else if (installConfig.hasCopilot) {
    basePreset = "copilot"
  }

  const config: Record<string, any> = {
    preset: basePreset,
    presets,
  }

  if (installConfig.multiplexerProvider && installConfig.multiplexerProvider !== "none") {
    config.multiplexer = {
      enabled: true,
      provider: installConfig.multiplexerProvider,
      layout: "main-vertical",
      main_pane_size: 60,
    }
  }

  return config
}
