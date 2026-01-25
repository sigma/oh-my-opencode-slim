#!/usr/bin/env bun
import { install } from "./install"
import type { InstallArgs, BooleanArg } from "./types"

function parseArgs(args: string[]): InstallArgs {
  const result: InstallArgs = {
    tui: true,
  }

  for (const arg of args) {
    if (arg === "--no-tui") {
      result.tui = false
    } else if (arg.startsWith("--antigravity=")) {
      result.antigravity = arg.split("=")[1] as BooleanArg
    } else if (arg.startsWith("--openai=")) {
      result.openai = arg.split("=")[1] as BooleanArg
    } else if (arg.startsWith("--zai=")) {
      result.zai = arg.split("=")[1] as BooleanArg
    } else if (arg.startsWith("--copilot=")) {
      result.copilot = arg.split("=")[1] as BooleanArg
    } else if (arg.startsWith("--tmux=")) {
      result.tmux = arg.split("=")[1] as BooleanArg
    } else if (arg === "-h" || arg === "--help") {
      printHelp()
      process.exit(0)
    } else if (!arg.startsWith("-")) {
      result.packageName = arg
    }
  }

  return result
}

function printHelp(): void {
  console.log(`
@firefly-swarm/installer

Usage: bunx @firefly-swarm/installer install [PACKAGE] [OPTIONS]

Arguments:
  PACKAGE                Package name to install (default: @firefly-swarm/default-network)

Options:
  --antigravity=yes|no   Antigravity subscription (yes/no)
  --openai=yes|no        OpenAI API access (yes/no)
  --zai=yes|no           Z.ai subscription (yes/no)
  --copilot=yes|no       GitHub Copilot access (yes/no)
  --tmux=yes|no          Enable tmux integration (yes/no)
  --no-tui               Non-interactive mode (requires all flags)
  -h, --help             Show this help message

Examples:
  bunx @firefly-swarm/installer install
  bunx @firefly-swarm/installer install @firefly-swarm/default-network
  bunx @firefly-swarm/installer install --no-tui --antigravity=yes --openai=yes --zai=no --copilot=no --tmux=no
`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === "install") {
    const installArgs = parseArgs(args.slice(args[0] === "install" ? 1 : 0))
    const exitCode = await install(installArgs)
    process.exit(exitCode)
  } else if (args[0] === "-h" || args[0] === "--help") {
    printHelp()
    process.exit(0)
  } else {
    console.error(`Unknown command: ${args[0]}`)
    console.error("Run with --help for usage information")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
