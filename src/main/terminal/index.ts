import { ipcMain, BrowserWindow } from 'electron'
import { mainPty, PtyOptions } from './pty'
import { getShellConfig } from './shell'
import { sessionLogger } from '../storage'
import { configManager } from '../config'

/**
 * Registers all terminal-related IPC handlers
 */
export function registerTerminalIPC(mainWindow: BrowserWindow): void {
  // Spawn terminal
  ipcMain.handle('terminal:spawn', async (_event, options?: PtyOptions) => {
    const success = mainPty.spawn(options)

    // Start session logging if enabled and spawn was successful
    if (success) {
      const config = configManager.getConfig()
      if (config.logging.enabled) {
        const shellConfig = getShellConfig(options?.shell)
        const projectPath = options?.cwd || process.cwd()
        sessionLogger.startSession(projectPath, shellConfig.path)
      }
    }

    return { success }
  })

  // Write to terminal
  ipcMain.handle('terminal:write', async (_event, data: string) => {
    mainPty.write(data)
    return { success: true }
  })

  // Resize terminal
  ipcMain.handle('terminal:resize', async (_event, cols: number, rows: number) => {
    mainPty.resize(cols, rows)
    return { success: true }
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', async () => {
    // End session logging
    if (sessionLogger.isLogging()) {
      sessionLogger.endSession()
    }
    mainPty.kill()
    return { success: true }
  })

  // Check if terminal is running
  ipcMain.handle('terminal:isRunning', async () => {
    return { running: mainPty.isRunning() }
  })

  // Forward PTY data to renderer and log it
  mainPty.on('data', (data: string) => {
    // Log to session
    sessionLogger.log(data)

    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', data)
    }
  })

  // Forward PTY exit to renderer
  mainPty.on('exit', (info: { exitCode: number; signal?: number }) => {
    // End session logging
    if (sessionLogger.isLogging()) {
      sessionLogger.endSession()
    }

    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', info)
    }
  })

  // Cleanup on window close
  mainWindow.on('closed', () => {
    // End session logging
    if (sessionLogger.isLogging()) {
      sessionLogger.endSession()
    }
    mainPty.kill()
  })
}

export { mainPty } from './pty'
export { detectShell, getShellConfig } from './shell'
