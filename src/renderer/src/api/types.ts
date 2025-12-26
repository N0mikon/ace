/**
 * API Types for ACE
 * These interfaces mirror the preload APIs but are transport-agnostic.
 * Used by both IPC (Electron) and WebSocket (browser) implementations.
 */

// Terminal API Types
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

// Config API Types
export interface AceConfig {
  general: {
    theme: 'dark' | 'light'
  }
  shell: {
    path: string
    args: string[]
    fallback: string
  }
  terminal: {
    fontFamily: string
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
  hotkeys: {
    bindings: HotkeyEntry[]
  }
  quickCommands: QuickCommand[]
  server: {
    enabled: boolean
    port: number
  }
}

export interface QuickCommand {
  name: string
  command: string
  hotkey?: string
  icon?: string
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

// Session API Types
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

// Log API Types
export interface LogAPI {
  save: (description: string) => Promise<{ success: boolean; filepath?: string; error?: string }>
}

// Agent API Types
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
  listGlobal: () => Promise<Agent[]>
  listDefaults: () => Promise<Agent[]>
  listAllAvailable: () => Promise<Agent[]>
  get: (id: string) => Promise<Agent | undefined>
  getPrompt: (id: string) => Promise<string | undefined>
  openFile: (id: string) => Promise<boolean>
  readFile: (id: string) => Promise<{ success: boolean; content?: string; filePath?: string; error?: string }>
  saveFile: (id: string, content: string) => Promise<{ success: boolean; error?: string }>
  create: (name: string, description: string, promptText: string) => Promise<{ success: boolean; filePath?: string }>
  reload: () => Promise<Agent[]>
  copyToProject: (agentId: string, projectPath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  getGlobalDirectory: () => Promise<string>
  onChanged: (callback: () => void) => () => void
}

// Hotkey API Types
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

export interface AppActionInfo {
  id: AppAction
  description: string
}

export interface HotkeyEntry {
  accelerator: string
  action: {
    type: 'command' | 'agent' | 'app'
    command?: string
    agentId?: string
    appAction?: string
  }
  description: string
}

export interface HotkeyAPI {
  list: () => Promise<HotkeyBinding[]>
  getAppActions: () => Promise<AppActionInfo[]>
  getEntries: () => Promise<HotkeyEntry[]>
  add: (
    accelerator: string,
    action: { type: string; command?: string; agentId?: string; appAction?: string },
    description: string
  ) => Promise<{ success: boolean; id?: string; error?: string }>
  remove: (id: string) => Promise<{ success: boolean }>
  update: (id: string, accelerator: string) => Promise<{ success: boolean; error?: string }>
  clearAll: () => Promise<{ success: boolean }>
  loadEntries: (entries: HotkeyEntry[]) => Promise<{ success: boolean }>
  setEnabled: (enabled: boolean) => Promise<{ success: boolean }>
  validate: (accelerator: string) => Promise<{ valid: boolean; conflict?: string }>
  onTriggered: (callback: (data: HotkeyTriggerData) => void) => () => void
}

// MCP API Types
export interface McpServerInfo {
  name: string
  command: string
  args: string[]
  status: 'configured' | 'unknown'
  toolCount?: number
}

export interface McpAPI {
  getServers: () => Promise<McpServerInfo[]>
  getGlobalServers: () => Promise<McpServerInfo[]>
  getServer: (name: string) => Promise<McpServerInfo | undefined>
  getConfigPath: () => Promise<string>
  isLoaded: () => Promise<boolean>
  setConfigPath: (path: string) => Promise<{ success: boolean }>
  setProjectPath: (projectPath: string | null) => Promise<{ success: boolean }>
  copyToProject: (serverName: string, projectPath: string) => Promise<{ success: boolean; error?: string }>
  reload: () => Promise<McpServerInfo[]>
  reloadProject: () => Promise<McpServerInfo[]>
  onChanged: (callback: () => void) => () => void
}

// Adapter API Types
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

// Project API Types
export interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

export interface LaunchOptions {
  bypassMode: boolean
  resume: boolean
  verbose: boolean
  printMode: boolean
}

export interface LaunchConfig {
  bypass_mode: boolean
  resume: boolean
  verbose: boolean
  print_mode: boolean
}

export interface AgentsConfig {
  include_global: boolean
}

export interface AceProjectConfig {
  project: {
    name: string
    path: string
  }
  launch: LaunchConfig
  agents: AgentsConfig
}

export interface ProjectLaunchedData {
  path: string
  options: LaunchOptions
  agentsDir: string | null
}

export interface ProjectAPI {
  getRecent: () => Promise<RecentProject[]>
  getCurrent: () => Promise<{ path: string; name: string }>
  addRecent: (projectPath: string) => Promise<void>
  removeRecent: (projectPath: string) => Promise<void>
  clearRecent: () => Promise<void>
  open: (projectPath: string) => Promise<{ success: boolean; error?: string }>
  hasConfig: (projectPath: string) => Promise<boolean>
  loadConfig: (projectPath: string) => Promise<AceProjectConfig | null>
  saveConfig: (projectPath: string, config: Partial<AceProjectConfig>) => Promise<void>
  initializeAce: (projectPath: string) => Promise<void>
  openDialog: () => Promise<string | null>
  launch: (projectPath: string, options: LaunchOptions) => Promise<void>
  onLaunched: (callback: (data: ProjectLaunchedData) => void) => () => void
}

// Server API Types (for status bar control)
export interface ServerState {
  running: boolean
  port: number
  clients: number
}

export interface ServerAPI {
  start: () => Promise<{ success: boolean; port?: number; error?: string }>
  stop: () => Promise<{ success: boolean }>
  isRunning: () => Promise<{ running: boolean; port?: number }>
  getPort: () => Promise<number>
  getClientCount: () => Promise<number>
  onStateChanged: (callback: (state: ServerState) => void) => () => void
}

// Combined API interface
export interface ACEAPI {
  terminal: TerminalAPI
  config: ConfigAPI
  session: SessionAPI
  log: LogAPI
  agents: AgentAPI
  hotkeys: HotkeyAPI
  mcp: McpAPI
  adapters: AdapterAPI
  projects: ProjectAPI
  server: ServerAPI
}
