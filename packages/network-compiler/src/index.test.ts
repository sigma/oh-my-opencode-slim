/// <reference types="bun-types" />

import { describe, expect, test, beforeAll } from "bun:test";
import { join, resolve } from "path";
import {
  loadAndCompileNetwork,
  loadNetwork,
  compileNetwork,
  generateMermaidDiagram,
  generateNetworkSummary,
  detectCycles,
} from "./index";

// Path to the test network (in packages/pantheon/network)
const NETWORK_DIR = resolve(import.meta.dir, "../../pantheon/network");

describe("Network Loader", () => {
  test("loads manifest correctly", () => {
    const { manifest } = loadNetwork(NETWORK_DIR);
    
    expect(manifest.frontMatter.name).toBe("Oh My OpenCode Slim - Standard Network");
    expect(manifest.frontMatter.version).toBe("1.0.0");
    expect(manifest.frontMatter.providers).toBeDefined();
    expect(manifest.frontMatter.providers.antigravity).toBeDefined();
    expect(manifest.frontMatter.providers.antigravity.high).toBe("google/claude-opus-4-5-thinking");
  });

  test("loads all agents", () => {
    const { agents } = loadNetwork(NETWORK_DIR);
    
    expect(agents.size).toBe(10);
    expect(agents.has("orchestrator")).toBe(true);
    expect(agents.has("designer")).toBe(true);
    expect(agents.has("fixer")).toBe(true);
  });

  test("loads all skills", () => {
    const { skills } = loadNetwork(NETWORK_DIR);
    
    expect(skills.size).toBe(2);
    expect(skills.has("playwright")).toBe(true);
    expect(skills.has("yagni-enforcement")).toBe(true);
  });

  test("parses agent frontmatter correctly", () => {
    const { agents } = loadNetwork(NETWORK_DIR);
    const orchestrator = agents.get("orchestrator")!;
    
    expect(orchestrator.frontMatter.primary).toBe(true);
    expect(orchestrator.frontMatter.delegates).toContain("designer");
    expect(orchestrator.frontMatter.delegates).toContain("fixer");
    expect(orchestrator.frontMatter.skills.length).toBeGreaterThan(0);
  });

  test("parses skill frontmatter correctly", () => {
    const { skills } = loadNetwork(NETWORK_DIR);
    const playwright = skills.get("playwright")!;
    
    expect(playwright.frontMatter.type).toBe("mcp");
    expect(playwright.frontMatter.mcp).toBeDefined();
    expect(playwright.frontMatter.mcp?.type).toBe("npm");
    expect(playwright.frontMatter.mcp?.package).toBe("@playwright/mcp");
  });
});

describe("Network Compiler", () => {
  test("compiles valid network successfully", () => {
    const result = loadAndCompileNetwork(NETWORK_DIR);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.network.agents.size).toBe(10);
      expect(result.network.skills.size).toBe(2);
    }
  });

  test("builds delegation graph correctly", () => {
    const result = loadAndCompileNetwork(NETWORK_DIR);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const orchestratorDelegates = result.network.delegationGraph.get("orchestrator");
      expect(orchestratorDelegates).toBeDefined();
      expect(orchestratorDelegates).toContain("designer");
      expect(orchestratorDelegates).toContain("fixer");
      
      // Subagents should have empty delegation lists
      const fixerDelegates = result.network.delegationGraph.get("fixer");
      expect(fixerDelegates).toEqual([]);
    }
  });

  test("builds skill graph correctly", () => {
    const result = loadAndCompileNetwork(NETWORK_DIR);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const designerSkills = result.network.skillGraph.get("designer");
      expect(designerSkills).toContain("playwright");
    }
  });

  test("detects missing agent references", () => {
    const { manifest, agents, skills } = loadNetwork(NETWORK_DIR);
    
    // Create a fake agent with invalid delegate
    const fakeAgent = {
      frontMatter: {
        name: "fake",
        primary: false,
        role: "Fake agent",
        description: "Test",
        delegates: ["nonexistent-agent"],
        skills: [],
        variant: "low" as const,
        defaultModel: "test/model",
        defaultTemperature: 0.1,
        capabilities: [],
        constraints: [],
        triggers: [],
        delegationHints: [],
      },
      content: "Test",
    };
    agents.set("fake", fakeAgent);

    const result = compileNetwork(manifest, agents, skills);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe("missing_agent");
      expect(result.errors[0].target).toBe("nonexistent-agent");
    }
  });

  test("detects missing skill references", () => {
    const { manifest, agents, skills } = loadNetwork(NETWORK_DIR);
    
    // Create a fake agent with invalid skill
    const fakeAgent = {
      frontMatter: {
        name: "fake2",
        primary: false,
        role: "Fake agent",
        description: "Test",
        delegates: [],
        skills: ["nonexistent-skill"],
        variant: "low" as const,
        defaultModel: "test/model",
        defaultTemperature: 0.1,
        capabilities: [],
        constraints: [],
        triggers: [],
        delegationHints: [],
      },
      content: "Test",
    };
    agents.set("fake2", fakeAgent);

    const result = compileNetwork(manifest, agents, skills);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const skillError = result.errors.find(e => e.type === "missing_skill");
      expect(skillError).toBeDefined();
      expect(skillError?.target).toBe("nonexistent-skill");
    }
  });
});

describe("Graph Generation", () => {
  test("generates Mermaid diagram", () => {
    const result = loadAndCompileNetwork(NETWORK_DIR);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const mermaid = generateMermaidDiagram(result.network);
      
      expect(mermaid).toContain("graph TD");
      expect(mermaid).toContain("orchestrator");
      expect(mermaid).toContain("designer");
      expect(mermaid).toContain("-->|delegates|");
      expect(mermaid).toContain("-.->|uses|");
    }
  });

  test("generates network summary", () => {
    const result = loadAndCompileNetwork(NETWORK_DIR);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const summary = generateNetworkSummary(result.network);
      
      expect(summary).toContain("Oh My OpenCode Slim");
      expect(summary).toContain("Agents: 10");
      expect(summary).toContain("Skills: 2");
      expect(summary).toContain("orchestrator");
    }
  });

  test("cycle detection finds no cycles in valid network", () => {
    const result = loadAndCompileNetwork(NETWORK_DIR);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const cycles = detectCycles(result.network.delegationGraph);
      expect(cycles.length).toBe(0);
    }
  });

  test("cycle detection finds cycles", () => {
    // Create a graph with a cycle
    const graph = new Map<string, string[]>([
      ["a", ["b"]],
      ["b", ["c"]],
      ["c", ["a"]], // cycle back to a
    ]);

    const cycles = detectCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
  });
});
