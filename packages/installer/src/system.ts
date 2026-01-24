export async function isOpenCodeInstalled(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["opencode", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

export async function isTmuxInstalled(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["tmux", "-V"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

export async function isRgInstalled(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["rg", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

export async function isAstGrepInstalled(): Promise<boolean> {
  // Try 'sg' first
  try {
    const proc = Bun.spawn(["sg", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    if (proc.exitCode === 0) return true
  } catch {
    // Ignore error and try next
  }

  // Then try 'ast-grep'
  try {
    const proc = Bun.spawn(["ast-grep", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

export async function getOpenCodeVersion(): Promise<string | null> {
  try {
    const proc = Bun.spawn(["opencode", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    await proc.exited
    return proc.exitCode === 0 ? output.trim() : null
  } catch {
    return null
  }
}

export async function fetchLatestVersion(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`)
    if (!res.ok) return null
    const data = (await res.json()) as { version: string }
    return data.version
  } catch {
    return null
  }
}
