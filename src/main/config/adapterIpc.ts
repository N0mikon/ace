import { ipcMain } from 'electron'
import { adapterManager } from './adapters'
import type { ToolAdapter } from './adapters'

export function registerAdapterIpcHandlers(): void {
  // Get all available adapters
  ipcMain.handle('adapters:list', async (): Promise<ToolAdapter[]> => {
    return adapterManager.getAdapters()
  })

  // Get a specific adapter by ID
  ipcMain.handle('adapters:get', async (_, id: string): Promise<ToolAdapter | undefined> => {
    return adapterManager.getAdapter(id)
  })

  // Get the currently active adapter
  ipcMain.handle('adapters:getActive', async (): Promise<ToolAdapter | undefined> => {
    return adapterManager.getActiveAdapter()
  })

  // Get the active adapter ID
  ipcMain.handle('adapters:getActiveId', async (): Promise<string> => {
    return adapterManager.getActiveAdapterId()
  })

  // Set the active adapter
  ipcMain.handle(
    'adapters:setActive',
    async (_, id: string): Promise<{ success: boolean; error?: string }> => {
      const success = adapterManager.setActiveAdapter(id)
      if (!success) {
        return { success: false, error: `Adapter '${id}' not found` }
      }
      return { success: true }
    }
  )

  // Get a command string for the active adapter
  ipcMain.handle('adapters:getCommand', async (_, commandName: string): Promise<string | undefined> => {
    return adapterManager.getCommand(commandName)
  })

  // Get a flag string for the active adapter
  ipcMain.handle('adapters:getFlag', async (_, flagName: string): Promise<string | undefined> => {
    return adapterManager.getFlag(flagName)
  })

  // Get launch command
  ipcMain.handle('adapters:getLaunchCommand', async (): Promise<string> => {
    return adapterManager.getLaunchCommand()
  })

  // Get launch command with flags
  ipcMain.handle('adapters:getLaunchCommandWithFlags', async (_, flags: string[]): Promise<string> => {
    return adapterManager.getLaunchCommandWithFlags(flags)
  })

  // Reload adapters from disk
  ipcMain.handle('adapters:reload', async (): Promise<ToolAdapter[]> => {
    await adapterManager.loadAdapters()
    return adapterManager.getAdapters()
  })
}
