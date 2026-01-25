// Types
export * from "./types";

// Factory
export { getMultiplexerProvider } from "./factory";

// Providers
export { 
  TmuxProvider,
  createTmuxProvider,
  spawnTmuxPane,
  closeTmuxPane,
  isInsideTmux,
  getTmuxPath,
  startTmuxCheck,
  resetServerCheck,
} from "./providers/tmux";

export {
  WeztermProvider,
  createWeztermProvider,
  isInsideWezterm,
  getWeztermPath,
} from "./providers/wezterm";

// Manager
export {
  MultiplexerManager,
  TmuxSessionManager, // Backward compat alias
  createMultiplexerManager,
} from "./manager";
