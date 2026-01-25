export type BooleanArg = "yes" | "no"

export interface InstallArgs {
  tui: boolean
  antigravity?: BooleanArg
  openai?: BooleanArg
  zai?: BooleanArg
  copilot?: BooleanArg
  tmux?: BooleanArg
  packageName?: string
}

export interface OpenCodeConfig {
  plugin?: string[]
  provider?: Record<string, unknown>
  agent?: Record<string, unknown>
  [key: string]: unknown
}

export interface InstallConfig {
  hasAntigravity: boolean
  hasOpenAI: boolean
  hasZai: boolean
  hasCopilot: boolean
  hasOpencodeZen: boolean
  hasTmux: boolean
  packageName?: string
}

export interface ConfigMergeResult {
  success: boolean
  configPath: string
  error?: string
}

export interface DetectedConfig {
  isInstalled: boolean
  hasAntigravity: boolean
  hasOpenAI: boolean
  hasZai: boolean
  hasCopilot: boolean
  hasOpencodeZen: boolean
  hasTmux: boolean
}
