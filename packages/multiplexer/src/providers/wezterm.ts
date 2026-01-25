import { spawn } from "bun";
import { log } from "@firefly-swarm/shared";
import type { 
  MultiplexerProvider, 
  SpawnOptions, 
  SpawnResult 
} from "../types";
import { isServerRunning } from "../utils";

let weztermPath: string | null = null;
let weztermChecked = false;

/**
 * Find wezterm binary path
 */
async function findWeztermPath(): Promise<string | null> {
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "where" : "which";

  try {
    const proc = spawn([cmd, "wezterm"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      log("[wezterm] findWeztermPath: 'which wezterm' failed", { exitCode });
      return null;
    }

    const stdout = await new Response(proc.stdout).text();
    const path = stdout.trim().split("\n")[0];
    if (!path) {
      log("[wezterm] findWeztermPath: no path in output");
      return null;
    }

    // Verify it works
    const verifyProc = spawn([path, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const verifyExit = await verifyProc.exited;
    if (verifyExit !== 0) {
      log("[wezterm] findWeztermPath: wezterm --version failed", { path, verifyExit });
      return null;
    }

    log("[wezterm] findWeztermPath: found wezterm", { path });
    return path;
  } catch (err) {
    log("[wezterm] findWeztermPath: exception", { error: String(err) });
    return null;
  }
}

/**
 * Get cached wezterm path, initializing if needed
 */
export async function getWeztermPath(): Promise<string | null> {
  if (weztermChecked) {
    return weztermPath;
  }

  weztermPath = await findWeztermPath();
  weztermChecked = true;
  log("[wezterm] getWeztermPath: initialized", { weztermPath });
  return weztermPath;
}

/**
 * Check if we're running inside wezterm
 */
export function isInsideWezterm(): boolean {
  return !!process.env.WEZTERM_PANE || !!process.env.WEZTERM_UNIX_SOCKET;
}

export class WeztermProvider implements MultiplexerProvider {
  readonly id = "wezterm";

  async isAvailable(): Promise<boolean> {
    return (await getWeztermPath()) !== null;
  }

  isActive(): boolean {
    return isInsideWezterm();
  }

  async spawn(options: SpawnOptions): Promise<SpawnResult> {
    const { sessionId, title, serverUrl, layout = "main-vertical" } = options;
    
    log("[wezterm] spawn called", { sessionId, title, serverUrl, layout });

    if (!this.isActive()) {
      log("[wezterm] spawn: not inside wezterm, skipping");
      return { success: false };
    }

    const serverRunning = await isServerRunning(serverUrl);
    if (!serverRunning) {
      log("[wezterm] spawn: OpenCode server not running, skipping", {
        serverUrl,
        hint: "Start opencode with --port 4096"
      });
      return { success: false };
    }

    const wezterm = await getWeztermPath();
    if (!wezterm) {
      log("[wezterm] spawn: wezterm binary not found, skipping");
      return { success: false };
    }

    try {
      const opencodeCmd = `opencode attach ${serverUrl} --session ${sessionId}`;
      
      // Determine split direction based on layout
      // main-vertical: main pane left, split right (horizontal split)
      // main-horizontal: main pane top, split bottom (vertical split)
      const splitArgs = layout === "main-horizontal" || layout === "even-vertical"
        ? ["--bottom"] // split below
        : ["--right"]; // split right (default for main-vertical)

      const args = [
        "cli",
        "split-pane",
        ...splitArgs,
        "--", 
        "bash", "-c", opencodeCmd // wrapping in bash to ensure clean execution environment
      ];

      log("[wezterm] spawn: executing", { wezterm, args });

      const proc = spawn([wezterm, ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const paneId = stdout.trim();

      log("[wezterm] spawn: split result", { exitCode, paneId, stderr: stderr.trim() });

      if (exitCode === 0 && paneId) {
        // Set title
        const titleProc = spawn(
          [wezterm, "cli", "set-tab-title", title.slice(0, 30), "--pane-id", paneId],
          { stdout: "ignore", stderr: "ignore" }
        );
        await titleProc.exited;

        return { success: true, paneId };
      }

      return { success: false };
    } catch (err) {
      log("[wezterm] spawn: exception", { error: String(err) });
      return { success: false };
    }
  }

  async close(paneId: string): Promise<boolean> {
    log("[wezterm] close called", { paneId });

    if (!paneId) return false;

    const wezterm = await getWeztermPath();
    if (!wezterm) return false;

    try {
      const proc = spawn([wezterm, "cli", "kill-pane", "--pane-id", paneId], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stderr = await new Response(proc.stderr).text();

      log("[wezterm] close: result", { exitCode, stderr: stderr.trim() });

      return exitCode === 0;
    } catch (err) {
      log("[wezterm] close: exception", { error: String(err) });
      return false;
    }
  }

  // WezTerm layout management is complex via CLI, skipping for now
  async applyLayout(layout: string, mainPaneSize?: number): Promise<void> {
    log("[wezterm] applyLayout: not implemented", { layout });
  }
}

export const provider = new WeztermProvider();

export function createWeztermProvider(): WeztermProvider {
  return provider;
}
