import type { Plugin } from "@opencode-ai/plugin";
import { getAgentConfigs } from "@firefly-swarm/agents";
import { BackgroundTaskManager, createBackgroundTools } from "@firefly-swarm/tool-background";
import { MultiplexerManager, createTmuxProvider, startTmuxCheck } from "@firefly-swarm/multiplexer";
import { 
  lsp_goto_definition,
  lsp_find_references,
  lsp_diagnostics,
  lsp_rename,
} from "@firefly-swarm/tool-lsp";
import { grep } from "@firefly-swarm/tool-grep";
import { ast_grep_search, ast_grep_replace } from "@firefly-swarm/tool-ast-grep";
import { antigravity_quota } from "@firefly-swarm/tool-quota";
import { createSkillTools, SkillMcpManager } from "@firefly-swarm/tool-skills";
import { getMcpServers } from "@firefly-swarm/mcp-integrations";
import { 
  createAutoUpdateCheckerHook, 
  createPhaseReminderHook, 
  createPostReadNudgeHook 
} from "@firefly-swarm/hooks";
import { log, type TmuxConfig } from "@firefly-swarm/shared";
import { loadPluginConfig } from "./loader";

const OhMyOpenCodeLite: Plugin = async (ctx) => {
  const config = loadPluginConfig(ctx.directory);
  const agents = getAgentConfigs(config);

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
  const mcps = getMcpServers(config.disabled_mcps);
  const skillMcpManager = SkillMcpManager.getInstance();
  const skillTools = createSkillTools(skillMcpManager, config);

  // Initialize TmuxSessionManager to handle OpenCode's built-in Task tool sessions
  const tmuxProvider = createTmuxProvider();
  const tmuxSessionManager = new MultiplexerManager(ctx, tmuxConfig, tmuxProvider);

  // Initialize auto-update checker hook
  const autoUpdateChecker = createAutoUpdateCheckerHook(ctx, {
    showStartupToast: true,
    autoUpdate: true,
  });

  // Initialize phase reminder hook for workflow compliance
  const phaseReminderHook = createPhaseReminderHook();

  // Initialize post-read nudge hook
  const postReadNudgeHook = createPostReadNudgeHook();

  return {
    name: "oh-my-opencode-slim",

    agent: agents,

    tool: {
      ...backgroundTools,
      lsp_goto_definition,
      lsp_find_references,
      lsp_diagnostics,
      lsp_rename,
      grep,
      ast_grep_search,
      ast_grep_replace,
      antigravity_quota,
      ...skillTools,
    },

    mcp: mcps,

    config: async (opencodeConfig: Record<string, unknown>) => {
      (opencodeConfig as { default_agent?: string }).default_agent = "orchestrator";

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

export default OhMyOpenCodeLite;

export type { PluginConfig, AgentOverrideConfig, AgentName, McpName, TmuxConfig, TmuxLayout } from "@firefly-swarm/shared";
export type { RemoteMcpConfig } from "@firefly-swarm/mcp-integrations";
export { loadPluginConfig } from "./loader";
