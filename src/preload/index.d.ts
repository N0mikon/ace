import { ElectronAPI } from '@electron-toolkit/preload'

export interface TerminalSpawnOptions {
  cols?: number
  rows?: number
  cwd?: string
}

export interface TerminalSpawnResult {
  success: boolean
}

export interface TerminalExitInfo {
  exitCode: number
  signal?: number
}

export interface TerminalAPI {
  spawn: (options?: TerminalSpawnOptions) => Promise<TerminalSpawnResult>
  write: (data: string) => Promise<{ success: boolean }>
  resize: (cols: number, rows: number) => Promise<{ success: boolean }>
  kill: () => Promise<{ success: boolean }>
  isRunning: () => Promise<{ running: boolean }>
  onData: (callback: (data: string) => void) => () => void
  onExit: (callback: (info: TerminalExitInfo) => void) => () => void
}

export interface AceConfig {
  general: {
    theme: 'dark' | 'light'
    accentColor: string
  }
  shell: {
    path: string
    args: string[]
    fallback: string
  }
  terminal: {
    fontFamily: string
    fontSize: number
    scrollback: number
    cursorStyle: 'block' | 'underline' | 'bar'
    cursorBlink: boolean
  }
  claudeCode: {
    configPath: string
    mcpConfig: string
  }
  logging: {
    enabled: boolean
    directory: string
    format: 'markdown' | 'txt'
    autoExport: boolean
  }
  agents: {
    globalDirectory: string
  }
  hotkeys: Record<string, string>
  quickCommands: Array<{
    name: string
    command: string
    hotkey?: string
    icon?: string
  }>
}

export interface ConfigAPI {
  get: () => Promise<AceConfig>
  getValue: <T>(path: string) => Promise<T | undefined>
  set: (path: string, value: unknown) => Promise<{ success: boolean }>
  update: (updates: Partial<AceConfig>) => Promise<{ success: boolean; config: AceConfig }>
  isFirstRun: () => Promise<boolean>
  getPaths: () => Promise<{ configDir: string; configFile: string }>
  reload: () => Promise<AceConfig>
}

export interface SessionMeta {
  id: number
  startTime: string
  endTime: string | null
  duration: number | null
  projectPath: string
  shell: string
  lineCount: number
}

export interface SessionRecord extends SessionMeta {
  transcript: string
  metadata: string
}

export interface SessionAPI {
  list: (limit?: number, offset?: number) => Promise<SessionMeta[]>
  get: (sessionId: number) => Promise<SessionRecord | null>
  search: (query: string, limit?: number) => Promise<SessionMeta[]>
  delete: (sessionId: number) => Promise<{ success: boolean }>
  export: (sessionId: number) => Promise<{ success: boolean; filepath?: string }>
  current: () => Promise<{ sessionId: number | null }>
  count: () => Promise<{ count: number }>
}

export interface AgentDefinition {
  name: string
  description: string
  hotkey?: string
  icon?: string
}

export interface AgentPrompt {
  text: string
}

export interface AgentOptions {
  suggestedTools?: string[]
  contextNotes?: string
}

export interface Agent {
  id: string
  filePath: string
  agent: AgentDefinition
  prompt: AgentPrompt
  options?: AgentOptions
}

export interface AgentAPI {
  list: () => Promise<Agent[]>
  get: (id: string) => Promise<Agent | undefined>
  getPrompt: (id: string) => Promise<string | undefined>
  openFile: (id: string) => Promise<boolean>
  create: (
    name: string,
    description: string,
    promptText: string
  ) => Promise<{ success: boolean; filePath?: string }>
  reload: () => Promise<Agent[]>
  onChanged: (callback: () => void) => () => void
}

export type HotkeyActionType = 'command' | 'agent' | 'app'

export type AppAction =
  | 'toggleLeftPanel'
  | 'toggleRightPanel'
  | 'toggleTopPanel'
  | 'toggleBottomPanel'
  | 'focusTerminal'
  | 'openSettings'
  | 'newSession'
  | 'exportSession'

export interface HotkeyAction {
  type: HotkeyActionType
  command?: string
  agentId?: string
  action?: AppAction
}

export interface HotkeyBinding {
  id: string
  accelerator: string
  description: string
  action: HotkeyAction
}

export interface HotkeyTriggerData {
  id: string
  action: HotkeyAction
}

export interface HotkeyAPI {
  list: () => Promise<HotkeyBinding[]>
  getDefaults: () => Promise<Record<string, string>>
  getDescriptions: () => Promise<Record<string, string>>
  getCustom: () => Promise<Record<string, string>>
  update: (id: string, accelerator: string) => Promise<{ success: boolean; error?: string }>
  reset: (id: string) => Promise<{ success: boolean }>
  resetAll: () => Promise<{ success: boolean }>
  setEnabled: (enabled: boolean) => Promise<{ success: boolean }>
  validate: (accelerator: string) => Promise<{ valid: boolean; conflict?: string }>
  onTriggered: (callback: (data: HotkeyTriggerData) => void) => () => void
}

export interface McpServerInfo {
  name: string
  command: string
  args: string[]
  status: 'configured' | 'unknown'
  toolCount?: number
}

export interface McpAPI {
  getServers: () => Promise<McpServerInfo[]>
  getServer: (name: string) => Promise<McpServerInfo | undefined>
  getConfigPath: () => Promise<string>
  isLoaded: () => Promise<boolean>
  setConfigPath: (path: string) => Promise<{ success: boolean }>
  reload: () => Promise<McpServerInfo[]>
  onChanged: (callback: () => void) => () => void
}

// Tool Adapter types
export interface AdapterInfo {
  name: string
  version?: string
  description?: string
  launchCommand: string
  detectPattern?: string
}

export interface ToolAdapter {
  id: string
  filePath: string
  adapter: AdapterInfo
  commands: Record<string, string>
  flags: Record<string, string>
  patterns: Record<string, string>
  shortcuts: Record<string, string>
}

export interface AdapterAPI {
  list: () => Promise<ToolAdapter[]>
  get: (id: string) => Promise<ToolAdapter | undefined>
  getActive: () => Promise<ToolAdapter | undefined>
  getActiveId: () => Promise<string>
  setActive: (id: string) => Promise<{ success: boolean; error?: string }>
  getCommand: (commandName: string) => Promise<string | undefined>
  getFlag: (flagName: string) => Promise<string | undefined>
  getLaunchCommand: () => Promise<string>
  getLaunchCommandWithFlags: (flags: string[]) => Promise<string>
  reload: () => Promise<ToolAdapter[]>
}

// Project types
export interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

export interface ProjectAPI {
  getRecent: () => Promise<RecentProject[]>
  getCurrent: () => Promise<{ path: string; name: string }>
  addRecent: (projectPath: string) => Promise<void>
  removeRecent: (projectPath: string) => Promise<void>
  clearRecent: () => Promise<void>
  open: (projectPath: string) => Promise<{ success: boolean; error?: string }>
  hasConfig: (projectPath: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    terminal: TerminalAPI
    config: ConfigAPI
    session: SessionAPI
    agents: AgentAPI
    hotkeys: HotkeyAPI
    mcp: McpAPI
    adapters: AdapterAPI
    projects: ProjectAPI
    api: unknown
  }
}
