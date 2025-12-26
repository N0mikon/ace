/**
 * ACE Configuration Types
 */

export interface GeneralConfig {
  theme: 'dark' | 'light'
}

export interface ShellConfig {
  path: string
  args: string[]
  fallback: string
}

export interface TerminalConfig {
  fontFamily: string
  fontSize?: number
  scrollback?: number
  cursorStyle?: 'block' | 'underline' | 'bar'
  cursorBlink?: boolean
}

export interface ClaudeCodeConfig {
  configPath: string
  mcpConfig: string
}

export interface LoggingConfig {
  enabled: boolean
  directory: string
  format: 'markdown' | 'txt'
  autoExport: boolean
}

export interface AgentsConfig {
  globalDirectory: string
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

export interface HotkeysConfig {
  bindings: HotkeyEntry[]
}

export interface ServerConfig {
  enabled: boolean
  port: number
}

export interface QuickCommand {
  name: string
  command: string
  hotkey?: string
  icon?: string
}

export interface AceConfig {
  general: GeneralConfig
  shell: ShellConfig
  terminal: TerminalConfig
  claudeCode: ClaudeCodeConfig
  logging: LoggingConfig
  agents: AgentsConfig
  hotkeys: HotkeysConfig
  server: ServerConfig
  quickCommands: QuickCommand[]
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AceConfig = {
  general: {
    theme: 'dark'
  },
  shell: {
    path: '',  // Auto-detect
    args: [],
    fallback: 'cmd.exe'
  },
  terminal: {
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace"
  },
  claudeCode: {
    configPath: '%USERPROFILE%\\.claude\\',
    mcpConfig: '%USERPROFILE%\\.claude\\mcp.json'
  },
  logging: {
    enabled: true,
    directory: '',  // Defaults to %APPDATA%/ace/logs/
    format: 'markdown',
    autoExport: true
  },
  agents: {
    globalDirectory: ''  // Defaults to %APPDATA%/ace/agents/
  },
  hotkeys: {
    bindings: []
  },
  server: {
    enabled: true,
    port: 3456
  },
  quickCommands: [
    { name: 'Exit', command: '/exit', icon: '⏹' },
    { name: 'Compact', command: '/compact', icon: '📦' },
    { name: 'Clear', command: '/clear', icon: '🗑' },
    { name: 'Help', command: '/help', icon: '❓' },
    { name: 'Cost', command: '/cost', icon: '💰' },
    { name: 'Retry', command: '/retry', icon: '🔄' }
  ]
}
