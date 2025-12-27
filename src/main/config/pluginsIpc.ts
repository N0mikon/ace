/**
 * IPC handlers for Plugins configuration
 */

import { ipcMain, BrowserWindow } from 'electron'
import { pluginsManager, Plugin } from './plugins'

/**
 * Register Plugins-related IPC handlers
 */
export function registerPluginsIPC(mainWindow: BrowserWindow): void {
  // Get all installed plugins (for PluginsPanel)
  ipcMain.handle('plugins:list', async (): Promise<Plugin[]> => {
    return pluginsManager.list()
  })

  // Get all global plugins (for wizard selection)
  ipcMain.handle('plugins:listGlobal', async (): Promise<Plugin[]> => {
    return pluginsManager.listGlobal()
  })

  // Toggle a plugin's enabled state
  ipcMain.handle(
    'plugins:toggle',
    async (_event, pluginId: string, enabled: boolean): Promise<{ success: boolean }> => {
      return pluginsManager.toggle(pluginId, enabled)
    }
  )

  // Install a plugin
  ipcMain.handle(
    'plugins:install',
    async (
      _event,
      pluginId: string,
      location: 'global' | 'project'
    ): Promise<{ success: boolean; error?: string }> => {
      return pluginsManager.install(pluginId, location)
    }
  )

  // Uninstall a plugin
  ipcMain.handle(
    'plugins:uninstall',
    async (_event, pluginId: string): Promise<{ success: boolean; error?: string }> => {
      return pluginsManager.uninstall(pluginId)
    }
  )

  // Reload plugins
  ipcMain.handle('plugins:reload', async (): Promise<Plugin[]> => {
    return pluginsManager.reload()
  })

  // Set up change notification
  pluginsManager.onChanged(() => {
    mainWindow.webContents.send('plugins:changed')
  })
}
