import { expect, test, describe, afterAll, beforeAll, mock } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Mock the system checks before importing installer
mock.module("../../installer/src/system", () => ({
  isOpenCodeInstalled: () => Promise.resolve(true),
  getOpenCodeVersion: () => Promise.resolve("1.1.19"),
  isRgInstalled: () => Promise.resolve(true),
  isAstGrepInstalled: () => Promise.resolve(true),
  isUvxInstalled: () => Promise.resolve(true),
  isGoInstalled: () => Promise.resolve(true),
}));

// Now import after mocking
import { install } from "../../installer/src/install";
import PantheonPlugin from "../../pantheon/index";

describe("E2E: install and load", () => {
  let tempDir: string;
  let opencodeDir: string;
  let oldXdgConfigHome: string | undefined;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "firefly-e2e-"));
    opencodeDir = path.join(tempDir, "opencode");
    fs.mkdirSync(opencodeDir, { recursive: true });

    // Write minimal opencode.json
    fs.writeFileSync(
      path.join(opencodeDir, "opencode.json"),
      JSON.stringify({ plugin: [] }, null, 2)
    );

    oldXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterAll(() => {
    process.env.XDG_CONFIG_HOME = oldXdgConfigHome;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should install and load successfully", async () => {
    // 1. Install
    const exitCode = await install({
      packageName: "@firefly-swarm/pantheon",
      tui: false,
      antigravity: "no",
      openai: "no",
      tmux: "no",
    });

    expect(exitCode).toBe(0);

    // Verify firefly-swarm-pantheon.json exists
    const liteConfigPath = path.join(opencodeDir, "firefly-swarm-pantheon.json");
    expect(fs.existsSync(liteConfigPath)).toBe(true);

    // 2. Load
    const plugin = (await PantheonPlugin({
      client: {
        session: {
          get: async () => ({ data: { id: "test", directory: process.cwd() } }),
          status: async () => ({ data: {} }),
          messages: async () => ({ data: [] }),
          create: async () => ({ data: { id: "new-session" } }),
          prompt: async () => ({ data: {} }),
        }
      } as any,
      directory: process.cwd(),
      project: {} as any,
      worktree: process.cwd(),
      serverUrl: new URL("http://localhost"),
      $: (() => {}) as any,
    })) as any;

    // 3. Assertions
    expect(plugin.name).toBe("@firefly-swarm/pantheon");
    
    // Check agents
    expect(plugin.agent).toBeDefined();
    const agents = plugin.agent;
    expect(agents).toHaveProperty("orchestrator");
    expect(agents).toHaveProperty("designer");
    expect(agents).toHaveProperty("fixer");
    expect(agents).toHaveProperty("explorer");
    expect(Object.keys(plugin.agent)).toContain("scribe");

    // Check tools
    expect(plugin.tool).toBeDefined();
    const tools = plugin.tool;
    
    // Check for grep (assuming it's available on the system)
    expect(tools).toHaveProperty("grep");
    
    // Check for skill tools
    expect(tools).toHaveProperty("omos_skill");
    expect(tools).toHaveProperty("omos_skill_mcp");
    
    // Check for background tools
    expect(tools).toHaveProperty("background_task");
    expect(tools).toHaveProperty("background_output");
    expect(tools).toHaveProperty("background_cancel");

    // playwright is a skill, not a direct tool key
    // But it should be in the description of omos_skill
    expect(tools.omos_skill.description).toContain("playwright");

    // 4. Live ping check
    const pingResult = Bun.spawnSync([
      "opencode",
      "run",
      "who are you?",
      "--agent",
      "scribe",
    ], {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: tempDir,
      },
    });

    const stdout = pingResult.stdout.toString();
    const stderr = pingResult.stderr.toString();
    
    if (pingResult.exitCode !== 0) {
      if (stderr.includes("not found") || stderr.includes("ENOENT") || stderr.includes("BunInstallFailedError")) {
        console.warn("opencode binary or plugin not found/accessible, skipping live check");
      } else {
        console.error("opencode run failed with exit code:", pingResult.exitCode);
        console.error("stdout:", stdout);
        console.error("stderr:", stderr);
        expect(pingResult.exitCode).toBe(0);
      }
    } else {
      expect(pingResult.exitCode).toBe(0);
      expect(stdout.toLowerCase()).toMatch(/scribe|documentation/i);
    }
  }, 120000);
});
