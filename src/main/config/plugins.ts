/**
 * Plugins Manager for ACE
 * Manages Claude Code plugins that extend functionality
 *
 * Note: This is a stub implementation. The actual plugin system
 * will integrate with Claude Code's /plugins command structure.
 */

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author?: string
  enabled: boolean
  installed: boolean
  installLocation: 'global' | 'project'
  skills?: string[] // IDs of skills this plugin provides
  icon?: string
}

class PluginsManager {
  private globalPlugins: Map<string, Plugin> = new Map()
  private projectPlugins: Map<string, Plugin> = new Map()
  private currentProjectPath: string | null = null
  private changeCallback: (() => void) | null = null

  /**
   * Initialize the plugins manager
   */
  init(): void {
    this.loadGlobalPlugins()
  }

  /**
   * Set callback for plugin changes
   */
  onChanged(callback: () => void): void {
    this.changeCallback = callback
  }

  /**
   * Set the current project path
   */
  async setProjectPath(projectPath: string | null): Promise<void> {
    this.currentProjectPath = projectPath
    await this.loadProjectPlugins()
  }

  /**
   * Get all installed plugins (for PluginsPanel)
   */
  list(): Plugin[] {
    // Combine project and global plugins
    const plugins = new Map<string, Plugin>()

    // Add project plugins first (they take priority)
    for (const [id, plugin] of this.projectPlugins) {
      plugins.set(id, plugin)
    }

    // Add global plugins that aren't in project
    for (const [id, plugin] of this.globalPlugins) {
      if (!plugins.has(id)) {
        plugins.set(id, plugin)
      }
    }

    return Array.from(plugins.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get all global plugins (for wizard selection)
   */
  listGlobal(): Plugin[] {
    return Array.from(this.globalPlugins.values())
  }

  /**
   * Toggle a plugin's enabled state
   */
  async toggle(pluginId: string, enabled: boolean): Promise<{ success: boolean }> {
    const plugin = this.projectPlugins.get(pluginId) || this.globalPlugins.get(pluginId)
    if (plugin) {
      plugin.enabled = enabled
      // TODO: Persist to config and notify Claude Code
      this.changeCallback?.()
    }
    return { success: true }
  }

  /**
   * Install a plugin
   */
  async install(
    pluginId: string,
    location: 'global' | 'project'
  ): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement actual plugin installation via Claude Code CLI
    // This would run: /plugins install <pluginId>
    console.log(`Installing plugin ${pluginId} to ${location}`)
    return { success: true }
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement actual plugin uninstallation via Claude Code CLI
    // This would run: /plugins remove <pluginId>
    console.log(`Uninstalling plugin ${pluginId}`)

    // Remove from our maps
    this.projectPlugins.delete(pluginId)
    this.globalPlugins.delete(pluginId)
    this.changeCallback?.()

    return { success: true }
  }

  /**
   * Reload plugins from disk
   */
  async reload(): Promise<Plugin[]> {
    this.loadGlobalPlugins()
    await this.loadProjectPlugins()
    return this.list()
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.globalPlugins.clear()
    this.projectPlugins.clear()
  }

  // Private methods

  private loadGlobalPlugins(): void {
    // TODO: Parse Claude Code's global plugin configuration
    // For now, provide some example plugins
    const examples: Plugin[] = [
      {
        id: 'feature-dev',
        name: 'Feature Development',
        version: '1.0.0',
        description: 'Guided feature development with architecture focus',
        author: 'Anthropic',
        enabled: true,
        installed: true,
        installLocation: 'global',
        skills: ['code-architecture', 'code-review'],
        icon: '🏗️'
      },
      {
        id: 'frontend-design',
        name: 'Frontend Design',
        version: '1.0.0',
        description: 'Create distinctive, production-grade frontend interfaces',
        author: 'Anthropic',
        enabled: true,
        installed: true,
        installLocation: 'global',
        skills: ['ui-design', 'css-generation'],
        icon: '🎨'
      }
    ]

    this.globalPlugins.clear()
    for (const plugin of examples) {
      this.globalPlugins.set(plugin.id, plugin)
    }
  }

  private async loadProjectPlugins(): Promise<void> {
    this.projectPlugins.clear()

    if (!this.currentProjectPath) {
      return
    }

    try {
      // Import here to avoid circular dependency
      const { projectConfigManager } = await import('../projects/config')
      const plugins = await projectConfigManager.getPlugins(this.currentProjectPath)

      for (const plugin of plugins) {
        this.projectPlugins.set(plugin.id, plugin)
      }
    } catch (err) {
      // Project may not have plugin configuration yet
      console.log('No project plugins found:', err)
    }
  }
}

// Export singleton instance
export const pluginsManager = new PluginsManager()
