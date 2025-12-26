/**
 * Server Module
 * Main entry point for HTTP/WebSocket server
 */

import { ipcMain, BrowserWindow } from 'electron'
import { createHttpServer, startHttpServer, stopHttpServer } from './http'
import { createWebSocketServer, closeWebSocketServer, setServerPort } from './websocket'
import { clientManager } from './clientManager'
import { configManager } from '../config'

export { clientManager } from './clientManager'

let isRunning = false
let currentPort = 0

// Default port from config or fallback
const DEFAULT_PORT = 3456

// Start the server
export async function startServer(): Promise<{ success: boolean; port?: number; error?: string }> {
  if (isRunning) {
    return { success: true, port: currentPort }
  }

  try {
    // Get port from config or use default
    const configPort = configManager.get<number>('server.port') || DEFAULT_PORT

    // Create and start HTTP server
    const httpServer = createHttpServer()
    currentPort = await startHttpServer(configPort)
    setServerPort(currentPort)

    // Create WebSocket server attached to HTTP
    createWebSocketServer(httpServer)

    isRunning = true

    // Notify renderer about server state change
    notifyRendererServerState()

    console.log(`[Server] Started on port ${currentPort}`)
    return { success: true, port: currentPort }
  } catch (err) {
    console.error('[Server] Failed to start:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

// Stop the server
export async function stopServer(): Promise<{ success: boolean }> {
  if (!isRunning) {
    return { success: true }
  }

  try {
    closeWebSocketServer()
    await stopHttpServer()

    isRunning = false
    currentPort = 0

    // Notify renderer about server state change
    notifyRendererServerState()

    console.log('[Server] Stopped')
    return { success: true }
  } catch (err) {
    console.error('[Server] Failed to stop:', err)
    return { success: false }
  }
}

// Check if server is running
export function isServerRunning(): { running: boolean; port?: number } {
  return {
    running: isRunning,
    port: isRunning ? currentPort : undefined
  }
}

// Get current server port
export function getPort(): number {
  return currentPort
}

// Get number of connected clients
export function getClientCount(): number {
  return clientManager.getClientCount()
}

// Notify renderer about server state changes
function notifyRendererServerState(): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('server:state-changed', {
      running: isRunning,
      port: currentPort,
      clients: clientManager.getClientCount()
    })
  }
}

// Register IPC handlers for server control
export function registerServerIPC(): void {
  ipcMain.handle('server:start', async () => {
    return startServer()
  })

  ipcMain.handle('server:stop', async () => {
    return stopServer()
  })

  ipcMain.handle('server:isRunning', () => {
    return isServerRunning()
  })

  ipcMain.handle('server:getPort', () => {
    return getPort()
  })

  ipcMain.handle('server:getClientCount', () => {
    return getClientCount()
  })
}

// Initialize server based on config
export async function initServer(): Promise<void> {
  // Listen for client count changes to notify renderer
  clientManager.onClientCountChange(() => {
    notifyRendererServerState()
  })

  const enabled = configManager.get<boolean>('server.enabled')
  if (enabled !== false) { // Default to enabled if not set
    await startServer()
  }

  // Register IPC handlers
  registerServerIPC()
}
