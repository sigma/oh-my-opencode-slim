import { spawn } from "bun";
import { log } from "@firefly-swarm/shared";
import type { 
  MultiplexerProvider, 
  SpawnOptions, 
  SpawnResult,
  MultiplexerConfig 
} from "../types";

let tmuxPath: string | null = null;
let tmuxChecked = false;

// Store config for reapplying layout on close
let storedConfig: MultiplexerConfig | null = null;

// Cache server availability check
let serverAvailable: boolean | null = null;
let serverCheckUrl: string | null = null;

/**
 * Check if the OpenCode HTTP server is actually running.
 */
async function isServerRunning(serverUrl: string): Promise<boolean> {
  // Use cached result if checking the same URL
  if (serverCheckUrl === serverUrl && serverAvailable === true) {
    return true;
  }

  const healthUrl = new URL("/health", serverUrl).toString();
  const timeoutMs = 3000;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response | null = null;
    try {
      response = await fetch(healthUrl, { signal: controller.signal }).catch(() => null);
    } finally {
      clearTimeout(timeout);
    }

    const available = response?.ok ?? false;
    if (available) {
      serverCheckUrl = serverUrl;
      serverAvailable = true;
      log("[tmux] isServerRunning: checked", { serverUrl, available, attempt });
      return true;
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  log("[tmux] isServerRunning: checked", { serverUrl, available: false });
  return false;
}

/**
 * Reset the server availability cache (useful when server might have started)
 */
export function resetServerCheck(): void {
  serverAvailable = null;
  serverCheckUrl = null;
}

/**
 * Find tmux binary path
 */
async function findTmuxPath(): Promise<string | null> {
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "where" : "which";

  try {
    const proc = spawn([cmd, "tmux"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      log("[tmux] findTmuxPath: 'which tmux' failed", { exitCode });
      return null;
    }

    const stdout = await new Response(proc.stdout).text();
    const path = stdout.trim().split("\n")[0];
    if (!path) {
      log("[tmux] findTmuxPath: no path in output");
      return null;
    }

    // Verify it works
    const verifyProc = spawn([path, "-V"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const verifyExit = await verifyProc.exited;
    if (verifyExit !== 0) {
      log("[tmux] findTmuxPath: tmux -V failed", { path, verifyExit });
      return null;
    }

    log("[tmux] findTmuxPath: found tmux", { path });
    return path;
  } catch (err) {
    log("[tmux] findTmuxPath: exception", { error: String(err) });
    return null;
  }
}

/**
 * Get cached tmux path, initializing if needed
 */
export async function getTmuxPath(): Promise<string | null> {
  if (tmuxChecked) {
    return tmuxPath;
  }

  tmuxPath = await findTmuxPath();
  tmuxChecked = true;
  log("[tmux] getTmuxPath: initialized", { tmuxPath });
  return tmuxPath;
}

/**
 * Check if we're running inside tmux
 */
export function isInsideTmux(): boolean {
  return !!process.env.TMUX;
}

/**
 * Start background check for tmux availability
 */
export function startTmuxCheck(): void {
  if (!tmuxChecked) {
    getTmuxPath().catch(() => { });
  }
}

export class TmuxProvider implements MultiplexerProvider {
  readonly id = "tmux";

  async isAvailable(): Promise<boolean> {
    return (await getTmuxPath()) !== null;
  }

  isActive(): boolean {
    return isInsideTmux();
  }

  async spawn(options: SpawnOptions): Promise<SpawnResult> {
    const { sessionId, title, serverUrl, layout = "main-vertical", mainPaneSize = 60 } = options;
    
    log("[tmux] spawn called", { sessionId, title, serverUrl, layout, mainPaneSize });

    if (!this.isActive()) {
      log("[tmux] spawn: not inside tmux, skipping");
      return { success: false };
    }

    // Check if the OpenCode HTTP server is actually running
    const serverRunning = await isServerRunning(serverUrl);
    if (!serverRunning) {
      log("[tmux] spawn: OpenCode server not running, skipping", {
        serverUrl,
        hint: "Start opencode with --port 4096"
      });
      return { success: false };
    }

    const tmux = await getTmuxPath();
    if (!tmux) {
      log("[tmux] spawn: tmux binary not found, skipping");
      return { success: false };
    }

    // Store config for use in close
    storedConfig = { enabled: true, layout: layout as any, main_pane_size: mainPaneSize };

    try {
      // Use `opencode attach <url> --session <id>` to connect to the existing server
      const opencodeCmd = `opencode attach ${serverUrl} --session ${sessionId}`;

      const args = [
        "split-window",
        "-h",
        "-d", // Don't switch focus to new pane
        "-P", // Print pane info
        "-F", "#{pane_id}", // Format: just the pane ID
        opencodeCmd,
      ];

      log("[tmux] spawn: executing", { tmux, args, opencodeCmd });

      const proc = spawn([tmux, ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const paneId = stdout.trim(); // e.g., "%42"

      log("[tmux] spawn: split result", { exitCode, paneId, stderr: stderr.trim() });

      if (exitCode === 0 && paneId) {
        // Rename the pane for visibility
        const renameProc = spawn(
          [tmux, "select-pane", "-t", paneId, "-T", title.slice(0, 30)],
          { stdout: "ignore", stderr: "ignore" }
        );
        await renameProc.exited;

        // Apply layout to auto-rebalance all panes
        await this.applyLayout(layout, mainPaneSize);

        log("[tmux] spawn: SUCCESS, pane created and layout applied", { paneId, layout });
        return { success: true, paneId };
      }

      return { success: false };
    } catch (err) {
      log("[tmux] spawn: exception", { error: String(err) });
      return { success: false };
    }
  }

  async close(paneId: string): Promise<boolean> {
    log("[tmux] close called", { paneId });

    if (!paneId) {
      log("[tmux] close: no paneId provided");
      return false;
    }

    const tmux = await getTmuxPath();
    if (!tmux) {
      log("[tmux] close: tmux binary not found");
      return false;
    }

    try {
      const proc = spawn([tmux, "kill-pane", "-t", paneId], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stderr = await new Response(proc.stderr).text();

      log("[tmux] close: result", { exitCode, stderr: stderr.trim() });

      if (exitCode === 0) {
        log("[tmux] close: SUCCESS, pane closed", { paneId });

        // Reapply layout to rebalance remaining panes
        if (storedConfig) {
          const layout = storedConfig.layout ?? "main-vertical";
          const mainPaneSize = storedConfig.main_pane_size ?? 60;
          await this.applyLayout(layout, mainPaneSize);
          log("[tmux] close: layout reapplied", { layout });
        }

        return true;
      }

      // Pane might already be closed (user closed it manually, or process exited)
      log("[tmux] close: failed (pane may already be closed)", { paneId });
      return false;
    } catch (err) {
      log("[tmux] close: exception", { error: String(err) });
      return false;
    }
  }

  async applyLayout(layout: string, mainPaneSize: number = 60): Promise<void> {
    const tmux = await getTmuxPath();
    if (!tmux) return;

    try {
      // Apply the layout
      const layoutProc = spawn([tmux, "select-layout", layout], {
        stdout: "pipe",
        stderr: "pipe",
      });
      await layoutProc.exited;

      // For main-* layouts, set the main pane size
      if (layout === "main-horizontal" || layout === "main-vertical") {
        const sizeOption = layout === "main-horizontal"
          ? "main-pane-height"
          : "main-pane-width";

        const sizeProc = spawn([tmux, "set-window-option", sizeOption, `${mainPaneSize}%`], {
          stdout: "pipe",
          stderr: "pipe",
        });
        await sizeProc.exited;

        // Reapply layout to use the new size
        const reapplyProc = spawn([tmux, "select-layout", layout], {
          stdout: "pipe",
          stderr: "pipe",
        });
        await reapplyProc.exited;
      }

      log("[tmux] applyLayout: applied", { layout, mainPaneSize });
    } catch (err) {
      log("[tmux] applyLayout: exception", { error: String(err) });
    }
  }
}

const provider = new TmuxProvider();

export function createTmuxProvider(): TmuxProvider {
  return provider;
}

// Standalone functions for backward compatibility
export async function spawnTmuxPane(
  sessionId: string,
  title: string,
  config: MultiplexerConfig,
  serverUrl: string
): Promise<{ success: boolean; paneId?: string }> {
  return provider.spawn({
    sessionId,
    title,
    serverUrl,
    layout: config.layout,
    mainPaneSize: config.main_pane_size,
  });
}

export async function closeTmuxPane(paneId: string): Promise<boolean> {
  return provider.close(paneId);
}
