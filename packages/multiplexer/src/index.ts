// Types
export * from "./types";

// Provider
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

// Manager
export {
  MultiplexerManager,
  TmuxSessionManager, // Backward compat alias
  createMultiplexerManager,
} from "./manager";
