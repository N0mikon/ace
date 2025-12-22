/**
 * ACE Configuration Types
 */

export interface GeneralConfig {
  theme: 'dark' | 'light'
  accentColor: string
}

export interface ShellConfig {
  path: string
  args: string[]
  fallback: string
}

export interface TerminalConfig {
  fontFamily: string
  fontSize: number
  scrollback: number
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
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

export interface HotkeysConfig {
  exit: string
  compact: string
  clear: string
  help: string
  toggleSidebar: string
  focusTerminal: string
  [key: string]: string
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
  quickCommands: QuickCommand[]
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AceConfig = {
  general: {
    theme: 'dark',
    accentColor: '#007acc'
  },
  shell: {
    path: '',  // Auto-detect
    args: [],
    fallback: 'cmd.exe'
  },
  terminal: {
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
    fontSize: 14,
    scrollback: 10000,
    cursorStyle: 'block',
    cursorBlink: true
  },
  claudeCode: {
    configPath: '',  // User must set
    mcpConfig: ''    // User must set
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
    exit: 'Ctrl+Shift+E',
    compact: 'Ctrl+Shift+C',
    clear: 'Ctrl+Shift+K',
    help: 'Ctrl+Shift+H',
    toggleSidebar: 'Ctrl+Shift+B',
    focusTerminal: 'Ctrl+Shift+`'
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
