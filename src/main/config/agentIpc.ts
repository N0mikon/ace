/**
 * IPC handlers for agent system
 */

import { ipcMain, BrowserWindow } from 'electron'
import { agentManager, Agent } from './agents'

/**
 * Register agent-related IPC handlers
 */
export function registerAgentIPC(mainWindow: BrowserWindow): void {
  // List project agents only (for Agent Panel)
  ipcMain.handle('agents:list', async (): Promise<Agent[]> => {
    return agentManager.list()
  })

  // List global agents (user's custom agents)
  ipcMain.handle('agents:listGlobal', async (): Promise<Agent[]> => {
    return agentManager.listGlobal()
  })

  // List default agents from resources
  ipcMain.handle('agents:listDefaults', async (): Promise<Agent[]> => {
    return agentManager.listDefaults()
  })

  // List all available agents for selection (global + defaults)
  ipcMain.handle('agents:listAllAvailable', async (): Promise<Agent[]> => {
    return agentManager.listAllAvailable()
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

  // Copy agent to project directory
  ipcMain.handle(
    'agents:copyToProject',
    async (
      _event,
      agentId: string,
      projectPath: string
    ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      return agentManager.copyToProject(agentId, projectPath)
    }
  )

  // Get global agents directory
  ipcMain.handle('agents:getGlobalDirectory', async (): Promise<string> => {
    return agentManager.getGlobalDirectory()
  })

  // Set up change notification
  agentManager.onAgentsChanged(() => {
    mainWindow.webContents.send('agents:changed')
  })
}
