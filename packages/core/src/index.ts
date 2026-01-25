import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { getAgentConfigs } from "@firefly-swarm/agents";
import { BackgroundTaskManager, createBackgroundTools } from "@firefly-swarm/tool-background";
import { MultiplexerManager, createTmuxProvider, startTmuxCheck } from "@firefly-swarm/multiplexer";
import { 
  lsp_goto_definition,
  lsp_find_references,
  lsp_diagnostics,
  lsp_rename,
} from "@firefly-swarm/tool-lsp";
import { grep, checkGrepAvailability } from "@firefly-swarm/tool-grep";
import { ast_grep_search, ast_grep_replace, checkEnvironment as checkAstGrepEnvironment } from "@firefly-swarm/tool-ast-grep";
import { antigravity_quota } from "@firefly-swarm/tool-quota";
import { createSkillTools, SkillMcpManager } from "@firefly-swarm/tool-skills";
import { getMcpServers } from "@firefly-swarm/mcp-integrations";
import { 
  createAutoUpdateCheckerHook, 
  createPhaseReminderHook, 
  createPostReadNudgeHook 
} from "@firefly-swarm/hooks";
import { log, type TmuxConfig, type PluginConfig } from "@firefly-swarm/shared";
import { loadAndCompileNetwork } from "@firefly-swarm/network-compiler";
import { loadPluginConfig } from "./loader";

export const createPlugin = (
  customAgents?: Record<string, any>,
  configFilename?: string,
  pluginName: string = "@firefly-swarm/core"
): Plugin => async (ctx: PluginInput) => {
  const config = loadPluginConfig(ctx.directory, configFilename);
  let agents = customAgents;

  if (agents) {
    // Apply overrides from config
    const overrides = config.agents || {};
    for (const [name, agent] of Object.entries(agents)) {
      const override = (overrides as any)[name];
      if (override) {
        if (override.model) agent.model = override.model;
        if (override.temperature !== undefined) agent.temperature = override.temperature;
      }
      // Ensure primary agent has permission to ask questions (default behavior)
      if (agent.mode === "primary") {
        agent.permission = { ...agent.permission, question: "allow" };
      }
    }
  } else {
    agents = getAgentConfigs(config);
  }

  // Set default agent in config for tools and hooks
  const primaryAgentEntry = Object.entries(agents || {}).find(
    ([_, agent]) => agent.mode === "primary"
  );
  if (primaryAgentEntry) {
    (config as any).default_agent = primaryAgentEntry[0];
  }
  (ctx as any).config = config;

  // Parse tmux config with defaults
  const tmuxConfig: TmuxConfig = {
    enabled: config.tmux?.enabled ?? false,
    layout: config.tmux?.layout ?? "main-vertical",
    main_pane_size: config.tmux?.main_pane_size ?? 60,
  };

  log("[plugin] initialized with tmux config", {
    tmuxConfig,
    rawTmuxConfig: config.tmux,
    directory: ctx.directory
  });

  // Start background tmux check if enabled
  if (tmuxConfig.enabled) {
    startTmuxCheck();
  }

  const backgroundManager = new BackgroundTaskManager(ctx, tmuxConfig, config);
  const backgroundTools = createBackgroundTools(ctx, backgroundManager, tmuxConfig, config);

  // Check tool prerequisites
  const isGrepAvailable = checkGrepAvailability();
  const astGrepEnv = checkAstGrepEnvironment();
  const isAstGrepAvailable = astGrepEnv.cli.available;

  if (!isGrepAvailable) {
    log("[plugin] grep (ripgrep) not found, disabling grep tool");
  }
  if (!isAstGrepAvailable) {
    log("[plugin] ast-grep not found, disabling ast-grep tools");
  }

  const mcps = getMcpServers(config.disabled_mcps);
  const skillMcpManager = SkillMcpManager.getInstance();
  const skillTools = createSkillTools(skillMcpManager, ctx);

  // Initialize TmuxSessionManager to handle OpenCode's built-in Task tool sessions
  const tmuxProvider = createTmuxProvider();
  const tmuxSessionManager = new MultiplexerManager(ctx, tmuxConfig, tmuxProvider);

  // Initialize auto-update checker hook
  const autoUpdateChecker = createAutoUpdateCheckerHook(ctx, {
    showStartupToast: true,
    autoUpdate: true,
  });

  // Initialize phase reminder hook for workflow compliance
  const phaseReminderHook = createPhaseReminderHook(ctx);

  // Initialize post-read nudge hook
  const postReadNudgeHook = createPostReadNudgeHook();

  return {
    name: pluginName,

    agent: agents,

    tool: {
      ...backgroundTools,
      lsp_goto_definition,
      lsp_find_references,
      lsp_diagnostics,
      lsp_rename,
      ...(isGrepAvailable ? { grep } : {}),
      ...(isAstGrepAvailable ? { ast_grep_search, ast_grep_replace } : {}),
      antigravity_quota,
      ...skillTools,
    },

    mcp: mcps,

    config: async (opencodeConfig: Record<string, unknown>) => {
      // Find the primary agent and set it as the default
      const primaryAgent = Object.entries(agents || {}).find(
        ([_, agent]) => agent.mode === "primary"
      );
      if (primaryAgent) {
        (opencodeConfig as { default_agent?: string }).default_agent = primaryAgent[0];
      }

      const configAgent = opencodeConfig.agent as Record<string, unknown> | undefined;
      if (!configAgent) {
        opencodeConfig.agent = { ...agents };
      } else {
        Object.assign(configAgent, agents);
      }

      // Merge MCP configs
      const configMcp = opencodeConfig.mcp as Record<string, unknown> | undefined;
      if (!configMcp) {
        opencodeConfig.mcp = { ...mcps };
      } else {
        Object.assign(configMcp, mcps);
      }
    },

    event: async (input) => {
      // Handle auto-update checking
      await autoUpdateChecker.event(input);

      // Handle tmux pane spawning for OpenCode's Task tool sessions
      await tmuxSessionManager.onSessionCreated(input.event as {
        type: string;
        properties?: { info?: { id?: string; parentID?: string; title?: string } };
      });
    },

    // Inject phase reminder before sending to API (doesn't show in UI)
    "experimental.chat.messages.transform": phaseReminderHook["experimental.chat.messages.transform"],

    // Nudge after file reads to encourage delegation
    "tool.execute.after": postReadNudgeHook["tool.execute.after"],
  };
};

export default createPlugin;

/**
 * Create a plugin from a network definition directory.
 * 
 * @param networkDir Path to the directory containing network definition
 * @param pluginName Plugin name
 * @param configFilename Configuration filename
 * @returns Plugin function
 */
export const createNetworkPlugin = (
  networkDir: string,
  pluginName: string,
  configFilename: string
): Plugin => {
  // Load and compile network
  const result = loadAndCompileNetwork(networkDir);
  if (!result.success) {
    const errorMessages = result.errors.map((e: { message: string }) => e.message).join("\n");
    throw new Error(`Failed to compile network from ${networkDir}:\n${errorMessages}`);
  }
  
  const network = result.network;
  
  // Map network agents to OpenCode SDK agent configurations
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

  // Create base plugin
  const basePlugin = createPlugin(agents, configFilename, pluginName);

  // Return wrapped plugin that injects skills
  return async (ctx: PluginInput) => {
    const instance = await basePlugin(ctx);
    const originalConfig = instance.config;

    instance.config = async (opencodeConfig: Record<string, any>) => {
      // Run base config hook first
      if (originalConfig) {
        await originalConfig(opencodeConfig);
      }

      // Inject skills into the agents in the config
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
};

export type { AgentOverrideConfig, AgentName, McpName, TmuxConfig, TmuxLayout } from "@firefly-swarm/shared";
export type { PluginConfig } from "@firefly-swarm/shared";
export type { RemoteMcpConfig } from "@firefly-swarm/mcp-integrations";
export { loadPluginConfig } from "./loader";
