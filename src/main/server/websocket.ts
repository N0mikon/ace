/**
 * WebSocket Server
 * Handles WebSocket connections and message routing
 */

import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { clientManager } from './clientManager'
import { handleRpcCall } from './apiBridge'
import {
  parseClientMessage,
  serializeMessage,
  type RpcResponse
} from './protocol'
import { mainPty } from '../terminal/pty'
import { configManager } from '../config'
import { projectManager } from '../projects'

let wss: WebSocketServer | null = null

// Create WebSocket server attached to HTTP server
export function createWebSocketServer(httpServer: ReturnType<typeof import('http').createServer>): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientId = clientManager.addClient(ws)
    console.log(`[WebSocket] Client connected from ${req.socket.remoteAddress}`)

    // Send initial sync state including current project
    const currentProject = projectManager.getCurrentProject()
    const syncState = {
      terminalRunning: mainPty.isRunning(),
      terminalBuffer: mainPty.getBuffer(),
      config: configManager.getConfig(),
      serverPort: getServerPort(),
      currentProject: currentProject ? {
        path: currentProject,
        name: projectManager.getCurrentProjectName()
      } : null
    }
    clientManager.sendSync(clientId, syncState)

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      const messageStr = data.toString()
      const message = parseClientMessage(messageStr)

      if (!message) {
        console.error('[WebSocket] Invalid message received:', messageStr)
        return
      }

      // Handle RPC request
      if (message.type === 'rpc') {
        let response: RpcResponse

        try {
          const result = await handleRpcCall(message.channel, message.args)
          response = {
            id: message.id,
            type: 'response',
            success: true,
            data: result
          }
        } catch (err) {
          response = {
            id: message.id,
            type: 'response',
            success: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }

        // Send response back to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(serializeMessage(response))
        }
      }
    })

    // Handle client disconnect
    ws.on('close', () => {
      clientManager.removeClient(clientId)
      console.log(`[WebSocket] Client disconnected: ${clientId}`)
    })

    // Handle errors
    ws.on('error', (err) => {
      console.error(`[WebSocket] Client ${clientId} error:`, err)
    })
  })

  wss.on('error', (err) => {
    console.error('[WebSocket] Server error:', err)
  })

  return wss
}

// Get WebSocket server instance
export function getWebSocketServer(): WebSocketServer | null {
  return wss
}

// Close WebSocket server
export function closeWebSocketServer(): void {
  if (wss) {
    clientManager.disconnectAll()
    wss.close()
    wss = null
    console.log('[WebSocket] Server closed')
  }
}

// Helper to get current server port (will be set by http.ts)
let serverPort = 0
export function setServerPort(port: number): void {
  serverPort = port
}
export function getServerPort(): number {
  return serverPort
}
