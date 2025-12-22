/**
 * IPC handlers for MCP configuration
 */

import { ipcMain, BrowserWindow } from 'electron'
import { mcpConfigManager, McpServerInfo } from './mcp'

/**
 * Register MCP-related IPC handlers
 */
export function registerMcpIPC(mainWindow: BrowserWindow): void {
  // Get all MCP servers
  ipcMain.handle('mcp:getServers', async (): Promise<McpServerInfo[]> => {
    return mcpConfigManager.getServers()
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

  // Reload config
  ipcMain.handle('mcp:reload', async (): Promise<McpServerInfo[]> => {
    mcpConfigManager.reload()
    return mcpConfigManager.getServers()
  })

  // Set up change notification
  mcpConfigManager.onConfigChanged(() => {
    mainWindow.webContents.send('mcp:changed')
  })
}
