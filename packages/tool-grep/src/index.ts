import { resolveGrepCli } from "./constants"
export { grep } from "./tools"
export { runRg, runRgCount } from "./cli"
export { resolveGrepCli }
export type { GrepResult, GrepMatch, GrepOptions, CountResult } from "./types"

export function checkGrepAvailability(): boolean {
  const cli = resolveGrepCli()
  return cli.path !== "rg"
}
