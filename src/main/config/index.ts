import { ipcMain } from 'electron'
import { configManager } from './loader'
import { AceConfig } from './types'

export { configManager } from './loader'
export { agentManager } from './agents'
export { registerAgentIPC } from './agentIpc'
export { mcpConfigManager } from './mcp'
export { registerMcpIPC } from './mcpIpc'
export { adapterManager } from './adapters'
export { registerAdapterIpcHandlers } from './adapterIpc'
export * from './types'
export type { Agent, AgentDefinition, AgentPrompt, AgentOptions } from './agents'
export type { McpServerInfo, McpServerConfig, McpConfig } from './mcp'
export type { ToolAdapter, AdapterInfo, AdapterCommands, AdapterFlags } from './adapters'

/**
 * Register config-related IPC handlers
 */
export function registerConfigIPC(): void {
  // Get full config
  ipcMain.handle('config:get', async () => {
    return configManager.getConfig()
  })

  // Get specific config value
  ipcMain.handle('config:getValue', async (_event, path: string) => {
    return configManager.get(path)
  })

  // Set specific config value
  ipcMain.handle('config:set', async (_event, path: string, value: unknown) => {
    configManager.set(path, value)
    return { success: true }
  })

  // Update multiple config values
  ipcMain.handle('config:update', async (_event, updates: Partial<AceConfig>) => {
    // Merge updates into config
    for (const [section, values] of Object.entries(updates)) {
      if (typeof values === 'object' && values !== null) {
        for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
          configManager.set(`${section}.${key}`, value)
        }
      }
    }

    return { success: true, config: configManager.getConfig() }
  })

  // Check if first run
  ipcMain.handle('config:isFirstRun', async () => {
    return configManager.isFirstRun()
  })

  // Get config paths
  ipcMain.handle('config:getPaths', async () => {
    return {
      configDir: configManager.getConfigDir(),
      configFile: configManager.getConfigPath()
    }
  })

  // Reload config from disk
  ipcMain.handle('config:reload', async () => {
    configManager.load()
    return configManager.getConfig()
  })
}
