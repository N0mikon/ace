/**
 * IPC handlers for agent system
 */

import { ipcMain, BrowserWindow } from 'electron'
import { agentManager, Agent } from './agents'

/**
 * Register agent-related IPC handlers
 */
export function registerAgentIPC(mainWindow: BrowserWindow): void {
  // List all agents
  ipcMain.handle('agents:list', async (): Promise<Agent[]> => {
    return agentManager.list()
  })

  // Get specific agent
  ipcMain.handle('agents:get', async (_event, id: string): Promise<Agent | undefined> => {
    return agentManager.get(id)
  })

  // Get agent prompt text
  ipcMain.handle('agents:getPrompt', async (_event, id: string): Promise<string | undefined> => {
    return agentManager.getPrompt(id)
  })

  // Open agent file in editor
  ipcMain.handle('agents:openFile', async (_event, id: string): Promise<boolean> => {
    return agentManager.openFile(id)
  })

  // Create new agent
  ipcMain.handle(
    'agents:create',
    async (
      _event,
      name: string,
      description: string,
      promptText: string
    ): Promise<{ success: boolean; filePath?: string }> => {
      const filePath = agentManager.createAgent(name, description, promptText)
      return {
        success: filePath !== null,
        filePath: filePath || undefined
      }
    }
  )

  // Reload agents from disk
  ipcMain.handle('agents:reload', async (): Promise<Agent[]> => {
    agentManager.reload()
    return agentManager.list()
  })

  // Set up change notification
  agentManager.onAgentsChanged(() => {
    mainWindow.webContents.send('agents:changed')
  })
}
