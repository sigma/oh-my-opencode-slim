/**
 * @firefly-swarm/tool-background
 * 
 * Background task management tools for the plugin.
 */

export { BackgroundTaskManager, type BackgroundTask, type LaunchOptions } from "./manager";
export { 
  createBackgroundTools,
  resolveSessionId,
  createSession,
  sendPrompt,
  pollSession,
  extractResponseText,
} from "./tools";
export { resolveAgentVariant, applyAgentVariant, normalizeAgentName } from "./utils";
