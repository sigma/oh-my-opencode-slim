/**
 * Multiplexer provider interface for terminal multiplexers (Tmux, WezTerm, etc.)
 */
export interface MultiplexerProvider {
  readonly id: string;
  
  /** Check if the multiplexer binary is installed and functional */
  isAvailable(): Promise<boolean>;
  
  /** Check if the current process is running inside this multiplexer */
  isActive(): boolean;
  
  /** Spawn a new pane/window for an OpenCode session */
  spawn(options: SpawnOptions): Promise<SpawnResult>;
  
  /** Close a previously spawned pane/window */
  close(paneId: string): Promise<boolean>;
  
  /** Reapply layout to rebalance panes */
  applyLayout?(layout: string, mainPaneSize?: number): Promise<void>;
}

export interface SpawnOptions {
  sessionId: string;
  title: string;
  serverUrl: string;
  layout?: string;
  mainPaneSize?: number;
}

export interface SpawnResult {
  success: boolean;
  paneId?: string;
}

/** Configuration for the multiplexer */
export interface MultiplexerConfig {
  enabled: boolean;
  layout?: "main-horizontal" | "main-vertical" | "tiled" | "even-horizontal" | "even-vertical";
  main_pane_size?: number;
}
