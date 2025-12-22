/**
 * Hotkey system exports and IPC handlers
 */

import { ipcMain, BrowserWindow } from 'electron'
import { hotkeyManager, DEFAULT_HOTKEYS, HOTKEY_DESCRIPTIONS } from './manager'

export { hotkeyManager, DEFAULT_HOTKEYS, HOTKEY_DESCRIPTIONS } from './manager'
export type { HotkeyBinding, HotkeyAction, AppAction } from './manager'

/**
 * Register hotkey-related IPC handlers
 */
export function registerHotkeyIPC(_mainWindow: BrowserWindow): void {
  // Get all current bindings
  ipcMain.handle('hotkeys:list', async () => {
    return hotkeyManager.getBindings()
  })

  // Get default hotkeys
  ipcMain.handle('hotkeys:getDefaults', async () => {
    return DEFAULT_HOTKEYS
  })

  // Get hotkey descriptions
  ipcMain.handle('hotkeys:getDescriptions', async () => {
    return HOTKEY_DESCRIPTIONS
  })

  // Get custom bindings
  ipcMain.handle('hotkeys:getCustom', async () => {
    return hotkeyManager.getCustomBindings()
  })

  // Update a hotkey binding
  ipcMain.handle(
    'hotkeys:update',
    async (_event, id: string, accelerator: string): Promise<{ success: boolean; error?: string }> => {
      // Validate accelerator
      if (!hotkeyManager.isValidAccelerator(accelerator)) {
        return { success: false, error: 'Invalid key combination' }
      }

      // Check for conflicts
      const conflict = hotkeyManager.hasConflict(accelerator, id)
      if (conflict) {
        return { success: false, error: `Conflicts with: ${HOTKEY_DESCRIPTIONS[conflict] || conflict}` }
      }

      const success = hotkeyManager.updateBinding(id, accelerator)
      return { success }
    }
  )

  // Reset a single hotkey to default
  ipcMain.handle('hotkeys:reset', async (_event, id: string): Promise<{ success: boolean }> => {
    const success = hotkeyManager.resetBinding(id)
    return { success }
  })

  // Reset all hotkeys to defaults
  ipcMain.handle('hotkeys:resetAll', async (): Promise<{ success: boolean }> => {
    hotkeyManager.resetAll()
    return { success: true }
  })

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
