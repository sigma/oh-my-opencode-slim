import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, isAbsolute } from "node:path"

export function getConfigDir(): string {
  // Keep this aligned with OpenCode itself and the plugin config loader:
  // base dir is $XDG_CONFIG_HOME (if set) else ~/.config, and OpenCode config lives under /opencode.
  const userConfigDir = process.env.XDG_CONFIG_HOME
    ? process.env.XDG_CONFIG_HOME
    : join(homedir(), ".config")

  return join(userConfigDir, "opencode")
}

export function getOpenCodeConfigPaths(): string[] {
  const configDir = getConfigDir()
  return [
    join(configDir, "opencode.json"),
    join(configDir, "opencode.jsonc"),
  ]
}

export function getConfigJson(): string {
  return join(getConfigDir(), "opencode.json")
}

export function getConfigJsonc(): string {
  return join(getConfigDir(), "opencode.jsonc")
}

export function getLiteConfig(packageName: string): string {
  let name = packageName
  if (isAbsolute(packageName)) {
    try {
      const pkgPath = join(packageName, "package.json")
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
        if (pkg.name) name = pkg.name
      }
    } catch (e) {
      // ignore
    }
  }
  const sanitized = name.replace(/^@/, "").replace(/\//g, "-")
  return join(getConfigDir(), `${sanitized}.json`)
}

export function getExistingConfigPath(): string {
  const jsonPath = getConfigJson()
  if (existsSync(jsonPath)) return jsonPath

  const jsoncPath = getConfigJsonc()
  if (existsSync(jsoncPath)) return jsoncPath

  return jsonPath
}

export function ensureConfigDir(): void {
  const configDir = getConfigDir()
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}
