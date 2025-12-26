/**
 * Hotkey system exports and IPC handlers
 */

import { ipcMain, BrowserWindow } from 'electron'
import { hotkeyManager, APP_ACTIONS } from './manager'
import type { HotkeyAction, HotkeyEntry } from './manager'

export { hotkeyManager, APP_ACTIONS } from './manager'
export type { HotkeyBinding, HotkeyAction, AppAction, HotkeyEntry } from './manager'

/**
 * Register hotkey-related IPC handlers
 */
export function registerHotkeyIPC(_mainWindow: BrowserWindow): void {
  // Get all current bindings
  ipcMain.handle('hotkeys:list', async () => {
    return hotkeyManager.getBindings()
  })

  // Get available app actions
  ipcMain.handle('hotkeys:getAppActions', async () => {
    return APP_ACTIONS
  })

  // Get bindings as entries (for config)
  ipcMain.handle('hotkeys:getEntries', async () => {
    return hotkeyManager.getBindingsAsEntries()
  })

  // Add a new hotkey binding
  ipcMain.handle(
    'hotkeys:add',
    async (
      _event,
      accelerator: string,
      action: HotkeyAction,
      description: string
    ): Promise<{ success: boolean; id?: string; error?: string }> => {
      return hotkeyManager.addBinding(accelerator, action, description)
    }
  )

  // Remove a hotkey binding
  ipcMain.handle(
    'hotkeys:remove',
    async (_event, id: string): Promise<{ success: boolean }> => {
      const success = hotkeyManager.removeBinding(id)
      return { success }
    }
  )

  // Update a hotkey binding
  ipcMain.handle(
    'hotkeys:update',
    async (_event, id: string, accelerator: string): Promise<{ success: boolean; error?: string }> => {
      return hotkeyManager.updateBinding(id, accelerator)
    }
  )

  // Clear all hotkeys
  ipcMain.handle('hotkeys:clearAll', async (): Promise<{ success: boolean }> => {
    hotkeyManager.unregisterAll()
    return { success: true }
  })

  // Load hotkeys from entries
  ipcMain.handle(
    'hotkeys:loadEntries',
    async (_event, entries: HotkeyEntry[]): Promise<{ success: boolean }> => {
      hotkeyManager.registerFromEntries(entries)
      return { success: true }
    }
  )

  // Enable/disable hotkeys
  ipcMain.handle('hotkeys:setEnabled', async (_event, enabled: boolean): Promise<{ success: boolean }> => {
    hotkeyManager.setEnabled(enabled)
    return { success: true }
  })

  // Validate an accelerator
  ipcMain.handle('hotkeys:validate', async (_event, accelerator: string): Promise<{ valid: boolean; conflict?: string }> => {
    const valid = hotkeyManager.isValidAccelerator(accelerator)
    if (!valid) {
      return { valid: false }
    }

    const conflict = hotkeyManager.hasConflict(accelerator)
    return { valid: true, conflict: conflict || undefined }
  })
}
