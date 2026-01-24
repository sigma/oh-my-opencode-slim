import type { PluginInput } from "@opencode-ai/plugin"
import { createAutoUpdateCheckerHook } from "./auto-update-checker"
import { createPhaseReminderHook } from "./phase-reminder"
import { createPostReadNudgeHook } from "./post-read-nudge"

export { createAutoUpdateCheckerHook } from "./auto-update-checker"
export type { AutoUpdateCheckerOptions } from "./auto-update-checker"
export { createPhaseReminderHook } from "./phase-reminder"
export { createPostReadNudgeHook } from "./post-read-nudge"

/**
 * Creates all default hooks for the OpenCode Swarm plugin.
 */
export function createHooks(ctx: PluginInput) {
  return {
    ...createAutoUpdateCheckerHook(ctx),
    ...createPhaseReminderHook(),
    ...createPostReadNudgeHook(),
  }
}
