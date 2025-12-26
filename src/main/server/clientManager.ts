/**
 * Client Manager
 * Tracks connected WebSocket clients and broadcasts events
 */

import type { WebSocket } from 'ws'
import { serializeMessage, type ServerEvent, type SyncMessage } from './protocol'

interface ClientInfo {
  id: string
  ws: WebSocket
  connectedAt: Date
}

type ChangeCallback = (count: number) => void

class ClientManager {
  private clients: Map<string, ClientInfo> = new Map()
  private clientIdCounter = 0
  private changeCallbacks: Set<ChangeCallback> = new Set()

  // Register callback for client count changes
  onClientCountChange(callback: ChangeCallback): () => void {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }

  // Notify all change callbacks
  private notifyChange(): void {
    const count = this.clients.size
    for (const callback of this.changeCallbacks) {
      try {
        callback(count)
      } catch (err) {
        console.error('[Server] Error in change callback:', err)
      }
    }
  }

  // Add a new client
  addClient(ws: WebSocket): string {
    const id = `client-${++this.clientIdCounter}`
    this.clients.set(id, {
      id,
      ws,
      connectedAt: new Date()
    })
    console.log(`[Server] Client connected: ${id} (total: ${this.clients.size})`)
    this.notifyChange()
    return id
  }

  // Remove a client
  removeClient(id: string): void {
    if (this.clients.has(id)) {
      this.clients.delete(id)
      console.log(`[Server] Client disconnected: ${id} (total: ${this.clients.size})`)
      this.notifyChange()
    }
  }

  // Get client by ID
  getClient(id: string): ClientInfo | undefined {
    return this.clients.get(id)
  }

  // Get all client IDs
  getClientIds(): string[] {
    return Array.from(this.clients.keys())
  }

  // Get number of connected clients
  getClientCount(): number {
    return this.clients.size
  }

  // Send message to specific client
  sendToClient(clientId: string, message: string): boolean {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN = 1
      try {
        client.ws.send(message)
        return true
      } catch (err) {
        console.error(`[Server] Error sending to client ${clientId}:`, err)
        return false
      }
    }
    return false
  }

  // Broadcast event to all clients
  broadcast(event: ServerEvent): void {
    const message = serializeMessage(event)
    for (const [id, client] of this.clients) {
      if (client.ws.readyState === 1) { // WebSocket.OPEN = 1
        try {
          client.ws.send(message)
        } catch (err) {
          console.error(`[Server] Error broadcasting to client ${id}:`, err)
        }
      }
    }
  }

  // Send sync message to specific client
  sendSync(clientId: string, syncState: SyncMessage['state']): void {
    const message: SyncMessage = {
      type: 'sync',
      state: syncState
    }
    this.sendToClient(clientId, serializeMessage(message))
  }

  // Disconnect all clients
  disconnectAll(): void {
    for (const [id, client] of this.clients) {
      try {
        client.ws.close(1000, 'Server shutting down')
      } catch (err) {
        console.error(`[Server] Error closing client ${id}:`, err)
      }
    }
    this.clients.clear()
  }
}

// Singleton instance
export const clientManager = new ClientManager()
