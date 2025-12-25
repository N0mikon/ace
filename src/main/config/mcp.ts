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
  private globalServers: Map<string, McpServerInfo> = new Map()
  private projectServers: Map<string, McpServerInfo> = new Map()
  private currentProjectPath: string | null = null
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
      this.loadGlobal()
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
      this.loadGlobal()
      this.watchConfig()
    } else {
      this.globalServers.clear()
    }
  }

  /**
   * Set the current project path and load project MCP servers
   */
  async setProjectPath(projectPath: string | null): Promise<void> {
    this.currentProjectPath = projectPath
    await this.loadProjectServers()
  }

  /**
   * Set callback for config changes
   */
  onConfigChanged(callback: () => void): void {
    this.changeCallback = callback
  }

  /**
   * Get project-specific MCP servers (for McpPanel)
   */
  getServers(): McpServerInfo[] {
    return Array.from(this.projectServers.values())
  }

  /**
   * Get all global MCP servers (for wizard selection)
   */
  getGlobalServers(): McpServerInfo[] {
    return Array.from(this.globalServers.values())
  }

  /**
   * Get a specific server by name (searches project first, then global)
   */
  getServer(name: string): McpServerInfo | undefined {
    return this.projectServers.get(name) || this.globalServers.get(name)
  }

  /**
   * Copy a global MCP server to the current project
   */
  async copyToProject(
    serverName: string,
    projectPath: string
  ): Promise<{ success: boolean; error?: string }> {
    const server = this.globalServers.get(serverName)
    if (!server) {
      return { success: false, error: `Server not found: ${serverName}` }
    }

    // Import projectConfigManager here to avoid circular dependency
    const { projectConfigManager } = await import('../projects/config')

    try {
      await projectConfigManager.addMcpServer(projectPath, serverName, {
        command: server.command,
        args: server.args
      })
      // Reload project servers
      await this.loadProjectServers()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
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
    return this.configPath !== '' && this.globalServers.size > 0
  }

  /**
   * Reload config from disk
   */
  reload(): void {
    this.loadGlobal()
  }

  /**
   * Reload project servers
   */
  async reloadProject(): Promise<void> {
    await this.loadProjectServers()
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

  private loadGlobal(): void {
    if (!this.configPath || !fs.existsSync(this.configPath)) {
      this.globalServers.clear()
      return
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8')
      const config = JSON.parse(content) as McpConfig

      this.globalServers.clear()

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          this.globalServers.set(name, {
            name,
            command: serverConfig.command,
            args: serverConfig.args || [],
            status: 'configured',
            // Tool count is unknown without connecting to the server
            toolCount: undefined
          })
        }
      }

      console.log(`Loaded ${this.globalServers.size} global MCP servers from config`)
    } catch (err) {
      console.error('Failed to parse MCP config:', err)
      this.globalServers.clear()
    }
  }

  private async loadProjectServers(): Promise<void> {
    this.projectServers.clear()

    if (!this.currentProjectPath) {
      return
    }

    try {
      // Import here to avoid circular dependency
      const { projectConfigManager } = await import('../projects/config')
      const servers = await projectConfigManager.getMcpServers(this.currentProjectPath)

      for (const [name, serverConfig] of Object.entries(servers)) {
        this.projectServers.set(name, {
          name,
          command: serverConfig.command,
          args: serverConfig.args || [],
          status: 'configured',
          toolCount: undefined
        })
      }

      console.log(`Loaded ${this.projectServers.size} project MCP servers`)
    } catch (err) {
      console.error('Failed to load project MCP servers:', err)
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
          this.loadGlobal()
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
