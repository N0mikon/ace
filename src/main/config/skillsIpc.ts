/**
 * IPC handlers for Skills configuration
 */

import { ipcMain, BrowserWindow } from 'electron'
import { skillsManager, Skill } from './skills'

/**
 * Register Skills-related IPC handlers
 */
export function registerSkillsIPC(mainWindow: BrowserWindow): void {
  // Get project skills (for SkillsPanel)
  ipcMain.handle('skills:list', async (): Promise<Skill[]> => {
    return skillsManager.list()
  })

  // Get all global skills (for wizard selection)
  ipcMain.handle('skills:listGlobal', async (): Promise<Skill[]> => {
    return skillsManager.listGlobal()
  })

  // Toggle a skill's enabled state
  ipcMain.handle(
    'skills:toggle',
    async (_event, skillId: string, enabled: boolean): Promise<{ success: boolean }> => {
      return skillsManager.toggle(skillId, enabled)
    }
  )

  // Reload skills
  ipcMain.handle('skills:reload', async (): Promise<Skill[]> => {
    return skillsManager.reload()
  })

  // Set up change notification
  skillsManager.onChanged(() => {
    mainWindow.webContents.send('skills:changed')
  })
}
