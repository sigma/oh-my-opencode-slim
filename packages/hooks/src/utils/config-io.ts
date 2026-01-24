import { homedir } from "node:os"
import { join } from "node:path"

export function getConfigDir(): string {
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

/**
 * Strip JSON comments (single-line // and multi-line) and trailing commas for JSONC support.
 */
export function stripJsonComments(json: string): string {
  const commentPattern = /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g
  const trailingCommaPattern = /\\"|"(?:\\"|[^"])*"|(,)(\s*[}\]])/g

  return json
    .replace(commentPattern, (match, commentGroup) => (commentGroup ? "" : match))
    .replace(trailingCommaPattern, (match, comma, closing) =>
      comma ? closing : match
    )
}
