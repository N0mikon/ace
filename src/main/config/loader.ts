import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as TOML from '@iarna/toml'
import { AceConfig, DEFAULT_CONFIG } from './types'

/**
 * Configuration Manager
 * Handles loading, saving, and accessing configuration
 */
class ConfigManager {
  private config: AceConfig
  private configPath: string
  private configDir: string

  constructor() {
    this.config = { ...DEFAULT_CONFIG }
    this.configDir = join(app.getPath('userData'), 'ace')
    this.configPath = join(this.configDir, 'config.toml')
  }

  /**
   * Initialize the config manager - call after app is ready
   */
  init(): void {
    this.ensureConfigDir()
    this.load()
  }

  /**
   * Ensure config directory exists
   */
  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true })
    }

    // Also create logs and agents directories
    const logsDir = join(this.configDir, 'logs')
    const agentsDir = join(this.configDir, 'agents')

    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
    }
    if (!existsSync(agentsDir)) {
      mkdirSync(agentsDir, { recursive: true })
    }

    // Set default paths if not set
    if (!this.config.logging.directory) {
      this.config.logging.directory = logsDir
    }
    if (!this.config.agents.globalDirectory) {
      this.config.agents.globalDirectory = agentsDir
    }
  }

  /**
   * Load configuration from disk
   */
  load(): void {
    if (!existsSync(this.configPath)) {
      console.log('No config file found, using defaults')
      this.save() // Create default config file
      return
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8')
      const parsed = TOML.parse(content) as Partial<AceConfig>

      // Deep merge with defaults
      this.config = this.deepMerge(DEFAULT_CONFIG, parsed)
      console.log('Config loaded from:', this.configPath)
    } catch (error) {
      console.error('Failed to load config:', error)
      console.log('Using default configuration')
      this.config = { ...DEFAULT_CONFIG }
    }
  }

  /**
   * Save configuration to disk
   */
  save(): void {
    try {
      // Convert config to TOML-compatible format
      const tomlConfig = this.configToToml(this.config)
      const content = TOML.stringify(tomlConfig as TOML.JsonMap)
      writeFileSync(this.configPath, content, 'utf-8')
      console.log('Config saved to:', this.configPath)
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  /**
   * Convert config to TOML-compatible format (handle naming conventions)
   */
  private configToToml(config: AceConfig): Record<string, unknown> {
    return {
      general: config.general,
      shell: config.shell,
      terminal: {
        font_family: config.terminal.fontFamily,
        font_size: config.terminal.fontSize,
        scrollback: config.terminal.scrollback,
        cursor_style: config.terminal.cursorStyle,
        cursor_blink: config.terminal.cursorBlink
      },
      claude_code: {
        config_path: config.claudeCode.configPath,
        mcp_config: config.claudeCode.mcpConfig
      },
      logging: {
        enabled: config.logging.enabled,
        directory: config.logging.directory,
        format: config.logging.format,
        auto_export: config.logging.autoExport
      },
      agents: {
        global_directory: config.agents.globalDirectory
      },
      hotkeys: config.hotkeys,
      quick_commands: config.quickCommands.map((cmd) => ({
        name: cmd.name,
        command: cmd.command,
        hotkey: cmd.hotkey,
        icon: cmd.icon
      }))
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: AceConfig, source: Partial<AceConfig>): AceConfig {
    const result = { ...target }

    for (const key of Object.keys(source) as Array<keyof AceConfig>) {
      const sourceValue = source[key]
      if (sourceValue !== undefined) {
        if (
          typeof sourceValue === 'object' &&
          sourceValue !== null &&
          !Array.isArray(sourceValue)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any)[key] = { ...(target[key] as object), ...(sourceValue as object) }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any)[key] = sourceValue
        }
      }
    }

    return result
  }

  /**
   * Get the full configuration
   */
  getConfig(): AceConfig {
    return { ...this.config }
  }

  /**
   * Get a specific config value by path (e.g., 'terminal.fontSize')
   */
  get<T>(path: string): T | undefined {
    const keys = path.split('.')
    let value: unknown = this.config

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }

    return value as T
  }

  /**
   * Set a specific config value by path
   */
  set(path: string, value: unknown): void {
    const keys = path.split('.')
    let obj: Record<string, unknown> = this.config as unknown as Record<string, unknown>

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {}
      }
      obj = obj[key] as Record<string, unknown>
    }

    obj[keys[keys.length - 1]] = value
    this.save()
  }

  /**
   * Check if this is first run (no Claude Code config set)
   */
  isFirstRun(): boolean {
    return !this.config.claudeCode.configPath
  }

  /**
   * Get config directory path
   */
  getConfigDir(): string {
    return this.configDir
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath
  }
}

// Singleton instance
export const configManager = new ConfigManager()
