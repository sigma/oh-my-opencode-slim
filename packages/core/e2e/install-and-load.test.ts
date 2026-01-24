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
import OhMyOpenCodeLite from "../src/index";

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
      tui: false,
      antigravity: "no",
      openai: "no",
      tmux: "no",
    });

    expect(exitCode).toBe(0);

    // Verify oh-my-opencode-slim.json exists
    const liteConfigPath = path.join(opencodeDir, "oh-my-opencode-slim.json");
    expect(fs.existsSync(liteConfigPath)).toBe(true);

    // 2. Load
    const plugin = (await OhMyOpenCodeLite({
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
    expect(plugin.name).toBe("oh-my-opencode-slim");
    
    // Check agents
    expect(plugin.agent).toBeDefined();
    const agents = plugin.agent;
    expect(agents).toHaveProperty("orchestrator");
    expect(agents).toHaveProperty("designer");
    expect(agents).toHaveProperty("fixer");
    expect(agents).toHaveProperty("explorer");

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
  });
});
