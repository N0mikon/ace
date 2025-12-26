/**
 * WebSocket Protocol
 * Message types and serialization for client-server communication
 */

// Request from client to server (RPC call)
export interface RpcRequest {
  id: string
  type: 'rpc'
  channel: string
  args: unknown[]
}

// Response from server to client (RPC result)
export interface RpcResponse {
  id: string
  type: 'response'
  success: boolean
  data?: unknown
  error?: string
}

// Event from server to client (push notification)
export interface ServerEvent {
  type: 'event'
  channel: string
  data: unknown
}

// Initial state sync on connection
export interface SyncMessage {
  type: 'sync'
  state: {
    terminalRunning: boolean
    terminalBuffer: string
    config: unknown
    serverPort: number
  }
}

// All message types
export type ClientMessage = RpcRequest
export type ServerMessage = RpcResponse | ServerEvent | SyncMessage

// Serialize message to JSON string
export function serializeMessage(message: ServerMessage): string {
  return JSON.stringify(message)
}

// Parse client message from JSON string
export function parseClientMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data)
    if (parsed.type === 'rpc' && parsed.id && parsed.channel) {
      return parsed as ClientMessage
    }
    return null
  } catch {
    return null
  }
}

// Generate unique message ID
let messageIdCounter = 0
export function generateMessageId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`
}
