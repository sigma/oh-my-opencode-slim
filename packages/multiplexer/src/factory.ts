import type { MultiplexerConfig, MultiplexerProvider } from "./types";
import { createTmuxProvider, isInsideTmux } from "./providers/tmux";
import { createWeztermProvider, isInsideWezterm } from "./providers/wezterm";
import { log } from "@firefly-swarm/shared";

/**
 * Get the appropriate multiplexer provider based on configuration and environment.
 */
export function getMultiplexerProvider(config: MultiplexerConfig): MultiplexerProvider {
  const providerType = config.provider || "auto";

  if (providerType === "tmux") {
    return createTmuxProvider();
  }

  if (providerType === "wezterm") {
    return createWeztermProvider();
  }

  // Auto detection
  if (isInsideTmux()) {
    log("[multiplexer-factory] auto-detected tmux");
    return createTmuxProvider();
  }

  if (isInsideWezterm()) {
    log("[multiplexer-factory] auto-detected wezterm");
    return createWeztermProvider();
  }

  // Default fallback (usually to Tmux as it's the standard)
  // If neither is detected, we return TmuxProvider which will likely report isAvailable() = false
  log("[multiplexer-factory] no multiplexer detected, defaulting to tmux");
  return createTmuxProvider();
}
