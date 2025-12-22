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
  // List sessions
  ipcMain.handle('session:list', async (_event, limit?: number, offset?: number) => {
    return databaseManager.listSessions(limit, offset)
  })

  // Get session by ID
  ipcMain.handle('session:get', async (_event, sessionId: number) => {
    return databaseManager.getSession(sessionId)
  })

  // Search sessions
  ipcMain.handle('session:search', async (_event, query: string, limit?: number) => {
    return databaseManager.searchSessions(query, limit)
  })

  // Delete session
  ipcMain.handle('session:delete', async (_event, sessionId: number) => {
    return { success: databaseManager.deleteSession(sessionId) }
  })

  // Export session to markdown
  ipcMain.handle('session:export', async (_event, sessionId: number) => {
    const filepath = sessionLogger.exportToMarkdown(sessionId)
    return { success: filepath !== null, filepath }
  })

  // Get current session ID
  ipcMain.handle('session:current', async () => {
    return { sessionId: sessionLogger.getCurrentSessionId() }
  })

  // Get session count
  ipcMain.handle('session:count', async () => {
    return { count: databaseManager.getSessionCount() }
  })
}
