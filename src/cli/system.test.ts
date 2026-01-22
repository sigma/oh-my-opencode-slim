/// <reference types="bun-types" />

import { describe, expect, test, spyOn } from "bun:test"
import { isOpenCodeInstalled, isTmuxInstalled, getOpenCodeVersion, fetchLatestVersion } from "./system"

describe("system", () => {
  test("isOpenCodeInstalled returns boolean", async () => {
    // We don't necessarily want to depend on the host system
    // but for a basic test we can just check it returns a boolean
    const result = await isOpenCodeInstalled()
    expect(typeof result).toBe("boolean")
  })

  test("isTmuxInstalled returns boolean", async () => {
    const result = await isTmuxInstalled()
    expect(typeof result).toBe("boolean")
  })

  test("fetchLatestVersion returns version string or null", async () => {
    const mockFetch = spyOn(globalThis, "fetch").mockImplementation(async () => ({
      ok: true,
      json: async () => ({ version: "1.2.3" })
    }) as any)

    const version = await fetchLatestVersion("any-package")
    expect(version).toBe("1.2.3")

    mockFetch.mockRestore()
  })

  test("fetchLatestVersion returns null on error", async () => {
    const mockFetch = spyOn(globalThis, "fetch").mockImplementation(async () => ({
      ok: false
    }) as any)

    const version = await fetchLatestVersion("any-package")
    expect(version).toBeNull()

    mockFetch.mockRestore()
  })

  test("getOpenCodeVersion returns string or null", async () => {
    const version = await getOpenCodeVersion()
    if (version !== null) {
      expect(typeof version).toBe("string")
    } else {
      expect(version).toBeNull()
    }
  })
})
