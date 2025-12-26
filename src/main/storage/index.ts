import { ipcMain } from 'electron'
import { databaseManager } from './database'
import { sessionLogger } from './logger'

export { databaseManager } from './database'
export { sessionLogger } from './logger'
export type { SessionMeta, SessionRecord } from './database'

/**
 * Register session-related IPC handlers
 */
export function registerSessionIPC(): void {
  // Save log to file (new manual save)
  ipcMain.handle(
    'log:save',
    async (
      _event,
      description: string
    ): Promise<{ success: boolean; filepath?: string; error?: string }> => {
      return sessionLogger.saveLog(description)
    }
  )

  // Get current session ID (for backward compat)
  ipcMain.handle('session:current', async () => {
    return { sessionId: sessionLogger.getCurrentSessionId() }
  })

  // Legacy handlers - kept for backward compatibility but may not be fully functional
  ipcMain.handle('session:list', async (_event, limit?: number, offset?: number) => {
    return databaseManager.listSessions(limit, offset)
  })

  ipcMain.handle('session:get', async (_event, sessionId: number) => {
    return databaseManager.getSession(sessionId)
  })

  ipcMain.handle('session:search', async (_event, query: string, limit?: number) => {
    return databaseManager.searchSessions(query, limit)
  })

  ipcMain.handle('session:delete', async (_event, sessionId: number) => {
    return { success: databaseManager.deleteSession(sessionId) }
  })

  ipcMain.handle('session:export', async () => {
    return { success: false, error: 'Legacy export not supported' }
  })

  ipcMain.handle('session:count', async () => {
    return { count: databaseManager.getSessionCount() }
  })
}
