import { describe, expect, test } from "bun:test"
import { getMcpServers } from "./index"

describe("getMcpServers", () => {
  test("returns all MCPs when no disabled list provided", () => {
    const mcps = getMcpServers()
    const names = Object.keys(mcps)
    
    expect(names).toContain("websearch")
    expect(names).toContain("context7")
    expect(names).toContain("grep_app")
  })

  test("returns all MCPs with empty disabled list", () => {
    const mcps = getMcpServers([])
    const names = Object.keys(mcps)
    
    expect(names.length).toBe(3)
    expect(names).toContain("websearch")
    expect(names).toContain("context7")
    expect(names).toContain("grep_app")
  })

  test("excludes single disabled MCP", () => {
    const mcps = getMcpServers(["websearch"])
    const names = Object.keys(mcps)
    
    expect(names).not.toContain("websearch")
    expect(names).toContain("context7")
    expect(names).toContain("grep_app")
  })

  test("excludes multiple disabled MCPs", () => {
    const mcps = getMcpServers(["websearch", "grep_app"])
    const names = Object.keys(mcps)
    
    expect(names).not.toContain("websearch")
    expect(names).not.toContain("grep_app")
    expect(names).toContain("context7")
    expect(names.length).toBe(1)
  })

  test("excludes all MCPs when all disabled", () => {
    const mcps = getMcpServers(["websearch", "context7", "grep_app"])
    const names = Object.keys(mcps)
    
    expect(names.length).toBe(0)
  })

  test("ignores unknown MCP names in disabled list", () => {
    const mcps = getMcpServers(["unknown_mcp", "nonexistent"])
    const names = Object.keys(mcps)
    
    // All valid MCPs should still be present
    expect(names.length).toBe(3)
    expect(names).toContain("websearch")
    expect(names).toContain("context7")
    expect(names).toContain("grep_app")
  })

  test("MCP configs have required properties", () => {
    const mcps = getMcpServers()
    
    for (const [name, config] of Object.entries(mcps)) {
      expect(config).toBeDefined()
      // Each MCP should have either url (remote) or command (local)
      const hasUrl = "url" in config
      const hasCommand = "command" in config
      expect(hasUrl || hasCommand).toBe(true)
    }
  })

  test("websearch MCP has correct structure", () => {
    const mcps = getMcpServers()
    const websearch = mcps.websearch
    
    expect(websearch).toBeDefined()
    expect("url" in websearch).toBe(true)
  })

  test("context7 MCP has correct structure", () => {
    const mcps = getMcpServers()
    const context7 = mcps.context7
    
    expect(context7).toBeDefined()
    expect("url" in context7).toBe(true)
  })

  test("grep_app MCP has correct structure", () => {
    const mcps = getMcpServers()
    const grep_app = mcps.grep_app
    
    expect(grep_app).toBeDefined()
    expect("url" in grep_app).toBe(true)
  })
})
