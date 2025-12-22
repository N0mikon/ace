/**
 * MCP (Model Context Protocol) configuration parser for ACE
 * Reads and watches Claude Code's MCP configuration file
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

// MCP server configuration types
export interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}

export interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>
}

export interface McpServerInfo {
  name: string
  command: string
  args: string[]
  status: 'configured' | 'unknown'
  toolCount?: number
}

class McpConfigManager {
  private configPath: string = ''
  private servers: Map<string, McpServerInfo> = new Map()
  private watcher: fs.FSWatcher | null = null
  private changeCallback: (() => void) | null = null

  /**
   * Initialize with the MCP config path
   */
  init(configPath?: string): void {
    // Try to find MCP config in common locations
    if (configPath && fs.existsSync(configPath)) {
      this.configPath = configPath
    } else {
      // Try common locations
      const possiblePaths = [
        // Windows paths
        path.join(app.getPath('home'), '.claude', 'claude_desktop_config.json'),
        path.join(app.getPath('home'), '.claude', 'mcp.json'),
        path.join(app.getPath('appData'), 'Claude', 'claude_desktop_config.json'),
        // Also check for custom path in ACE config
      ]

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          this.configPath = p
          break
        }
      }
    }

    if (this.configPath) {
      console.log(`MCP config found at: ${this.configPath}`)
      this.load()
      this.watchConfig()
    } else {
      console.log('MCP config not found')
    }
  }

  /**
   * Set the config path manually
   */
  setConfigPath(configPath: string): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    this.configPath = configPath

    if (configPath && fs.existsSync(configPath)) {
      this.load()
      this.watchConfig()
    } else {
      this.servers.clear()
    }
  }

  /**
   * Set callback for config changes
   */
  onConfigChanged(callback: () => void): void {
    this.changeCallback = callback
  }

  /**
   * Get all configured servers
   */
  getServers(): McpServerInfo[] {
    return Array.from(this.servers.values())
  }

  /**
   * Get a specific server by name
   */
  getServer(name: string): McpServerInfo | undefined {
    return this.servers.get(name)
  }

  /**
   * Get the current config path
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * Check if config is loaded
   */
  isLoaded(): boolean {
    return this.configPath !== '' && this.servers.size > 0
  }

  /**
   * Reload config from disk
   */
  reload(): void {
    this.load()
  }

  /**
   * Clean up watcher
   */
  dispose(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  // Private methods

  private load(): void {
    if (!this.configPath || !fs.existsSync(this.configPath)) {
      this.servers.clear()
      return
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8')
      const config = JSON.parse(content) as McpConfig

      this.servers.clear()

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          this.servers.set(name, {
            name,
            command: serverConfig.command,
            args: serverConfig.args || [],
            status: 'configured',
            // Tool count is unknown without connecting to the server
            toolCount: undefined
          })
        }
      }

      console.log(`Loaded ${this.servers.size} MCP servers from config`)
    } catch (err) {
      console.error('Failed to parse MCP config:', err)
      this.servers.clear()
    }
  }

  private watchConfig(): void {
    if (!this.configPath || !fs.existsSync(this.configPath)) {
      return
    }

    // Watch the config file for changes
    try {
      this.watcher = fs.watch(this.configPath, (_eventType, _filename) => {
        console.log('MCP config changed, reloading...')
        // Debounce to avoid multiple reloads
        setTimeout(() => {
          this.load()
          this.changeCallback?.()
        }, 100)
      })
    } catch (err) {
      console.error('Failed to watch MCP config:', err)
    }
  }
}

// Export singleton instance
export const mcpConfigManager = new McpConfigManager()
