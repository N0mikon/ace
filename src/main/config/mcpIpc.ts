/**
 * IPC handlers for MCP configuration
 */

import { ipcMain, BrowserWindow } from 'electron'
import { mcpConfigManager, McpServerInfo } from './mcp'

/**
 * Register MCP-related IPC handlers
 */
export function registerMcpIPC(mainWindow: BrowserWindow): void {
  // Get project MCP servers (for McpPanel)
  ipcMain.handle('mcp:getServers', async (): Promise<McpServerInfo[]> => {
    return mcpConfigManager.getServers()
  })

  // Get all global MCP servers (for wizard selection)
  ipcMain.handle('mcp:getGlobalServers', async (): Promise<McpServerInfo[]> => {
    return mcpConfigManager.getGlobalServers()
  })

  // Get a specific server
  ipcMain.handle('mcp:getServer', async (_event, name: string): Promise<McpServerInfo | undefined> => {
    return mcpConfigManager.getServer(name)
  })

  // Get config path
  ipcMain.handle('mcp:getConfigPath', async (): Promise<string> => {
    return mcpConfigManager.getConfigPath()
  })

  // Check if config is loaded
  ipcMain.handle('mcp:isLoaded', async (): Promise<boolean> => {
    return mcpConfigManager.isLoaded()
  })

  // Set config path
  ipcMain.handle('mcp:setConfigPath', async (_event, path: string): Promise<{ success: boolean }> => {
    mcpConfigManager.setConfigPath(path)
    return { success: true }
  })

  // Set project path (loads project MCP servers)
  ipcMain.handle('mcp:setProjectPath', async (_event, projectPath: string | null): Promise<{ success: boolean }> => {
    await mcpConfigManager.setProjectPath(projectPath)
    return { success: true }
  })

  // Copy a global MCP server to project
  ipcMain.handle(
    'mcp:copyToProject',
    async (
      _event,
      serverName: string,
      projectPath: string
    ): Promise<{ success: boolean; error?: string }> => {
      return mcpConfigManager.copyToProject(serverName, projectPath)
    }
  )

  // Reload global config
  ipcMain.handle('mcp:reload', async (): Promise<McpServerInfo[]> => {
    mcpConfigManager.reload()
    return mcpConfigManager.getServers()
  })

  // Reload project servers
  ipcMain.handle('mcp:reloadProject', async (): Promise<McpServerInfo[]> => {
    await mcpConfigManager.reloadProject()
    return mcpConfigManager.getServers()
  })

  // Set up change notification
  mcpConfigManager.onConfigChanged(() => {
    mainWindow.webContents.send('mcp:changed')
  })
}
